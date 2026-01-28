<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// @ts-ignore
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import { io } from 'socket.io-client'
import { SOCKET_URL, API_BASE_URL } from '../config'
import ChatBox from '../components/ChatBox.vue'

// ====== XỬ LÝ DỮ LIỆU & ẢNH ======
const router = useRouter()
const auth = useAuthStore()
// ... (some lines)
const isOnline = ref(false)        
const currentOrder = ref(null)     
const isAccepted = ref(false) // Thêm trạng thái đã nhận đơn
const isChatOpen = ref(false)
const hasNewMessage = ref(false)
const driverLocation = ref(null)   
const currentTab = ref('home') // 'home', 'income', 'inbox', 'profile'
const myHistory = ref([])
const totalIncome = ref(0)

// Âm thanh thông báo
const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3')

const handleLogout = () => {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    auth.logout() // Gọi action logout từ store để xóa state và localStorage
    router.push('/login')
  }
}

const fetchHistory = async () => {
    if (!userInfo.id) return;
    try {
        const res = await axios.get(`${API_BASE_URL}/api/orders`, { 
            params: { role: 'driver', userId: userInfo.id } 
        });
        // Lọc đơn đã giao thành công
        const delivered = res.data.filter(o => o.status === 'delivered');
        myHistory.value = delivered;
        
        // Tính tổng thu nhập (Giả sử 20% giá trị đơn)
        totalIncome.value = delivered.reduce((sum, order) => sum + (order.total_price * 0.2), 0);
    } catch (error) {
        console.error("Lỗi tải lịch sử:", error);
    }
}

// ====== CẤU HÌNH SOCKET ======
const socket = io(SOCKET_URL)

// Map variables
const mapContainer = ref(null)
let map = null
let driverMarker = null
let shopMarkers = []
let routingControl = null

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
  // Cập nhật lại kích thước bản đồ sau khi sidebar co lại
  setTimeout(() => { if(map) map.invalidateSize() }, 300)
}

const updateRouting = (driverLat, driverLng, destLat, destLng) => {
  if (!map) return
  
  if (routingControl) {
    map.removeControl(routingControl)
  }

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(driverLat, driverLng),
      L.latLng(destLat, destLng)
    ],
    lineOptions: {
      styles: [{ color: '#00b14f', weight: 6, opacity: 0.8 }]
    },
    addWaypoints: false,
    routeWhileDragging: false,
    draggableWaypoints: false,
    fitSelectedRoutes: false,
    show: false,
    createMarker: () => null
  }).addTo(map)
}

const clearShopMarkers = () => {
  shopMarkers.forEach(m => map.removeLayer(m))
  shopMarkers = []
}

const addShopMarker = (lat, lng, name, image) => {
  if (!map) return
  clearShopMarkers()
  
  const icon = L.divIcon({
    html: `<div class="shop-marker-icon"><img src="${image || phoGaImg}" /></div>`,
    className: '', iconSize: [50, 50], iconAnchor: [25, 50]
  });

  const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<b>${name}</b><br>Điểm lấy hàng`).openPopup();
  shopMarkers.push(marker)
  map.setView([lat, lng], 15)
}

const updateDriverMarker = (lat, lng) => {
  if (!map) return
  const bikeIcon = L.icon({ 
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3063/3063823.png', 
    iconSize: [40, 40] 
  })

  if (driverMarker) {
    driverMarker.setLatLng([lat, lng])
  } else {
    // Chức năng cũ: Tự động định vị khi bật kết nối
    driverMarker = L.marker([lat, lng], { icon: bikeIcon }).addTo(map).bindPopup("Bạn ở đây").openPopup()
    map.setView([lat, lng], 16) 
  }

  // Cập nhật đường đi ngắn nhất nếu có đơn hàng
  if (currentOrder.value) {
    // Nếu chưa lấy hàng, chỉ đường đến quán
    // Nếu đã lấy hàng, chỉ đường đến khách (cần thêm trạng thái order)
    const destLat = currentOrder.value.lat_don;
    const destLng = currentOrder.value.lng_don;
    if (destLat && destLng) {
      updateRouting(lat, lng, destLat, destLng);
    }
  }
}

const toggleConnection = () => {
  isOnline.value = !isOnline.value
  if (isOnline.value) {
    socket.emit('join_room', 'drivers')
    socket.emit('driver_status_change', { status: 'online', driverId: userInfo.id })
    
    navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords
      driverLocation.value = { lat: latitude, lng: longitude }
      updateDriverMarker(latitude, longitude)
      
      console.log("Vị trí hiện tại của tài xế:", latitude, longitude);

      // Gửi vị trí lên server để tính bán kính 10km
      socket.emit('update_driver_location', {
          driverId: userInfo.id,
          lat: latitude,
          lng: longitude
      })
    }, (err) => {
        console.error("Lỗi lấy vị trí:", err);
        let msg = "Không thể lấy vị trí của bạn. ";
        if (err.code === 1) msg += "Vui lòng cho phép quyền truy cập vị trí trên trình duyệt.";
        else if (err.code === 2) msg += "Vị trí không khả dụng.";
        else msg += "Lỗi kết nối định vị.";
        alert(msg);
    }, { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 })
  } else {
    socket.emit('driver_status_change', { status: 'offline', driverId: userInfo.id })
    if (driverMarker) { map.removeLayer(driverMarker); driverMarker = null; }
    clearShopMarkers()
    currentOrder.value = null
  }
}

const initMap = () => {
  if (map) return;
  map = L.map(mapContainer.value).setView([21.0499, 105.7405], 14)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)
}

const acceptOrder = async () => {
    if (!currentOrder.value) return;
    
    try {
        const orderId = currentOrder.value.orderId || currentOrder.value.id;
        // 1. Cập nhật trạng thái đơn hàng trên server
        await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { 
            status: 'driver_assigned',
            driverId: userInfo.id
        });
        
        // 2. Chuyển sang trạng thái đã nhận đơn
        isAccepted.value = true;
        socket.emit('join_room', `order_${orderId}`); // Tham gia phòng chat của đơn hàng
        alert("Đã nhận đơn! Vui lòng di chuyển đến quán để lấy hàng.");
        
        // 3. Cập nhật chỉ đường: Từ Tài xế -> Quán ăn (lat_don, lng_don)
        if (driverLocation.value && currentOrder.value.lat_don) {
            updateRouting(
                driverLocation.value.lat, 
                driverLocation.value.lng, 
                currentOrder.value.lat_don, 
                currentOrder.value.lng_don
            );
        }
    } catch (err) {
        console.error("Lỗi nhận đơn:", err);
        const errorMsg = err.response?.data?.error || err.message;
        alert(`Không thể nhận đơn: ${errorMsg}`);
    }
}

const completeOrder = async () => {
    if (!currentOrder.value) return;
    if(!confirm("Xác nhận đã giao hàng thành công tới khách?")) return;

    try {
        const orderId = currentOrder.value.orderId || currentOrder.value.id;
        await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { 
            status: 'delivered',
            driverId: userInfo.id
        });

        alert("Giao hàng thành công! Tiền đã cộng vào ví.");
        
        // Reset state
        isAccepted.value = false;
        currentOrder.value = null;
        clearShopMarkers();
        if(routingControl){
            map.removeControl(routingControl);
            routingControl = null;
        }

        // Refresh income history
        fetchHistory();

    } catch (err) {
        console.error("Lỗi hoàn tất đơn:", err);
        alert("Có lỗi xảy ra khi hoàn tất đơn.");
    }
}

const ignoreOrder = () => {
    currentOrder.value = null
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    clearShopMarkers()
}

onMounted(() => { 
  // Kiểm tra đăng nhập ngay khi vào trang
  if (!localStorage.getItem('user')) {
    router.push('/login');
    return;
  }

  initMap() 
  fetchHistory() // Tải lịch sử ban đầu

  // Lắng nghe cập nhật trạng thái đơn hàng (ví dụ: Shop xác nhận đã lấy hàng)
  socket.on('status_update', (data) => {
      console.log("Cập nhật trạng thái đơn:", data);
      if (currentOrder.value && data.orderId == (currentOrder.value.orderId || currentOrder.value.id)) {
          // Nếu shop xác nhận đã lấy hàng (picked_up), chuyển chỉ đường đến nhà khách
          if (data.status === 'picked_up') {
              alert("Quán xác nhận đã lấy hàng! Vui lòng giao đến khách.");
              // Cập nhật chỉ đường: Từ Tài xế -> Nhà khách (lat_tra, lng_tra)
              if (driverLocation.value && currentOrder.value.lat_tra) {
                  updateRouting(
                      driverLocation.value.lat, 
                      driverLocation.value.lng, 
                      currentOrder.value.lat_tra, 
                      currentOrder.value.lng_tra
                  );
              }
          }
      }
  });

  socket.on('place_order', (data) => {
      if (!isOnline.value) return;
      // Nếu đang có đơn rồi thì không hiện đơn mới (tùy logic app)
      if (currentOrder.value && currentOrder.value.status !== 'pending') return;

      console.log("Có đơn hàng mới nổ:", data);
      notificationSound.play().catch(e => console.log("Lỗi phát âm thanh:", e));
      currentOrder.value = data;
      
      if (data.lat_don && data.lng_don) {
          addShopMarker(data.lat_don, data.lng_don, data.ten_quan, data.hinh_anh_quan);
      }
  });

  socket.on('receive_message', (data) => {
      if (!isChatOpen.value && currentOrder.value && data.orderId == (currentOrder.value.orderId || currentOrder.value.id)) {
          hasNewMessage.value = true;
          notificationSound.play().catch(e => console.log("Lỗi phát âm thanh:", e));
      }
  });
})
onUnmounted(() => { socket.disconnect() })
</script>

<template>
  <div class="dashboard-container">
    <main class="main-content">
      <!-- MAP VIEW -->
      <div v-show="currentTab === 'home'" class="map-wrapper">
        <div class="map-background" ref="mapContainer"></div>

        <div class="control-panel-wrapper">
          <!-- Trạng thái chờ đơn -->
          <div class="control-panel" v-if="!currentOrder || isAccepted">
            <div class="status-bar" :class="{ 'online': isOnline }">
              <div class="status-indicator"></div>
              <p v-if="!isAccepted">{{ isOnline ? 'Đang tìm đơn hàng...' : 'Bạn đang tắt kết nối' }}</p>
              <p v-else style="color: #00b14f; font-weight: bold;">ĐANG TRONG ĐƠN HÀNG</p>
            </div>
            
            <div v-if="isAccepted" class="w-full flex gap-2">
              <button class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 relative" 
                      @click="isChatOpen = !isChatOpen; hasNewMessage = false">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                CHAT VỚI KHÁCH
                <span v-if="hasNewMessage" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
              <button class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold" @click="completeOrder">
                HOÀN TẤT ĐƠN
              </button>
            </div>

            <button v-else class="toggle-online-btn" @click="toggleConnection" :class="{ 'btn-on': isOnline }">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
              {{ isOnline ? 'TẮT KẾT NỐI' : 'BẬT KẾT NỐI' }}
            </button>
          </div>

          <!-- Chat Overlay for Driver -->
          <div v-if="isChatOpen && currentOrder" class="mb-4 animate-in slide-in-from-bottom-4 duration-300">
             <ChatBox 
               :order-id="currentOrder.orderId || currentOrder.id" 
               :current-user="auth.user" 
               @close="isChatOpen = false"
             />
          </div>

          <!-- Thông báo đơn hàng mới -->
          <div class="order-notification-card animate-bounce-in" v-else-if="currentOrder && !isAccepted">
              <div class="order-header">
                  <span class="new-label">ĐƠN HÀNG MỚI!</span>
                  <span class="order-price">{{ currentOrder.tong_tien }}</span>
              </div>
              <div class="order-body">
                  <div class="shop-info-mini">
                      <img :src="currentOrder.hinh_anh_quan || phoGaImg" class="mini-shop-img" />
                      <div>
                          <h4 class="shop-name-text">{{ currentOrder.ten_quan }}</h4>
                          <p class="items-text">{{ currentOrder.ten_mon_an }}</p>
                      </div>
                  </div>
                  <div class="distance-info">
                      <p>📍 {{ currentOrder.dia_chi_giao }}</p>
                  </div>
              </div>
              <div class="order-footer">
                  <button class="ignore-btn" @click="ignoreOrder">Bỏ qua</button>
                  <button class="accept-btn" @click="acceptOrder">CHẤP NHẬN</button>
              </div>
          </div>
        </div>
      </div>

      <!-- INCOME VIEW -->
      <div v-if="currentTab === 'income'" class="income-view">
        <div class="income-header">
            <h2>Tổng Thu Nhập</h2>
            <p class="income-amount">{{ new Intl.NumberFormat('vi-VN').format(totalIncome) }}đ</p>
        </div>
        
        <div class="history-list">
            <h3 class="section-title">Lịch sử chuyến đi</h3>
            <div v-if="myHistory.length === 0" class="no-history">Chưa có chuyến đi nào.</div>
            <div v-else class="history-item" v-for="h in myHistory" :key="h.id">
                <div class="history-top">
                    <span class="date">{{ new Date(h.created_at).toLocaleDateString('vi-VN') }}</span>
                    <span class="price text-green-600 font-bold">+{{ new Intl.NumberFormat('vi-VN').format(h.total_price * 0.2) }}đ</span>
                </div>
                <div class="route-info">
                    <div class="point from">
                        <div class="dot green"></div>
                        <p class="address">{{ h.shop_address || h.shop_name }}</p>
                    </div>
                    <div class="line-connect"></div>
                    <div class="point to">
                        <div class="dot red"></div>
                        <p class="address">{{ h.delivery_address }}</p>
                    </div>
                </div>
                <div class="order-meta">
                    <span>Đơn: #{{ h.id }}</span>
                    <span>Tổng: {{ new Intl.NumberFormat('vi-VN').format(h.total_price) }}đ</span>
                </div>
            </div>
        </div>
      </div>

      <!-- PROFILE VIEW -->
      <div v-if="currentTab === 'profile'" class="profile-view">
        <div class="profile-card">
          <div class="profile-header">
            <div class="avatar-circle">
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#00b14f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            </div>
            <h2>{{ userName }}</h2>
            <p class="role-badge">Tài xế đối tác</p>
          </div>
          
          <div class="profile-info-list">
             <div class="info-item">
               <span class="label">Số điện thoại:</span>
               <span class="value">{{ userPhone }}</span>
             </div>
             <div class="info-item">
               <span class="label">Email:</span>
               <span class="value">{{ userEmail }}</span>
             </div>
             <div class="info-item">
               <span class="label">Biển số xe:</span>
               <span class="value">29-H1 123.45</span>
             </div>
          </div>

           <button class="logout-btn" @click="handleLogout">Đăng xuất</button>
        </div>
      </div>

      <!-- OTHER VIEWS -->
      <div v-if="currentTab === 'inbox'" class="placeholder-view">
         <h2>Hộp thư</h2>
         <p>Chưa có thông báo nào.</p>
      </div>

      <!-- BOTTOM NAVIGATION -->
      <nav class="bottom-nav">
        <div :class="['nav-item', { active: currentTab === 'home' }]" @click="currentTab = 'home'">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span>Trang chủ</span>
        </div>
        <div :class="['nav-item', { active: currentTab === 'income' }]" @click="currentTab = 'income'">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <span>Thu nhập</span>
        </div>
        <div :class="['nav-item', { active: currentTab === 'inbox' }]" @click="currentTab = 'inbox'">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          <span>Hộp thư</span>
        </div>
        <div :class="['nav-item', { active: currentTab === 'profile' }]" @click="currentTab = 'profile'">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span>Hồ sơ</span>
        </div>
      </nav>
    </main>
  </div>
</template>

<style scoped>
.dashboard-container { display: flex; height: calc(100vh - 80px); width: 100%; overflow: hidden; background: #f4f6f8; }

/* Main Content */
.main-content { 
  flex: 1; 
  position: relative; 
  height: 100%; 
  width: 100%; 
  display: flex; 
  flex-direction: column;
  overflow: hidden;
  padding-bottom: 70px; /* Chừa chỗ cho bottom nav */
}

/* Bottom Navigation */
.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 70px;
  background: white;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  z-index: 1000;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #888;
  cursor: pointer;
  transition: 0.2s;
  flex: 1;
}

.nav-item span {
  font-size: 11px;
  font-weight: 600;
}

.nav-item svg {
  width: 22px;
  height: 22px;
}

.nav-item.active {
  color: #00b14f;
}

.nav-item:active {
  transform: scale(0.9);
}

.map-wrapper { width: 100%; height: 100%; position: relative; flex: 1; }
.map-background { width: 100%; height: 100%; z-index: 1; }

/* Control Panel */
.control-panel-wrapper {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 450px;
  z-index: 500; 
}

.control-panel { 
  background: white; 
  padding: 20px; 
  border-radius: 20px; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 15px; 
}

.status-indicator { width: 12px; height: 12px; background: red; border-radius: 50%; margin-right: 10px; }
.status-bar { display: flex; align-items: center; font-weight: 500; color: #666; }
.online .status-indicator { background: #00b14f; box-shadow: 0 0 10px #00b14f; }

.toggle-online-btn { 
  background: #1c1c1c; color: white; border: none; padding: 12px 60px; 
  border-radius: 50px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 10px;
  transition: 0.3s;
}
.toggle-online-btn.btn-on { background: #00b14f; }

.quick-actions { display: flex; gap: 50px; border-top: 1px solid #eee; padding-top: 15px; width: 100%; justify-content: center; }
.circle-icon { width: 45px; height: 45px; background: #f5f5f5; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.action-item { display: flex; flex-direction: column; align-items: center; font-size: 11px; gap: 5px; color: #666; }

/* Shop Marker */
:deep(.shop-marker-icon) { 
  width: 45px; height: 45px; border-radius: 50%; border: 3px solid #00b14f; 
  background: white; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.2); 
}
:deep(.shop-marker-icon img) { width: 100%; height: 100%; object-fit: cover; }

/* Order Notification Card */
.order-notification-card {
  background: white;
  padding: 0;
  border-radius: 20px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.2);
  width: 100%;
  overflow: hidden;
  border: 2px solid #00b14f;
}

.order-header {
  background: #00b14f;
  padding: 12px 20px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.new-label { font-weight: 800; font-size: 14px; letter-spacing: 1px; }
.order-price { font-size: 18px; font-weight: 800; }

.order-body { padding: 20px; }
.shop-info-mini { display: flex; gap: 15px; align-items: center; margin-bottom: 15px; }
.mini-shop-img { width: 50px; height: 50px; border-radius: 10px; object-fit: cover; }
.shop-name-text { font-weight: 700; color: #333; margin: 0; }
.items-text { font-size: 13px; color: #666; margin: 2px 0 0; }

.distance-info { 
  background: #f9f9f9; 
  padding: 10px; 
  border-radius: 10px; 
  font-size: 13px; 
  color: #333;
  border-left: 4px solid #00b14f;
}

.order-footer { display: flex; gap: 10px; padding: 0 20px 20px; }
.ignore-btn { flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 10px; font-weight: 600; cursor: pointer; color: #666; }
.accept-btn { flex: 2; padding: 12px; background: #00b14f; color: white; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; }

@keyframes bounceIn {
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); }
}
.animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

/* Profile View & Income View */
.profile-view, .placeholder-view, .income-view {
  flex: 1;
  background: #f4f6f8;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
}

/* INCOME Styles */
.income-header {
    background: #00b14f;
    width: 100%;
    max-width: 500px;
    border-radius: 15px;
    padding: 30px;
    color: white;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,177,79, 0.3);
    margin-bottom: 25px;
}
.income-header h2 { margin: 0; font-size: 16px; opacity: 0.9; }
.income-amount { font-size: 32px; font-weight: 800; margin: 10px 0 0; }

.history-list {
    width: 100%;
    max-width: 500px;
}
.section-title { font-size: 16px; font-weight: 700; color: #333; margin-bottom: 15px; }
.no-history { text-align: center; color: #888; padding: 20px; }

.history-item {
    background: white;
    border-radius: 12px;
    padding: 15px;
    margin-bottom: 15px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.history-top { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #555; }
.route-info {
    position: relative;
    padding-left: 20px;
    border-left: 2px dashed #ddd;
    margin-left: 5px;
}
.point { position: relative; margin-bottom: 10px; }
.point .dot { 
    position: absolute; left: -26px; top: 4px; 
    width: 10px; height: 10px; border-radius: 50%; 
}
.dot.green { background: #00b14f; }
.dot.red { background: #ff4757; }
.address { font-size: 14px; font-weight: 600; color: #333; margin: 0; }
.order-meta { 
    margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; 
    display: flex; justify-content: space-between; font-size: 12px; color: #888; 
}


.profile-card {
  background: white;
  width: 100%;
  max-width: 500px;
  border-radius: 15px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10px;
}

.avatar-circle {
  width: 100px;
  height: 100px;
  background: #e8f5e9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.profile-header { text-align: center; margin-bottom: 30px; }
.profile-header h2 { margin: 10px 0 5px; color: #333; }
.role-badge { background: #00b14f; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; display: inline-block; }

.profile-info-list { width: 100%; display: flex; flex-direction: column; gap: 15px; }
.info-item { display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1px solid #eee; }
.info-item .label { color: #666; font-weight: 500; }
.info-item .value { color: #333; font-weight: 600; }

.logout-btn {
  margin-top: 30px;
  background: #fff;
  border: 1px solid #ff4d4f;
  color: #ff4d4f;
  padding: 10px 30px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.logout-btn:hover { background: #ff4d4f; color: white; }
</style>