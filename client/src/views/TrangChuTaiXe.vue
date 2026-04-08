<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import StandardHeader from '../components/StandardHeader.vue'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'
import { useConfirmStore } from '../stores/confirm'
import axios from 'axios'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
// @ts-ignore
import 'leaflet-routing-machine'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css'
import { io } from 'socket.io-client'
import { SOCKET_URL, API_BASE_URL } from '../config'
import ChatBox from '../components/ChatBox.vue'

const router = useRouter()
const auth = useAuthStore()
const toast = useToastStore()
const confirmStore = useConfirmStore()

// ====== TRẠNG THÁI GIAO DIỆN ======
const isOnline = ref(false)
const currentOrder = ref(null)     
const isAccepted = ref(false)
const isChatOpen = ref(false)
const hasNewMessage = ref(false)
const driverLocation = ref(null)   
const currentTab = ref('home')

// Tự động sửa lỗi map khi chuyển tab
watch(currentTab, async (newTab) => {
    if (newTab === 'home') {
        await nextTick();
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        }
    }
});
const myHistory = ref([])
const totalIncome = ref(0)
const fileInput = ref(null)

const driverStats = ref({ averageRating: 5, totalReviews: 0 });

const formatPrice = (price) => {
    if (!price) return '0đ';
    const val = typeof price === 'string' ? parseFloat(price.replace(/[^\d]/g, '')) : price;
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getAvatarUrl = (path) => {
    if (!path) return `${API_BASE_URL}/uploads/anhdaidienmacdinh.jpg`;
    
    // Nếu là URL tuyệt đối
    if (path.startsWith('http')) {
        return path.replace('http://localhost:3000', API_BASE_URL);
    }

    // Nếu đã có /uploads/ hoặc uploads/ ở đầu
    if (path.includes('uploads/')) {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${API_BASE_URL}${cleanPath}`;
    }

    // Mặc định
    return `${API_BASE_URL}/uploads/${path.startsWith('/') ? path.slice(1) : path}`;
};

const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('full_name', auth.user.full_name || '');
    try {
        const res = await axios.put(`${API_BASE_URL}/api/users/${auth.user.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.success) {
            auth.user = res.data.user;
            localStorage.setItem('user', JSON.stringify(res.data.user));
            toast.success("Đổi ảnh đại diện thành công!");
        }
    } catch (e) { toast.error("Lỗi: " + e.message); }
};

const handleLogout = async () => {
  const confirmed = await confirmStore.ask("Bạn có chắc chắn muốn đăng xuất không?");
  if (confirmed) {
    auth.logout();
    toast.info("Đã đăng xuất thành công.");
    router.push('/login');
  }
}

const fetchHistory = async () => {
    if (!auth.user?.id) return;
    try {
        const res = await axios.get(`${API_BASE_URL}/api/orders`, { 
            params: { role: 'driver', userId: auth.user.id } 
        });
        const delivered = res.data.filter(o => o.status === 'delivered');
        myHistory.value = delivered;
        totalIncome.value = delivered.reduce((sum, order) => sum + (order.total_price * 0.2), 0);
    } catch (error) { console.error(error); }
}

const fetchDriverStats = async () => {
    if (!auth.user?.id) return;
    try {
        const res = await axios.get(`${API_BASE_URL}/api/drivers/${auth.user.id}/rating`);
        driverStats.value = {
            averageRating: Number(res.data.avgRating) || 5,
            totalReviews: res.data.totalReviews || 0
        };
    } catch (e) { console.error(e); }
};

// ====== CẤU HÌNH SOCKET & MAP ======
const socket = io(SOCKET_URL)
const mapContainer = ref(null)
let map = null
let driverMarker = null
let shopMarkers = []
let routingControl = null

let lastRouteCoords = { dLat: 0, dLng: 0, destLat: 0, destLng: 0 };

const updateRouting = (driverLat, driverLng, destLat, destLng) => {
  try {
    if (!map || !L.Routing) return;
    
    // Ngăn chặn cập nhật nếu khoảng cách quá nhỏ (tránh nhấp nháy)
    const dist = Math.sqrt(Math.pow(driverLat - lastRouteCoords.dLat, 2) + Math.pow(driverLng - lastRouteCoords.dLng, 2));
    const destDist = Math.sqrt(Math.pow(destLat - lastRouteCoords.destLat, 2) + Math.pow(destLng - lastRouteCoords.destLng, 2));
    
    if (routingControl && dist < 0.00005 && destDist < 0.00005) return;

    if (routingControl) {
      map.removeControl(routingControl);
      routingControl = null;
    }
    
    lastRouteCoords = { dLat: driverLat, dLng: driverLng, destLat, destLng };

    // Custom Routing giống Google Maps (Màu xanh dương đặc trưng, có viền trắng bóng)
    routingControl = L.Routing.control({
      waypoints: [L.latLng(driverLat, driverLng), L.latLng(destLat, destLng)],
      lineOptions: { 
        styles: [
          { color: '#1a73e8', weight: 8, opacity: 0.9 }, // Màu xanh Google
          { color: 'white', weight: 12, opacity: 0.3 }    // Viền mờ bao quanh
        ] 
      },
      addWaypoints: false, 
      routeWhileDragging: false, 
      draggableWaypoints: false,
      fitSelectedRoutes: false, // Không tự động nhảy map để khớp lộ trình
      show: false, 
      createMarker: (i, wp) => {
          if (i === 1) { // Marker cho điểm đích (Quán hoặc Khách)
              const isPickedUp = currentOrder.value?.status === 'picked_up';
              const iconUrl = isPickedUp 
                ? 'https://cdn-icons-png.flaticon.com/512/1216/1216844.png' 
                : 'https://cdn-icons-png.flaticon.com/512/857/857681.png';
              
              return L.marker(wp.latLng, {
                  icon: L.icon({
                      iconUrl: iconUrl,
                      iconSize: [35, 35],
                      iconAnchor: [17, 35]
                  })
              });
          }
          return null;
      }
    }).addTo(map);

  } catch (err) {
    console.error("Lỗi chỉ đường:", err);
  }
}

const clearShopMarkers = () => { shopMarkers.forEach(m => { if(map && m) map.removeLayer(m); }); shopMarkers = []; }

const addShopMarker = (lat, lng, name, image) => {
  if (!map) return;
  clearShopMarkers();
  const icon = L.divIcon({
    html: `<div class="shop-marker-icon"><img src="${getAvatarUrl(image)}" /></div>`,
    className: '', iconSize: [50, 50], iconAnchor: [25, 50]
  });
  const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<b>${name}</b>`).openPopup();
  shopMarkers.push(marker);
}

const updateDriverMarker = (lat, lng) => {
  if (!map) return;
  
  // Luôn cập nhật vị trí mới nhất của tài xế vào store
  driverLocation.value = { lat, lng };

  // Custom Marker với kích thước siêu nhỏ gọn (22px)
  const driverIcon = L.divIcon({
    html: `
      <div class="driver-radar-container">
        <div class="radar-ping"></div>
        <div class="driver-core">
          <img src="https://cdn-icons-png.flaticon.com/512/3063/3063823.png" / style="width: 33px;">
        </div>
      </div>
    `,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  if (driverMarker) {
    driverMarker.setLatLng([lat, lng]);
  } else {
    driverMarker = L.marker([lat, lng], { icon: driverIcon }).addTo(map).bindPopup("Bạn").openPopup();
    map.setView([lat, lng], 17);
  }

  // Tự động giữ trọng tâm bản đồ vào tài xế khi di chuyển
  if (isOnline.value && !isChatOpen.value) {
      map.panTo([lat, lng]);
  }

  // Tự động vẽ đường khi đang trong đơn hàng
  if (isAccepted.value && currentOrder.value) {
      // Logic điểm đích thông minh
      const isGoingToCustomer = currentOrder.value.status === 'picked_up';
      const destLat = isGoingToCustomer ? currentOrder.value.lat_tra : currentOrder.value.lat_don;
      const destLng = isGoingToCustomer ? currentOrder.value.lng_tra : currentOrder.value.lng_don;
      
      if (destLat && destLng) {
          updateRouting(lat, lng, destLat, destLng);
      }
  }
}

const toggleConnection = () => {
  isOnline.value = !isOnline.value;
  socket.emit('driver_active_status', { 
      userId: auth.user.id, 
      isActive: isOnline.value,
      lat: driverLocation.value?.lat,
      lng: driverLocation.value?.lng
  });

  if (isOnline.value) {
    navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      updateDriverMarker(latitude, longitude);
      socket.emit('update_driver_location', { userId: auth.user.id, lat: latitude, lng: longitude });
    }, null, { enableHighAccuracy: true });
  } else {
    if (driverMarker && map) { map.removeLayer(driverMarker); driverMarker = null; }
    if (routingControl && map) { map.removeControl(routingControl); routingControl = null; }
    clearShopMarkers();
    currentOrder.value = null;
    isAccepted.value = false;
  }
}

const acceptOrder = async () => {
    if (!currentOrder.value) return;
    try {
        const orderId = currentOrder.value.orderId || currentOrder.value.id;
        await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { 
            status: 'driver_assigned',
            driverId: auth.user.id
        });
        isAccepted.value = true;
        currentOrder.value.status = 'driver_assigned';
        socket.emit('join_room', `order_${orderId}`);
        toast.success("Đã nhận đơn! Di chuyển tới quán ăn.");
        if (driverLocation.value) {
            updateRouting(driverLocation.value.lat, driverLocation.value.lng, currentOrder.value.lat_don, currentOrder.value.lng_don);
        }
    } catch (err) { toast.error("Lỗi nhận đơn: " + err.message); }
}

const pickedUpOrder = async () => {
    if (!currentOrder.value) return;
    try {
        const orderId = currentOrder.value.orderId || currentOrder.value.id;
        await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { status: 'picked_up' });
        currentOrder.value.status = 'picked_up';
        toast.success("Đã lấy hàng! Di chuyển tới nhà khách.");
        if (driverLocation.value) {
            updateRouting(driverLocation.value.lat, driverLocation.value.lng, currentOrder.value.lat_tra, currentOrder.value.lng_tra);
        }
    } catch (err) { toast.error("Lỗi: " + err.message); }
}

const completeOrder = async () => {
    if (!currentOrder.value) return;
    try {
        const orderId = currentOrder.value.orderId || currentOrder.value.id;
        await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { status: 'delivered' });
        toast.success("Giao hàng thành công!");
        isAccepted.value = false;
        currentOrder.value = null;
        if (routingControl && map) { map.removeControl(routingControl); routingControl = null; }
        clearShopMarkers();
        fetchHistory();
    } catch (err) { toast.error("Lỗi: " + err.message); }
}

onMounted(() => {
  if (!auth.user) { router.push('/login'); return; }
  map = L.map(mapContainer.value, {
    zoomControl: false, 
    attributionControl: false
  }).setView([21.0499, 105.7405], 14);
  
  L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  fetchHistory();
  fetchDriverStats();

  socket.on('new_order_available', (data) => {
      if (!isOnline.value || isAccepted.value) return;
      currentOrder.value = data;
      addShopMarker(data.lat_don, data.lng_don, data.ten_quan, data.hinh_anh_quan);
      new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
  });

  socket.on('status_update', (data) => {
      if (currentOrder.value && (currentOrder.value.orderId || currentOrder.value.id) == data.orderId) {
          currentOrder.value.status = data.status;
          if (data.status === 'picked_up') {
              toast.info("Bạn đã lấy hàng! Di chuyển tới nhà khách.");
              if (driverLocation.value) {
                  updateRouting(driverLocation.value.lat, driverLocation.value.lng, currentOrder.value.lat_tra, currentOrder.value.lng_tra);
              }
          }
      }
  });
});
</script>

<template>
  <div class="driver-dashboard-wrapper animate-fade-in">
    <StandardHeader />
    <div class="dashboard-container">
      <main class="main-content">
        <div v-show="currentTab === 'home'" class="map-wrapper">
          <div class="map-background" ref="mapContainer"></div>
          <div class="control-panel-wrapper">
            <div class="control-panel" v-if="!currentOrder || isAccepted">
              <div class="status-bar" :class="{ 'online': isOnline }">
                <div class="status-indicator"></div>
                <p class="text-xs font-bold uppercase tracking-wider text-gray-500">
                  {{ isOnline ? (isAccepted ? 'Đang giao hàng' : 'Đang tìm đơn...') : 'Ngoại tuyến' }}
                </p>
              </div>
              
              <div v-if="isAccepted" class="w-full flex flex-col gap-2 mt-2">
                <div class="flex gap-3">
                  <button class="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition" @click="isChatOpen = !isChatOpen">
                    💬 CHAT
                  </button>
                  <button v-if="currentOrder.status === 'driver_assigned'" class="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-orange-200 active:scale-95 transition" @click="pickedUpOrder">
                    📦 LẤY HÀNG
                  </button>
                  <button v-else-if="currentOrder.status === 'picked_up'" class="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-green-200 active:scale-95 transition" @click="completeOrder">
                    ✅ HOÀN TẤT
                  </button>
                </div>
              </div>
              <div v-else class="flex justify-center mt-2">
                <button class="toggle-online-btn-small" @click="toggleConnection" :class="{ 'btn-on': isOnline }">
                  <span v-if="!isOnline">🔴 Bật hoạt động</span>
                  <span v-else>🟢 Đang hoạt động</span>
                </button>
              </div>
            </div>
  
            <div v-if="isChatOpen && currentOrder" class="mb-4">
               <ChatBox :order-id="currentOrder.orderId || currentOrder.id" :current-user="auth.user" @close="isChatOpen = false" />
            </div>
  
            <div class="order-notification-card" v-else-if="currentOrder && !isAccepted">
                <div class="order-header">
                    <span class="new-label animate-pulse">🔥 ĐƠN MỚI</span>
                    <span class="order-price">{{ formatPrice(currentOrder.tong_tien) }}</span>
                </div>
                <div class="order-body">
                    <h4 class="font-black text-lg text-gray-800">{{ currentOrder.ten_quan }}</h4>
                    <p class="text-sm text-gray-600 mt-1 flex items-start gap-1">
                      <span class="text-red-500">📍</span> {{ currentOrder.dia_chi_giao }}
                    </p>
                </div>
                <div class="order-footer">
                    <button class="ignore-btn py-3" @click="currentOrder = null">Bỏ qua</button>
                    <button class="accept-btn py-3 shadow-lg shadow-green-200" @click="acceptOrder">NHẬN ĐƠN</button>
                </div>
            </div>
          </div>
        </div>
  
        <div v-if="currentTab === 'income'" class="income-view animate-fade-in">
            <div class="income-header-card">
              <p class="text-white/80 text-sm font-medium">Tổng thu nhập (20%)</p>
              <h2 class="text-4xl font-black text-white mt-1">{{ totalIncome.toLocaleString() }}đ</h2>
              <div class="grid grid-cols-2 gap-4 mt-6">
                <div class="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                  <p class="text-white/70 text-[10px] uppercase font-bold">Số đơn</p>
                  <p class="text-white font-bold text-lg">{{ myHistory.length }}</p>
                </div>
                <div class="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                  <p class="text-white/70 text-[10px] uppercase font-bold">Đánh giá</p>
                  <p class="text-white font-bold text-lg">⭐ {{ driverStats.averageRating.toFixed(1) }}</p>
                </div>
              </div>
            </div>

            <div class="w-full max-w-md mt-6 px-4">
              <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span class="w-1 h-5 bg-green-500 rounded-full"></span> Lịch sử thu nhập
              </h3>
              <div v-if="myHistory.length === 0" class="text-center py-10 text-gray-400 italic">
                Chưa có dữ liệu thu nhập.
              </div>
              <div v-for="h in myHistory" :key="h.id" class="income-history-item">
                  <div class="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-xl">💰</div>
                  <div class="flex-1">
                    <p class="font-bold text-gray-800">Đơn hàng #{{ h.id }}</p>
                    <p class="text-xs text-gray-500">{{ formatDate(h.created_at) }}</p>
                  </div>
                  <div class="text-right">
                    <p class="font-black text-green-600">+{{ (h.total_price * 0.2).toLocaleString() }}đ</p>
                    <p class="text-[10px] text-gray-400">Hoa hồng 20%</p>
                  </div>
              </div>
            </div>
        </div>
  
        <div v-if="currentTab === 'profile'" class="profile-view animate-fade-in">
            <div class="profile-header-bg"></div>
            <div class="profile-card-v2">
                <div class="relative inline-block mx-auto">
                  <img :src="getAvatarUrl(auth.user?.avatar_url)" class="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-xl">
                  <button @click="fileInput.click()" class="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-xl shadow-lg hover:bg-green-600 transition">
                    📷
                  </button>
                  <input type="file" ref="fileInput" @change="handleFileChange" hidden accept="image/*">
                </div>
                
                <h2 class="text-2xl font-black text-gray-800 mt-4">{{ auth.user?.full_name || auth.user?.username }}</h2>
                <p class="text-green-600 font-bold text-sm">Tài xế đối tác GHTN</p>

                <div class="flex justify-center gap-6 my-6 border-y border-gray-50 py-4">
                  <div class="text-center">
                    <p class="text-2xl font-black text-gray-800">{{ driverStats.averageRating.toFixed(1) }}</p>
                    <p class="text-[10px] text-gray-400 font-bold uppercase">Sao</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-black text-gray-800">{{ driverStats.totalReviews }}</p>
                    <p class="text-[10px] text-gray-400 font-bold uppercase">Đánh giá</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-black text-gray-800">{{ myHistory.length }}</p>
                    <p class="text-[10px] text-gray-400 font-bold uppercase">Chuyến</p>
                  </div>
                </div>

                <div class="space-y-3 w-full">
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span class="text-xl">📞</span>
                    <div class="text-left">
                      <p class="text-[10px] text-gray-400 font-bold uppercase">Số điện thoại</p>
                      <p class="font-bold text-gray-700">{{ auth.user?.phone || 'Chưa cập nhật' }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <span class="text-xl">📧</span>
                    <div class="text-left">
                      <p class="text-[10px] text-gray-400 font-bold uppercase">Email</p>
                      <p class="font-bold text-gray-700">{{ auth.user?.email || 'Chưa cập nhật' }}</p>
                    </div>
                  </div>
                </div>

                <button class="w-full mt-8 py-4 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 transition active:scale-95" @click="handleLogout">
                  ĐĂNG XUẤT TÀI KHOẢN
                </button>
            </div>
        </div>
  
        <nav class="bottom-nav">
          <div class="nav-item" :class="{active: currentTab==='home'}" @click="currentTab='home'">
            <span>TRANG CHỦ</span>
          </div>
          <div class="nav-item" :class="{active: currentTab==='income'}" @click="currentTab='income'">
            <span>THU NHẬP</span>
          </div>
          <div class="nav-item" :class="{active: currentTab==='profile'}" @click="currentTab='profile'">
            <span>HỒ SƠ</span>
          </div>
        </nav>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container { height: calc(100vh - 80px); background: #f8fafc; position: relative; overflow: hidden; }
.main-content { height: 100%; position: relative; }
.map-wrapper { height: 100%; width: 100%; }
.map-background { height: 100%; width: 100%; z-index: 1; }

/* Control Panel & Buttons */
.control-panel-wrapper { position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%); width: 92%; z-index: 1000; }
.control-panel { background: white; padding: 16px; border-radius: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; border: 1px solid rgba(0,0,0,0.05); }
.status-bar { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 4px; }
.status-indicator { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; transition: 0.3s; }
.online .status-indicator { background: #10b981; box-shadow: 0 0 12px #10b981; animation: pulse 2s infinite; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

.toggle-online-btn-small { padding: 10px 24px; border-radius: 50px; background: #1e293b; color: white; font-weight: 800; font-size: 14px; transition: 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.toggle-online-btn-small.btn-on { background: #10b981; }
.toggle-online-btn-small:active { transform: scale(0.95); }

/* Order Card */
.order-notification-card { background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); border: 2px solid #10b981; animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.order-header { background: #10b981; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
.new-label { background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 900; }
.order-price { font-size: 20px; font-weight: 900; }
.order-body { padding: 20px; }
.order-footer { display: flex; gap: 12px; padding: 0 20px 20px; }
.accept-btn { flex: 2; background: #10b981; color: white; border-radius: 16px; font-weight: 800; transition: 0.2s; }
.ignore-btn { flex: 1; background: #f1f5f9; color: #64748b; border-radius: 16px; font-weight: 700; transition: 0.2s; }

/* Income View */
.income-view { padding: 20px 0 100px; width: 100%; height: 100%; overflow-y: auto; background: #fff; }
.income-header-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); width: 92%; margin: 0 auto; padding: 30px 24px; border-radius: 32px; shadow: 0 15px 30px rgba(16, 185, 129, 0.3); }
.income-history-item { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 20px; margin-bottom: 12px; border: 1px solid #f1f5f9; transition: 0.2s; }
.income-history-item:active { transform: scale(0.98); background: #f1f5f9; }

/* Profile View */
.profile-view { position: relative; height: 100%; width: 100%; overflow-y: auto; background: #fff; padding-bottom: 100px; }
.profile-header-bg { height: 160px; background: linear-gradient(to bottom, #10b981, #fff); width: 100%; }
.profile-card-v2 { width: 92%; margin: -80px auto 0; background: white; border-radius: 32px; padding: 30px 24px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.05); position: relative; z-index: 2; border: 1px solid #f1f5f9; }

/* Bottom Nav */
.bottom-nav { 
  position: absolute; 
  bottom: 0; 
  width: 100%; 
  height: 70px; 
  background: white; 
  display: flex; 
  border-top: 1px solid #f1f5f9; 
  z-index: 1001; 
  padding: 8px 12px;
  gap: 10px;
}
.nav-item { 
  flex: 1; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}
.nav-item span { 
  font-size: 13px; 
  font-weight: 900; 
  color: #64748b; 
  letter-spacing: 0.5px;
}
.nav-item.active { 
  background: #10b981; 
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}
.nav-item.active span { 
  color: white; 
  transform: scale(1.05);
}

:deep(.shop-marker-icon) { width: 48px; height: 48px; border-radius: 50%; border: 4px solid white; background: white; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
:deep(.shop-marker-icon img) { width: 100%; height: 100%; object-fit: cover; }

/* Radar Pulse Effect */
.driver-radar-container {
    position: relative;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.driver-core {
    width: 34px;
    height: 34px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    border: 2px solid #1a73e8;
}
.driver-core img {
    width: 24px;
    height: 24px;
    object-fit: contain;
}
.radar-ping {
    position: absolute;
    width: 100%;
    height: 100%;
    background: #1a73e8;
    border-radius: 50%;
    opacity: 0.6;
    animation: ping 1.8s ease-out infinite;
    z-index: 1;
}
@keyframes ping {
    0% { transform: scale(0.6); opacity: 0.8; }
    100% { transform: scale(2.5); opacity: 0; }
}

.animate-fade-in { animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
