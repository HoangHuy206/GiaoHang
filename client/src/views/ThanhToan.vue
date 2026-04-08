<template>
  <div class="checkout-page-wrapper animate-fade-in">
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
               
               <!-- Sổ địa chỉ thêm vào gọn gàng -->
               <div v-if="savedAddresses.length > 0" class="mb-3">
                 <select v-model="selectedSavedAddressIndex" @change="applySavedAddress" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px;">
                   <option :value="-1">-- Chọn từ địa chỉ đã lưu --</option>
                   <option v-for="(addr, idx) in savedAddresses" :key="idx" :value="idx">
                     {{ addr.label }}: {{ addr.address }}
                   </option>
                 </select>
               </div>

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
                <div class="ship-info"><div class="ship-name">Ưu tiên • {{ calculatedETA.split('-')[0] }} phút <span class="badge">Nhanh nhất</span></div><div class="ship-desc">Đơn hàng được ưu tiên giao trước</div></div>
                <div class="ship-price">{{ formatCurrency(36000) }}</div>
              </label>
              <label class="ship-option" :class="{ active: selectedShip === 'fast' }">
                <input type="radio" value="fast" v-model="selectedShip">
                <div class="ship-info"><div class="ship-name">Nhanh • {{ calculatedETA }} phút</div></div>
                <div class="ship-price">{{ formatCurrency(28000) }}</div>
              </label>
              <label class="ship-option" :class="{ active: selectedShip === 'saver' }">
                <input type="radio" value="saver" v-model="selectedShip">
                <div class="ship-info"><div class="ship-name">Tiết kiệm • {{ parseInt(calculatedETA.split('-')[1]) + 15 }} phút</div></div>
                <div class="ship-price">{{ formatCurrency(22000) }}</div>
              </label>
            </div>
          </div>

          <div class="section-card payment-section">
            <div class="section-title"><span class="icon">💳</span> Phương thức thanh toán</div>
            <div class="payment-methods">
              <div class="pay-method" :class="{ active: paymentMethod === 'cash' }" @click="paymentMethod = 'cash'">
                <div class="radio-circle"></div><span>💵 Tiền mặt khi nhận hàng</span>
              </div>
              <div class="pay-method" :class="{ active: paymentMethod === 'banking' }" @click="paymentMethod = 'banking'">      
                <div class="radio-circle"></div><span>🏦 Chuyển khoản</span>
              </div>
            </div>

            <div v-if="paymentMethod === 'banking'" class="payment-banking-info" style="margin-top: 15px;">
              <!-- Ô nhập thông tin hoàn tiền -->
              <div class="refund-info-section" style="background: #fff; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #d35400; display: flex; align-items: center; gap: 5px;">
                  🛡️ Thông tin hoàn tiền (Bắt buộc)
                </h4>
                <p style="font-size: 12px; color: #666; margin-bottom: 12px;">
                  Trong trường hợp không có tài xế nhận đơn, chúng tôi sẽ hoàn tiền tự động qua thông tin này.
                </p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <select v-model="customerBank.bankCode" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px;">
                    <option value="">-- Chọn ngân hàng --</option>
                    <option value="MB">MB Bank (Quân Đội)</option>
                    <option value="VCB">Vietcombank</option>
                    <option value="ICB">Vietinbank</option>
                    <option value="BIDV">BIDV</option>
                    <option value="TCB">Techcombank</option>
                    <option value="ACB">ACB</option>
                    <option value="VPB">VPBank</option>
                    <option value="VIB">VIB</option>
                    <option value="TPB">TPBank</option>
                  </select>
                  <input type="text" v-model="customerBank.accountNumber" placeholder="Số tài khoản nhận tiền" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px;">
                  <input type="text" v-model="customerBank.accountName" placeholder="Tên chủ tài khoản (In hoa không dấu)" style="padding: 8px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px;">
                </div>
              </div>

              <div v-if="!randomOrderCode" class="qr-instruction" style="background: #fff8e1; border: 1px solid #ffca28; padding: 15px; border-radius: 8px; text-align: center; color: #856404; font-size: 14px;">
                <p>💡 Bạn vui lòng nhấn nút <strong>"ĐẶT ĐƠN HÀNG"</strong> bên dưới để lấy mã QR thanh toán.</p>
              </div>

              <div v-else class="qr-container" style="background: #f8f9fa; padding: 25px; border-radius: 15px; text-align: center; border: 1px dashed #00b14f; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                <div v-if="paymentStatus === 'pending'">
                  <div style="display: flex; justify-content: space-between; align-items: center; font-weight: bold; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                     <span style="color: #333;">Quét mã thanh toán</span>
                     <span style="color: #d63031; font-family: 'Courier New', monospace; background: #fff1f0; padding: 2px 8px; border-radius: 4px; border: 1px solid #ffa39e;">Hết hạn sau: {{ formatTime(qrTimeLeft) }}</span>   
                  </div>
                  
                  <div style="display: flex; justify-content: center; margin: 20px 0;">
                    <img :src="qrCodeUrl" alt="QR Code" style="width: 220px; height: 220px; background: white; padding: 12px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border: 1px solid #eee;" />
                  </div>

                  <div style="margin-top: 15px; font-size: 15px; background: white; padding: 15px; border-radius: 10px; border: 1px solid #eee;">
                     <p style="margin: 5px 0; color: #666;">Số tiền: <strong style="color: #00b14f; font-size: 18px;">{{ formatCurrency(finalTotal) }}</strong></p>
                     <p style="margin: 5px 0; color: #666;">Nội dung: <strong style="color: #2980b9; font-size: 18px; letter-spacing: 1px;">{{ randomOrderCode }}</strong></p>        
                  </div>
                  <div style="margin-top: 15px; font-size: 14px; color: #e67e22; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <div class="loading-dot"></div> Đang chờ nhận tiền...
                  </div>
                </div>
                <div v-else-if="paymentStatus === 'success'" style="color: #00b14f; font-weight: bold; padding: 30px 0;">
                   <div style="font-size: 50px; margin-bottom: 10px;">✅</div>
                   <h3 style="margin: 0; font-size: 22px;">Thanh toán thành công!</h3>
                   <p style="color: #666; font-weight: normal; margin-top: 10px;">Đơn hàng của bạn đang được xử lý.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="right-column">
          <div class="order-summary-card">
            <h3 style="margin-top: 0; font-size: 18px; margin-bottom: 15px;">Tóm tắt đơn hàng</h3>
            <div v-if="items.length > 0" class="order-items-list" style="max-height: 300px; overflow-y: auto;">
              <div v-for="item in items" :key="item.id" class="summary-item" style="display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px;">
                <div style="display: flex; gap: 10px;">
                    <span style="font-weight: bold; color: #00b14f;">{{ item.quantity }}x</span>
                    <span>{{ item.name }}</span>
                </div>
                <div style="font-weight: 600;">{{ formatCurrency(item.price * item.quantity) }}</div>
              </div>
            </div>

            <div style="height: 1px; background: #eee; margin: 15px 0;"></div>
            <div class="price-row" style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #555;"><span>Tạm tính</span><span>{{ formatCurrency(subTotal) }}</span></div>
            <div class="price-row" style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #555;"><span>Phí giao hàng</span><span>{{ formatCurrency(shipPrice) }}</span></div>
            <div class="price-row" v-if="selectedShip === 'saver'" style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #d63031;"><span>Khuyến mãi ship</span><span>-14.000₫</span></div>
            
            <div style="height: 1px; background: #eee; margin: 15px 0;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #333;">
              <span>Tổng cộng</span>
              <span style="color: #00b14f; font-size: 22px;">{{ formatCurrency(finalTotal) }}</span>
            </div>

            <button class="place-order-btn" @click="submitOrder" :disabled="dangXuLy || items.length === 0">
               {{ dangXuLy ? 'ĐANG XỬ LÝ...' : 'ĐẶT ĐƠN HÀNG' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Map Modal -->
    <div v-if="showMapModal" class="map-modal-overlay" @click.self="closeMap">
      <div class="map-modal-content">
        <div class="map-header"><h3>Chọn vị trí giao hàng</h3><button class="close-map-btn" @click="closeMap">×</button></div> 
        <div class="map-body">
          <div id="map-selection" style="width: 100%; height: 400px; background: #eee;"></div>
          <div class="selected-address-bar" v-if="tempSelectedAddress" style="padding: 10px 20px; background: white; border-top: 1px solid #eee; font-weight: 500;">
             📍 {{ tempSelectedAddress }}
          </div>
          <div class="map-footer" style="padding: 15px; text-align: center; border-top: 1px solid #eee;">
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
import { useToastStore } from '../stores/toast';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';

export default {
  name: "ThanhToan",
  setup() {
    const router = useRouter();
    const toast = useToastStore();
    const auth = useAuthStore();
    const cartStore = useCartStore();
    const socket = io(SOCKET_URL);

    const items = ref([]);
    const shopInfo = ref(null);
    const selectedShip = ref('fast');
    const paymentMethod = ref('cash');
    const showMapModal = ref(false);
    const tempSelectedAddress = ref('');
    const dangXuLy = ref(false);
    const selectedCoords = ref({ lat: 21.0285, lng: 105.8542 });
    const randomOrderCode = ref('');
    const qrTimeLeft = ref(600);
    const paymentStatus = ref('pending');
    const userInfo = reactive({ name: '', phone: '', address: '', username: '' });
    const customerBank = reactive({ bankCode: '', accountNumber: '', accountName: '' });
    const shippingRates = { priority: 36000, fast: 28000, saver: 22000 };
    
    let mapInstance = null, markerInstance = null, timerInterval = null, checkInterval = null;

    // Address Book Features
    const savedAddresses = ref([]);
    const selectedSavedAddressIndex = ref(-1);

    const fetchSavedAddresses = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            const res = await axios.get(`${API_BASE_URL}/api/user/addresses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            savedAddresses.value = res.data;
            const dIdx = savedAddresses.value.findIndex(a => a.is_default);
            if (dIdx !== -1) { 
                selectedSavedAddressIndex.value = dIdx; 
                applySavedAddress(); 
            }
        } catch (e) { console.error("Lấy địa chỉ lỗi:", e); }
    };

    const applySavedAddress = () => {
        if (selectedSavedAddressIndex.value === -1) return;
        const addr = savedAddresses.value[selectedSavedAddressIndex.value];
        userInfo.address = addr.address;
        if (addr.lat && addr.lng) {
            selectedCoords.value = { lat: Number(addr.lat), lng: Number(addr.lng) };
        }
    };

    const calculatedETA = computed(() => {
        if (!shopInfo.value || !selectedCoords.value.lat) return '30-45';
        const R = 6371;
        const dLat = (selectedCoords.value.lat - shopInfo.value.lat) * Math.PI / 180;
        const dLon = (selectedCoords.value.lng - shopInfo.value.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(shopInfo.value.lat*Math.PI/180)*Math.cos(selectedCoords.value.lat*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const totalMin = Math.round((shopInfo.value.average_prep_time || 15) + (distance / 0.5));
        return `${totalMin}-${totalMin + 10}`;
    });

    const onPaymentSuccess = () => {
        if (paymentStatus.value === 'success') return;
        paymentStatus.value = 'success';
        clearInterval(timerInterval); clearInterval(checkInterval);
        new Audio('/sounds/Download-_1_.mp3').play().catch(() => {});
        
        // --- XÓA MÓN KHỎI GIỎ HÀNG CHÍNH THEO QUÁN ---
        if (items.value.length > 0) {
            const sid = items.value[0].shopId;
            cartStore.items = cartStore.items.filter(item => item.shopId !== sid);
            cartStore.saveToStorage();
        }

        localStorage.removeItem('tempCart');
        toast.success("Thanh toán thành công!");
        setTimeout(() => router.push('/theodoidonhang'), 2000);
    };

    onMounted(async () => {
      socket.on('payment_success', onPaymentSuccess);
      const storedItems = localStorage.getItem('tempCart');
      if (storedItems) {
          items.value = JSON.parse(storedItems);
          try { const res = await axios.get(`${API_BASE_URL}/api/shops/${items.value[0].shopId}`); shopInfo.value = res.data; } catch(e){}
      }
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      userInfo.name = u.fullname || u.HoTen || ''; userInfo.phone = u.phone || ''; userInfo.address = u.address || '';
      fetchSavedAddresses();
    });

    onUnmounted(() => { clearInterval(timerInterval); clearInterval(checkInterval); });

    const subTotal = computed(() => items.value.reduce((s, i) => s + (i.price * i.quantity), 0));
    const shipPrice = computed(() => shippingRates[selectedShip.value]);
    const finalTotal = computed(() => (subTotal.value + shipPrice.value - (selectedShip.value === 'saver' ? 14000 : 0)));
    const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    const qrCodeUrl = computed(() => {
        if (!randomOrderCode.value) return '';
        let b = shopInfo.value?.bank_code || 'MB';
        if (b.toUpperCase() === 'ICB') b = 'VietinBank';
        return `https://qr.sepay.vn/img?bank=${b}&acc=${shopInfo.value?.bank_account || '0396222614'}&template=compact&amount=${Math.round(finalTotal.value)}&des=${randomOrderCode.value}`;
    });

    const generateNewQR = async (orderId, orderCode) => {
        randomOrderCode.value = orderCode; paymentStatus.value = 'pending'; qrTimeLeft.value = 600;
        socket.emit('join_room', `order_${orderId}`);
        timerInterval = setInterval(() => { if (qrTimeLeft.value > 0) qrTimeLeft.value--; else location.reload(); }, 1000);
        checkInterval = setInterval(async () => { 
            try {
                const res = await axios.get(`${API_BASE_URL}/api/payment/check/${orderCode}?t=${Date.now()}`);
                if (res.data && res.data.paid) onPaymentSuccess();
            } catch (e) {
                // Im lặng khi lỗi kết nối để tránh spam console
                console.log("Đang kết nối lại với máy chủ thanh toán...");
            }
        }, 3000);
    };

    const submitOrder = async () => {
       if(!userInfo.address) return toast.warning("Vui lòng nhập địa chỉ giao hàng!");
       
       if (paymentMethod.value === 'banking') {
         if (!customerBank.bankCode || !customerBank.accountNumber || !customerBank.accountName) {
           return toast.warning("Vui lòng nhập đầy đủ thông tin ngân hàng để phòng trường hợp hoàn tiền!");
         }
       }

       dangXuLy.value = true;
       try {
           const res = await axios.post(`${API_BASE_URL}/api/orders`, {
               userId: auth.user.id, shopId: items.value[0].shopId,
               items: items.value.map(i => ({ productId: i.id || i.productId, quantity: i.quantity, price: i.price, name: i.name })),
               totalPrice: finalTotal.value, deliveryAddress: userInfo.address,
               deliveryLat: selectedCoords.value.lat, deliveryLng: selectedCoords.value.lng,
               paymentMethod: paymentMethod.value,
               customerBankCode: customerBank.bankCode,
               customerBankAccount: customerBank.accountNumber,
               customerBankName: customerBank.accountName
           });
           if (res.data.success) {
               if (paymentMethod.value === 'banking') await generateNewQR(res.data.orderId, res.data.orderCode);
               else { 
                   // --- XÓA MÓN KHỎI GIỎ HÀNG CHÍNH CHO TIỀN MẶT ---
                   if (items.value.length > 0) {
                       const sid = items.value[0].shopId;
                       cartStore.items = cartStore.items.filter(item => item.shopId !== sid);
                       cartStore.saveToStorage();
                   }
                   localStorage.removeItem('tempCart');
                   toast.success("Đặt đơn thành công!"); 
                   router.push('/theodoidonhang'); 
               }
           }
       } catch (e) { toast.error("Lỗi đặt đơn!"); } finally { dangXuLy.value = false; }
    };

    const setHardLocation = () => { 
        if(auth.user && auth.user.address) {
            userInfo.address = auth.user.address; 
            toast.info("Đã dùng địa chỉ từ hồ sơ của bạn"); 
        } else {
            toast.warning("Hồ sơ của bạn chưa có địa chỉ. Vui lòng nhập tay hoặc chọn trên bản đồ.");
        }
    };
    
    const openMapModal = () => { 
        showMapModal.value = true; 
        setTimeout(() => {
            initSelectionMap();
        }, 300);
    };

    const initSelectionMap = () => {
        if (typeof L === 'undefined') {
            toast.error("Không thể tải thư viện Bản đồ. Vui lòng kiểm tra kết nối mạng.");
            return;
        }
        if (mapInstance) mapInstance.remove();
        
        mapInstance = L.map('map-selection', {
            zoomControl: false,
            attributionControl: false
        }).setView([selectedCoords.value.lat, selectedCoords.value.lng], 16);

        L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
        }).addTo(mapInstance);

        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
        
        const customPin = L.icon({
            iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });

        markerInstance = L.marker([selectedCoords.value.lat, selectedCoords.value.lng], { 
            draggable: true,
            icon: customPin
        }).addTo(mapInstance);
        
        mapInstance.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            markerInstance.setLatLng([lat, lng]);
            updateTempAddress(lat, lng);
        });

        markerInstance.on('dragend', async (e) => {
            const p = e.target.getLatLng(); 
            updateTempAddress(p.lat, p.lng);
        });

        updateTempAddress(selectedCoords.value.lat, selectedCoords.value.lng);
    };

    const updateTempAddress = async (lat, lng) => {
        selectedCoords.value = { lat, lng };
        try {
            const r = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=vi`);
            tempSelectedAddress.value = r.data.display_name;
        } catch (e) {
            tempSelectedAddress.value = `Tọa độ: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    };

    const confirmMapSelection = () => { 
        if(tempSelectedAddress.value) {
            userInfo.address = tempSelectedAddress.value; 
            toast.success("Đã cập nhật địa chỉ từ bản đồ");
        }
        showMapModal.value = false; 
    };

    const closeMap = () => { 
        showMapModal.value = false; 
        if(mapInstance) mapInstance.remove(); 
    };

    const formatTime = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

    return {
      items, userInfo, customerBank, selectedShip, paymentMethod, subTotal, finalTotal, shipPrice, formatCurrency,
      qrCodeUrl, qrTimeLeft, formatTime, randomOrderCode, paymentStatus, selectedCoords, dangXuLy,
      showMapModal, openMapModal, closeMap, tempSelectedAddress, confirmMapSelection, setHardLocation, submitOrder,
      savedAddresses, selectedSavedAddressIndex, applySavedAddress, calculatedETA
    };
  }
}
</script>

<style scoped>
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
.address-box { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
.user-info-row { font-weight: 600; margin-bottom: 10px; color: #333; font-size: 16px; }
.input-wrapper { display: flex; gap: 10px; align-items: flex-start; }
.address-input { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 6px; resize: none; font-family: inherit; }
.button-group-vertical { display: flex; flex-direction: column; gap: 8px; }
.detect-btn, .map-btn { display: flex; align-items: center; white-space: nowrap; padding: 0 15px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; height: 36px; border: 1px solid #ccc; background: white; width: 160px; }
.detect-btn { border-color: #ff4757; color: #ff4757; }
.map-btn { border-color: #2980b9; color: #2980b9; }
.shipping-options { display: flex; flex-direction: column; gap: 12px; }
.ship-option { display: flex; align-items: center; padding: 15px; border: 1px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.ship-option.active { border-color: #00b14f; background-color: #f0fbf4; box-shadow: 0 0 0 1px #00b14f; }
.ship-info { flex: 1; margin-left: 10px; }
.ship-name { font-weight: 600; font-size: 15px; }
.badge { font-size: 11px; background: #ff4757; color: white; padding: 2px 6px; border-radius: 4px; }
.ship-desc { font-size: 13px; color: #666; margin-top: 4px; }
.ship-price { font-weight: 700; color: #333; }
.payment-methods { display: flex; gap: 15px; }
.pay-method { flex: 1; border: 1px solid #e0e0e0; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
.pay-method.active { border-color: #00b14f; background: #f0fbf4; font-weight: 600; }
.radio-circle { width: 18px; height: 18px; border: 2px solid #ccc; border-radius: 50%; }
.pay-method.active .radio-circle { border-color: #00b14f; background: #00b14f; }
.place-order-btn { width: 100%; background: #00b14f; color: white; border: none; padding: 18px; font-size: 18px; font-weight: bold; text-transform: uppercase; border-radius: 8px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 10px rgba(0, 177, 79, 0.3); margin-top: 20px; }
.place-order-btn:hover { background: #009e39; }
.place-order-btn:disabled { background: #ccc; cursor: not-allowed; }
.map-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 2000; display: flex; justify-content: center; align-items: center; }
.map-modal-content { background: white; width: 900px; max-width: 95%; border-radius: 12px; overflow: hidden; }
.map-header { padding: 15px 20px; background: #f0f2f5; display: flex; justify-content: space-between; align-items: center; }
.confirm-map-btn { background: #00b14f; color: white; border: none; padding: 12px 30px; font-weight: bold; border-radius: 6px; cursor: pointer; }

/* Loading Animation */
.loading-dot {
  width: 8px;
  height: 8px;
  background: #e67e22;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

@media (max-width: 768px) {
    .checkout-page-wrapper { padding: 10px 5px; }
    .checkout-container-desktop { width: 100% !important; max-width: 100% !important; margin: 0; }
    .checkout-content { flex-direction: column; gap: 15px; width: 100%; }
    .left-column, .right-column { width: 100% !important; flex: none !important; }
    .right-column { position: static; margin-top: 10px; }
    .input-wrapper { flex-direction: column; gap: 12px; width: 100%; }
    .address-input { width: 100% !important; min-height: 80px; }
    .button-group-vertical { flex-direction: column; width: 100%; gap: 10px; }
    .detect-btn, .map-btn { width: 100% !important; height: 45px; justify-content: center; font-size: 14px; }
    .payment-methods { flex-direction: column; width: 100%; }
    .pay-method { width: 100%; padding: 18px; }
    .section-card { padding: 15px; width: 100%; box-sizing: border-box; }
    .place-order-btn { width: 100%; padding: 20px; font-size: 16px; position: sticky; bottom: 10px; z-index: 100; }
}
</style>