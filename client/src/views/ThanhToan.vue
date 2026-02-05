<template>
  <div class="checkout-page-wrapper">
    <div class="checkout-container-desktop">
      <div class="checkout-header">
        <button class="back-btn" @click="$router.go(-1)">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Quay lại
        </button>
        <h1>Xác nhận thanh toán</h1>
      </div>

      <div class="checkout-content">
        <div class="left-column">
          <div class="section-card address-section">
            <div class="section-title"><span class="icon">📍</span> Thông tin giao hàng</div>
            <div class="address-box">
               <div class="user-info-row"><strong>Đơn hàng của bạn</strong></div>
               <div class="input-wrapper">
                 <textarea v-model="userInfo.address" class="address-input" rows="2" placeholder="Nhập địa chỉ chi tiết..."></textarea>
                 <div class="button-group-vertical">
                   <button class="detect-btn" @click="setHardLocation">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#ff4757" stroke="#ff4757" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3" fill="white" stroke="none"></circle>
                    </svg> <span class="btn-text">Vị trí mặc định</span>
                   </button>
                   <button class="map-btn" @click="openMapModal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                      <line x1="8" y1="2" x2="8" y2="18"></line>
                      <line x1="16" y1="6" x2="16" y2="22"></line>
                    </svg> <span class="btn-text">Chọn trên bản đồ</span>
                   </button>
                 </div>
               </div>
               <p v-if="selectedCoords.lat" style="font-size: 11px; color: #888; margin-top: 5px;">
                 Đã ghim tọa độ: {{ selectedCoords.lat.toFixed(4) }}, {{ selectedCoords.lng.toFixed(4) }}
               </p>
            </div>
          </div>

          <div class="section-card shipping-section">
            <div class="section-title"><span class="icon">🛵</span> Tùy chọn giao hàng</div>
            <div class="shipping-options">
              <label class="ship-option" :class="{ active: selectedShip === 'priority' }">
                <input type="radio" value="priority" v-model="selectedShip">
                <div class="ship-info"><div class="ship-name">Ưu tiên • 29 phút <span class="badge">Nhanh nhất</span></div><div class="ship-desc">Đơn hàng được ưu tiên giao trước</div></div>
                <div class="ship-price">{{ formatCurrency(36000) }}</div>
              </label>
              <label class="ship-option" :class="{ active: selectedShip === 'fast' }">
                <input type="radio" value="fast" v-model="selectedShip">
                <div class="ship-info"><div class="ship-name">Nhanh • 35 phút</div></div>
                <div class="ship-price">{{ formatCurrency(28000) }}</div>
              </label>
              <label class="ship-option" :class="{ active: selectedShip === 'saver' }">
                <input type="radio" value="saver" v-model="selectedShip">
                <div class="ship-info"><div class="ship-name">Tiết kiệm • 50 phút</div></div>
                <div class="ship-price">{{ formatCurrency(22000) }}</div>
              </label>
            </div>
          </div>

          <div class="section-card payment-section">
            <div class="section-title"><span class="icon">💳</span> Phương thức thanh toán</div>
            <div class="payment-methods">
              <div class="pay-method" :class="{ active: paymentMethod === 'cash' }" @click="selectPayment('cash')">
                <div class="radio-circle"></div><span>💵 Tiền mặt khi nhận hàng</span>
              </div>
              <div class="pay-method" :class="{ active: paymentMethod === 'banking' }" @click="selectPayment('banking')">      
                <div class="radio-circle"></div><span>🏦 Chuyển khoản</span>
              </div>
            </div>

            <div v-if="paymentMethod === 'banking'" class="qr-container">
              <div v-if="paymentStatus === 'pending'" class="qr-pending">
                <div class="qr-header">
                   Quét mã để thanh toán
                   <span class="timer" :class="{'urgent': qrTimeLeft < 60}">Hết hạn sau: {{ formatTime(qrTimeLeft) }}</span>   
                </div>
                <div class="qr-body">
                   <img :src="qrCodeUrl" alt="QR Code" class="qr-img" />
                   <div class="qr-details">
                      <p class="qr-note">Tổng tiền: <strong class="price-highlight">{{ formatCurrency(finalTotal) }}</strong></p>
                      <p class="qr-note">Nội dung CK: <strong class="code-highlight">{{ randomOrderCode }}</strong></p>        
                   </div>
                   <button class="confirm-paid-btn" @click="handleConfirmPaid">
                     ✅ Tôi đã chuyển khoản xong
                   </button>
                   <button class="refresh-qr" @click="generateNewQR">🔄 Lấy mã mới</button>
                   <p class="hint-text">*Hệ thống tự động cập nhật khi nhận tiền</p>
                </div>
              </div>

              <div v-else-if="paymentStatus === 'processing'" class="qr-processing">
                 <div class="spinner"></div>
                 <p>Đang liên hệ ngân hàng...</p>
                 <p class="sub-text">(Vui lòng đợi giây lát)</p>
              </div>

              <div v-else-if="paymentStatus === 'success'" class="qr-success">
                 <div class="check-icon-circle">✓</div>
                 <h3>Thanh toán thành công!</h3>
                 <p>Đơn hàng đã được xác nhận.</p>
              </div>
            </div>
          </div>
        </div>

        <div class="right-column">
          <div class="order-summary-card">
            <h3>Tóm tắt đơn hàng</h3>
            <div v-if="items.length > 0" class="order-items-list">
              <div v-for="item in items" :key="item.id" class="summary-item">
                <div class="item-qty">{{ item.quantity }}x</div>
                <div class="item-name">{{ item.name }} <span v-if="item.note" class="item-note">({{ item.note }})</span></div> 
                <div class="item-price">{{ formatCurrency(item.price * item.quantity) }}</div>
              </div>
            </div>
            <div v-else class="text-gray-500 py-4 italic">Giỏ hàng trống</div>

            <div class="divider"></div>
            <div class="price-row"><span>Tạm tính</span><span>{{ formatCurrency(subTotal) }}</span></div>
            <div class="price-row"><span>Phí giao hàng</span><span>{{ formatCurrency(shipPrice) }}</span></div>
             <div class="price-row discount" v-if="selectedShip === 'saver'"><span>Khuyến mãi vận chuyển</span><span>-14.000₫</span></div>
            <div class="divider"></div>
            <div class="total-row">
              <span>Tổng cộng</span>
              <span class="total-price" :class="{'text-green-500': paymentStatus === 'success'}">
                {{ paymentStatus === 'success' ? '0đ (Đã thanh toán)' : formatCurrency(finalTotal) }}
              </span>
            </div>

            <button class="place-order-btn" @click="submitOrder" :disabled="dangXuLy || items.length === 0">
               {{ dangXuLy ? 'ĐANG XỬ LÝ...' : 'ĐẶT ĐƠN HÀNG' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showMapModal" class="map-modal-overlay" @click.self="closeMap">
      <div class="map-modal-content">
        <div class="map-header"><h3>Chọn vị trí giao hàng</h3><button class="close-map-btn" @click="closeMap">×</button></div> 
        <div class="map-body">
          <div id="map-selection" style="width: 100%; height: 400px; background: #eee;"></div>
          <div class="selected-address-bar" v-if="tempSelectedAddress">
             📍 {{ tempSelectedAddress }}
          </div>
          <div class="map-footer">
            <button class="confirm-map-btn" @click="confirmMapSelection">Xác nhận vị trí này</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, reactive, onUnmounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_URL, API_BASE_URL } from '../config';

export default {
  name: "ThanhToan",
  setup() {
    const router = useRouter();

    const socket = io(SOCKET_URL);

    const items = ref([]);
    const shopInfo = ref(null);
    const selectedShip = ref('fast');
    const paymentMethod = ref('cash');
    const showMapModal = ref(false);
    const tempSelectedAddress = ref('');
    const dangXuLy = ref(false);

    // Tọa độ mặc định người nhận (Hà Nội)
    const selectedCoords = ref({ lat: 21.0285, lng: 105.8542 });

    let mapInstance = null;
    let markerInstance = null;

    const bankId = 'ICB';
    const accountNo = '101882796072';

    const randomOrderCode = ref('');
    const qrTimeLeft = ref(600);
    let timerInterval = null;
    const paymentStatus = ref('pending');

    const userInfo = reactive({ name: '', phone: '', address: '', username: '' });
    const shippingRates = { priority: 36000, fast: 28000, saver: 22000 };

    onMounted(async () => {
      // Lắng nghe sự kiện thanh toán thành công tức thì qua Socket
      socket.on('payment_success', (data) => {
          console.log("🔔 Nhận tín hiệu thanh toán thành công tức thì:", data);
          paymentStatus.value = 'success';
          if (timerInterval) clearInterval(timerInterval);
          if (checkInterval) clearInterval(checkInterval);
      });

      // Load Leaflet
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link'); link.id = 'leaflet-css'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script'); script.id = 'leaflet-js'; script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; document.head.appendChild(script);
      }

      const storedItems = localStorage.getItem('tempCart');
      if (storedItems) {
          items.value = JSON.parse(storedItems);
          // Lấy shop info thực tế
          const shopId = items.value[0].shopId;
          try {
              const res = await axios.get(`${API_BASE_URL}/api/shops/${shopId}`);
              shopInfo.value = res.data;
          } catch (err) {
              console.error("Lỗi tải thông tin quán:", err);
          }
      }

      // [EDITED] Read from 'user' key as per Auth Store
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        userInfo.name = u.fullname || u.HoTen || 'Khách hàng';
        userInfo.phone = u.phone || '';
        userInfo.username = u.username || 'guest';
        if(u.address) userInfo.address = u.address; // Lấy địa chỉ lưu sẵn
      }
    });

    onUnmounted(() => { if (timerInterval) clearInterval(timerInterval); });

    const subTotal = computed(() => items.value.reduce((sum, item) => sum + (item.price * item.quantity), 0));
    const shipPrice = computed(() => shippingRates[selectedShip.value]);
    const finalTotal = computed(() => subTotal.value + shipPrice.value);
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);        

    const qrCodeUrl = computed(() => `https://img.vietqr.io/image/${bankId}-${accountNo}-qr_only.png?amount=${finalTotal.value}&addInfo=${randomOrderCode.value}`);

            const checkPaymentStatus = async () => {
                try {
                    // Thêm timestamp ?t= để chống cache trình duyệt
                    const res = await axios.get(`${API_BASE_URL}/api/payment/check/${randomOrderCode.value}?t=${Date.now()}`);
                    if (res.data.paid) {
                        paymentStatus.value = 'success';
                        if (timerInterval) clearInterval(timerInterval);
                        if (checkInterval) clearInterval(checkInterval);
                        return true;
                    }
                } catch (e) {
                    console.error("Lỗi kiểm tra thanh toán:", e);
                }
                return false;
            };

        
            let checkInterval = null;
        
            const startPollingPayment = () => {
                if (checkInterval) clearInterval(checkInterval);
                checkInterval = setInterval(async () => {
                    const isPaid = await checkPaymentStatus();
                    if (isPaid) {
                        clearInterval(checkInterval);
                    }
                }, 3000); 
            };
        
            const generateNewQR = async (orderId, orderCode) => {
              randomOrderCode.value = orderCode;
              paymentStatus.value = 'pending';
              qrTimeLeft.value = 600;
              
              socket.emit('join_room', `order_${orderId}`);
              await axios.post(`${API_BASE_URL}/api/payment/register`, { code: orderCode });
        
              if (timerInterval) clearInterval(timerInterval);
              timerInterval = setInterval(() => {
                if (qrTimeLeft.value > 0) qrTimeLeft.value--;
                else {
                    alert("Hết thời gian thanh toán!");
                    location.reload();
                }
              }, 1000);
        
              startPollingPayment();
            };
    
        onUnmounted(() => { 
            if (timerInterval) clearInterval(timerInterval);
            if (checkInterval) clearInterval(checkInterval);
        });
    
        const selectPayment = (method) => {
          paymentMethod.value = method;
          // Không tự động tạo QR ở đây nữa
          paymentStatus.value = 'pending';
        };

    const handleConfirmPaid = () => {
        paymentStatus.value = 'processing';
        
        // Kiểm tra ngay lập tức
        checkPaymentStatus().then(paid => {
             if(paid) return;
             
             // Nếu chưa có, poll mỗi 2 giây
             const checkInterval = setInterval(async () => {
                 if (paymentStatus.value !== 'processing') {
                     clearInterval(checkInterval);
                     return;
                 }
                 
                 const isPaid = await checkPaymentStatus();
                 if (isPaid) {
                     clearInterval(checkInterval);
                 }
             }, 2000);
             
             // Timeout sau 60s nếu không thấy tiền (tránh treo vô hạn)
             setTimeout(() => {
                 if (paymentStatus.value === 'processing') {
                     alert("Hệ thống chưa nhận được tiền. Vui lòng thử lại hoặc liên hệ hỗ trợ.");
                     paymentStatus.value = 'pending';
                     clearInterval(checkInterval);
                 }
             }, 60000);
        });
    };

    const formatTime = (seconds) => {
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    // --- MAP LOGIC ---
    const setHardLocation = () => {
      userInfo.address = "Trường Cao Đẳng Công Nghệ Cao Hà Nội";
      selectedCoords.value = { lat: 21.0464, lng: 105.7480 };
      alert("Đã chọn vị trí: Trường Cao Đẳng Công Nghệ Cao Hà Nội");
    };

    const openMapModal = () => {
      showMapModal.value = true;
      nextTick(() => {
        initSelectionMap();
      });
    };

    const initSelectionMap = () => {
        if (mapInstance) {
            mapInstance.remove();
        }

        mapInstance = L.map('map-selection').setView([selectedCoords.value.lat, selectedCoords.value.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);

        markerInstance = L.marker([selectedCoords.value.lat, selectedCoords.value.lng], { draggable: true }).addTo(mapInstance);

        const updateAddr = async (lat, lng) => {
            selectedCoords.value = { lat, lng };
            try {
                const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);  
                tempSelectedAddress.value = res.data.display_name;
            } catch (e) {
                tempSelectedAddress.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            }
        };

        mapInstance.on('click', (e) => {
            markerInstance.setLatLng(e.latlng);
            updateAddr(e.latlng.lat, e.latlng.lng);
        });

        markerInstance.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            updateAddr(pos.lat, pos.lng);
        });
    };

    const confirmMapSelection = () => {
        if (tempSelectedAddress.value) {
            userInfo.address = tempSelectedAddress.value;
        }
        showMapModal.value = false;
    };

    const closeMap = () => {
      showMapModal.value = false;
      if (mapInstance) {
          mapInstance.remove();
          mapInstance = null;
      }
    };

    // --- HÀM GỬI ĐƠN HÀNG (ĐÃ SỬA) ---
    const submitOrder = async () => {
       if(items.value.length === 0) return alert("Giỏ hàng trống!");
       if(!userInfo.address) return alert("Vui lòng nhập địa chỉ!");

       // Nếu đang hiện QR và chưa thanh toán xong thì không cho bấm đặt hàng lại
       if (paymentMethod.value === 'banking' && randomOrderCode.value && paymentStatus.value === 'pending') {
           return alert("Vui lòng hoàn tất thanh toán chuyển khoản phía trên!");
       }

       dangXuLy.value = true;

       try {
           const storedUserStr = localStorage.getItem('user');
           const userObj = storedUserStr ? JSON.parse(storedUserStr) : null;
           const userId = userObj ? userObj.id : null;

           if (!userId) {
               alert("Vui lòng đăng nhập lại!");
               router.push('/login');
               return;
           }

           const shopId = items.value[0].shopId;

           const apiPayload = {
               userId: userId,
               shopId: shopId,
               items: items.value.map(i => ({
                   productId: i.id || i.productId,
                   quantity: i.quantity,
                   price: i.price
               })),
               totalPrice: finalTotal.value,
               deliveryAddress: userInfo.address,
               deliveryLat: selectedCoords.value.lat,
               deliveryLng: selectedCoords.value.lng
           };

           const res = await axios.post(`${API_BASE_URL}/api/orders`, apiPayload);

           if (res.data.success) {
               const orderId = res.data.orderId;
               const maDonHang = res.data.orderCode;

               if (paymentMethod.value === 'banking') {
                   // Hiện QR với mã thật
                   await generateNewQR(orderId, maDonHang);
                   alert("Đơn hàng đã được lưu. Vui lòng thanh toán qua mã QR phía dưới.");
                   // Cuộn xuống
                   nextTick(() => {
                       const el = document.querySelector('.qr-container');
                       if (el) el.scrollIntoView({ behavior: 'smooth' });
                   });
               } else {
                   const socketData = {
                       ma_don_hang: maDonHang,
                       orderId: orderId,
                       tai_khoan_khach: userInfo.username || 'guest',
                       ten_khach_hang: userInfo.name,
                       ten_mon_an: items.value.map(item => `${item.name} (${item.quantity})`).join(', '),
                       tong_tien: formatCurrency(finalTotal.value),
                       ten_quan: shopInfo.value?.name || 'Cửa hàng',
                       hinh_anh_quan: shopInfo.value?.image_url || '',
                       dia_chi_giao: userInfo.address,
                       lat_tra: selectedCoords.value.lat,
                       lng_tra: selectedCoords.value.lng
                   };
                   socket.emit('place_order', socketData);

                   alert("Đặt hàng thành công! Mã đơn: " + maDonHang);
                   localStorage.removeItem('tempCart');
                   router.push('/theodoidonhang');
               }
           }
       } catch (error) {
           console.error("Lỗi đặt hàng:", error);
           alert("Lỗi: " + (error.response?.data?.message || error.message));
       } finally {
           dangXuLy.value = false;
       }
    };

    return {
      items, userInfo, selectedShip, paymentMethod,
      subTotal, finalTotal, shipPrice, formatCurrency,
      setHardLocation, submitOrder, selectPayment,
      qrCodeUrl, qrTimeLeft, formatTime, generateNewQR, randomOrderCode,
      showMapModal, openMapModal, closeMap, tempSelectedAddress, confirmMapSelection,
      paymentStatus, handleConfirmPaid,
      selectedCoords, dangXuLy
    };
  }
}
</script>

<style scoped>
/* CSS Giữ nguyên như cũ */
.checkout-page-wrapper { background-color: #f0f2f5; min-height: 100vh; padding: 40px 20px; font-family: 'Segoe UI', sans-serif; }
.checkout-container-desktop { max-width: 1100px; margin: 0 auto; }
.checkout-header { margin-bottom: 20px; display: flex; align-items: center; }
.back-btn { background: none; border: none; font-size: 16px; cursor: pointer; color: #666; display: flex; align-items: center; gap: 5px; margin-right: 20px; }
.back-btn:hover { color: #00b14f; }
.checkout-header h1 { font-size: 24px; font-weight: 700; color: #333; margin: 0; }
.checkout-content { display: flex; gap: 30px; align-items: flex-start; }
.left-column { flex: 2; }
.right-column { flex: 1; position: sticky; top: 20px; }
.section-card, .order-summary-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); padding: 24px; margin-bottom: 20px; }
.section-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; color: #333; }
.icon { font-size: 20px; }
.address-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
.user-info-row { font-weight: 600; margin-bottom: 10px; color: #333; font-size: 16px; }
.input-wrapper { display: flex; gap: 10px; align-items: flex-start; }
.address-input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; resize: none; font-family: inherit; transition: background 0.3s; }
.address-input:focus { border-color: #00b14f; outline: none; background: white; }
.button-group-vertical { display: flex; flex-direction: column; gap: 8px; }
.detect-btn, .map-btn { display: flex; align-items: center; justify-content: flex-start; white-space: nowrap; height: 36px; padding: 0 15px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: 0.2s; width: 160px; border: 1px solid #ccc; background: white; }
.detect-btn { border-color: #ff4757; color: #ff4757; }
.detect-btn:hover { background: #fff0f1; }
.map-btn { border-color: #2980b9; color: #2980b9; }
.map-btn:hover { background: #ebf5fb; }
.btn-text { margin-left: 8px; }
.map-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; justify-content: center; align-items: center; }
.map-modal-content { background: white; width: 900px; max-width: 95%; height: 80vh; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.3); display: flex; flex-direction: column; }
.map-header { padding: 15px 20px; background: #f0f2f5; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd; }
.map-header h3 { margin: 0; font-size: 18px; }
.close-map-btn { background: none; border: none; font-size: 28px; cursor: pointer; line-height: 1; }
.map-body { flex: 1; display: flex; flex-direction: column; position: relative; padding: 0; }
.interactive-map-container { flex: 1; width: 100%; background: #eee; }
.selected-address-bar { padding: 10px 20px; background: white; border-top: 1px solid #eee; font-weight: 500; color: #333; }    
.map-footer { padding: 15px; background: #f9f9f9; border-top: 1px solid #eee; text-align: center; }
.confirm-map-btn { background: #00b14f; color: white; border: none; padding: 12px 30px; font-weight: bold; font-size: 16px; border-radius: 6px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,177,79,0.3); }
.confirm-map-btn:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; }
.confirm-map-btn:hover:not(:disabled) { background: #009e39; }
.shipping-options { display: flex; flex-direction: column; gap: 12px; }
.ship-option { display: flex; align-items: center; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.ship-option:hover { border-color: #00b14f; }
.ship-option.active { border-color: #00b14f; background-color: #f0fbf4; box-shadow: 0 0 0 1px #00b14f; }
.ship-option input { margin-right: 15px; width: 18px; height: 18px; accent-color: #00b14f; }
.ship-info { flex: 1; }
.ship-name { font-weight: 600; font-size: 15px; display: flex; align-items: center; gap: 8px; }
.badge { font-size: 11px; background: #ff4757; color: white; padding: 2px 6px; border-radius: 4px; }
.ship-desc { font-size: 13px; color: #666; margin-top: 4px; }
.ship-price { font-weight: 700; color: #333; }
.payment-methods { display: flex; gap: 15px; flex-wrap: wrap; }
.pay-method { flex: 1; min-width: 200px; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; }
.pay-method:hover { border-color: #00b14f; }
.pay-method.active { border-color: #00b14f; background: #f0fbf4; font-weight: 600; }
.radio-circle { width: 18px; height: 18px; border: 2px solid #ccc; border-radius: 50%; position: relative; }
.pay-method.active .radio-circle { border-color: #00b14f; }
.pay-method.active .radio-circle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 8px; height: 8px; background: #00b14f; border-radius: 50%; }

/* QR Code Section */
.qr-container { margin-top: 20px; background: #f8f9fa; padding: 20px; border-radius: 12px; text-align: center; border: 1px dashed #ccc; min-height: 350px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
.qr-header { font-weight: bold; margin-bottom: 15px; width: 100%; display: flex; justify-content: space-between; align-items: center; }
.timer { color: #d63031; font-family: monospace; font-size: 16px; background: white; padding: 4px 8px; border-radius: 4px; border: 1px solid #eee; }
.timer.urgent { color: red; font-weight: bold; animation: pulse 1s infinite; }
.qr-body { display: flex; flex-direction: column; align-items: center; width: 100%; }
.qr-img { width: 220px; height: 220px; object-fit: contain; background: white; padding: 5px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s; }
.qr-img:hover { transform: scale(1.02); }
.qr-details { margin: 15px 0; background: white; padding: 10px; border-radius: 6px; width: 100%; max-width: 300px; border: 1px solid #eee; }
.qr-note { margin: 5px 0; font-size: 14px; color: #555; }
.price-highlight { color: #00b14f; font-size: 16px; }
.code-highlight { color: #2980b9; font-size: 16px; letter-spacing: 1px; }

/* BUTTONS */
.confirm-paid-btn { background: #00b14f; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px; cursor: pointer; margin-top: 15px; width: 100%; max-width: 300px; transition: background 0.2s; box-shadow: 0 4px 6px rgba(0, 177, 79, 0.2); }
.confirm-paid-btn:hover { background: #009e39; transform: translateY(-1px); }
.refresh-qr { background: #555; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px; transition: 0.2s; }
.refresh-qr:hover { background: #333; }
.hint-text { font-size: 12px; color: #888; margin-top: 10px; font-style: italic; }

/* SPINNER & SUCCESS */
.qr-processing { display: flex; flex-direction: column; align-items: center; justify-content: center; animation: fadeIn 0.5s; }
.spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid #00b14f; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
 @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.qr-success { color: #00b14f; animation: fadeIn 0.5s; display: flex; flex-direction: column; align-items: center; }
.check-icon-circle { width: 60px; height: 60px; background: #00b14f; color: white; font-size: 30px; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin-bottom: 15px; }
.place-order-btn { width: 100%; background: #00b14f; color: white; border: none; padding: 18px; font-size: 18px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0, 177, 79, 0.3); margin-top: 20px; }
.place-order-btn:hover { background: #009e39; transform: translateY(-2px); }
.place-order-btn:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; transform: none; }
.order-summary-card h3 { margin-top: 0; font-size: 18px; margin-bottom: 15px; }
.order-items-list { max-height: 300px; overflow-y: auto; margin-bottom: 15px; }
.summary-item { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
.item-qty { font-weight: bold; color: #00b14f; width: 30px; }
.item-name { flex: 1; padding-right: 10px; }
.item-note { font-style: italic; color: #888; font-size: 12px; }
.item-price { font-weight: 600; }
.divider { height: 1px; background: #eee; margin: 15px 0; }
.price-row { display: flex; justify-content: space-between; margin-bottom: 10px; color: #555; }
.price-row.discount { color: #d63031; }
.total-row { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #333; margin-bottom: 20px; }
.total-price { color: #00b14f; font-size: 22px; }
 @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>