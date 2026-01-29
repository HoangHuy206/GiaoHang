<template>
  <StandardHeader />
  <div class="max-w-4xl mx-auto p-4 mt-4">
    <h2 class="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Đơn Hàng Của Bạn</h2>

    <div v-if="loading" class="text-center py-10">
      <p>Đang tải dữ liệu...</p>
    </div>

    <div v-else-if="orders.length === 0" class="text-center py-10 bg-white rounded-lg shadow">
      <p class="text-gray-500 mb-4">Bạn chưa có đơn hàng nào.</p>
      <router-link to="/food" class="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 transition">Đặt món ngay</router-link>
    </div>

    <div v-else class="space-y-6">
      <div v-for="order in orders" :key="order.id" class="bg-white p-6 rounded-xl shadow border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer" @click="goToProduct(order)">
        <div class="flex justify-between items-start mb-4 border-b pb-4">
          <div class="flex gap-4">
            <!-- Product Image -->
            <div class="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0">
               <img :src="getImageUrl(order.first_product_image)" alt="Product" class="w-full h-full object-cover">
            </div>
            <div>
              <h3 class="font-bold text-lg text-gray-800">Mã đơn: #{{ order.id }}</h3>
              <p class="text-sm text-gray-500">{{ formatDate(order.created_at) }}</p>
              <p class="text-sm font-semibold text-gray-700 mt-1">Quán: {{ order.shop_name }}</p>
            </div>
          </div>
          <div class="text-right">
             <span :class="getStatusClass(order.status)" class="px-3 py-1 rounded-full text-sm font-bold uppercase inline-block mb-2">
               {{ getStatusText(order.status) }}
             </span>
             <p class="text-xl font-bold text-green-600">{{ formatPrice(order.total_price) }}</p>
          </div>
        </div>

        <!-- Confirm Button Section -->
        <div v-if="order.status === 'delivered' && !order.is_completed_by_user" class="mb-4 p-4 bg-green-50 rounded-lg border border-green-200" @click.stop>
           <p class="text-green-800 font-bold mb-2">Tài xế đã giao hàng. Vui lòng xác nhận!</p>
           <button @click.stop="openRatingModal(order)" class="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 transition">
              Đã Nhận Hàng Thành Công
           </button>
        </div>

        <!-- Completed Info -->
        <div v-if="order.is_completed_by_user" class="mb-4 bg-gray-50 p-4 rounded-lg flex items-center gap-4 border border-gray-200">
           <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-2xl">🎉</div>
           <div>
              <p class="font-bold text-gray-800">Đơn hàng hoàn tất</p>
              <p class="text-sm text-gray-600">Cảm ơn bạn đã đánh giá tài xế.</p>
           </div>
        </div>

        <!-- Driver Info -->
        <div v-else-if="order.driver_id" class="mb-4 bg-blue-50 p-4 rounded-lg flex flex-col gap-4" @click.stop>
           <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-2xl">🛵</div>
              <div class="flex-1">
                 <p class="font-bold text-gray-800">Tài xế: {{ order.driver_name }}</p>
                 <p class="text-sm text-gray-600">SĐT: <a :href="`tel:${order.driver_phone}`" class="text-blue-600 font-bold hover:underline">{{ order.driver_phone }}</a></p>
              </div>
              <button @click.stop="toggleChat(order.id)" 
                      class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Chat
              </button>
           </div>
           
           <!-- Chat Box Integration -->
           <div v-if="openChatId === order.id" class="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <ChatBox 
                :order-id="order.id" 
                :current-user="auth.user" 
                @close="openChatId = null"
              />
           </div>
        </div>
        <div v-else-if="order.status === 'finding_driver'" class="mb-4 bg-yellow-50 p-4 rounded-lg text-yellow-800 flex items-center gap-2">
           <span class="animate-spin">⏳</span> Đang tìm tài xế gần bạn...
        </div>

        <div class="flex justify-between items-center text-sm text-gray-600">
           <p>Giao đến: <span class="font-medium text-gray-800">{{ order.delivery_address }}</span></p>
        </div>
      </div>
    </div>

    <!-- Rating Modal -->
    <div v-if="showRatingModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
       <div class="bg-white rounded-2xl p-6 w-[90%] max-w-md shadow-2xl animate-in zoom-in duration-200">
          <h3 class="text-xl font-bold text-center mb-4">Đánh giá Tài xế</h3>
          <div class="flex justify-center gap-2 mb-6">
             <button v-for="star in 5" :key="star" @click="rating = star" class="text-4xl transition transform hover:scale-110">
                {{ star <= rating ? '⭐' : '☆' }}
             </button>
          </div>
          <textarea v-model="comment" placeholder="Viết nhận xét của bạn..." class="w-full border p-3 rounded-lg mb-4 h-24 focus:ring-2 focus:ring-green-500 outline-none"></textarea>
          <div class="flex gap-3">
             <button @click="showRatingModal = false" class="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300">Bỏ qua</button>
             <button @click="submitRating" class="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg">Gửi Đánh Giá</button>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import StandardHeader from '../components/StandardHeader.vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
import ChatBox from '../components/ChatBox.vue';

const auth = useAuthStore();
const router = useRouter();
const orders = ref([]);
const loading = ref(true);
const openChatId = ref(null);

const getImageUrl = (url) => {
    if (!url) return 'https://cdn-icons-png.flaticon.com/512/706/706164.png';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

const goToProduct = (order) => {
    if (order.shop_id && order.first_product_id) {
        router.push({ 
            path: `/restaurant/${order.shop_id}`, 
            query: { highlight: order.first_product_id } 
        });
    }
};

// Rating Logic
const showRatingModal = ref(false);
const rating = ref(5);
const comment = ref('');
const selectedOrder = ref(null);

const toggleChat = (orderId) => {
  if (openChatId.value === orderId) {
    openChatId.value = null;
  } else {
    openChatId.value = orderId;
  }
};

const openRatingModal = (order) => {
    selectedOrder.value = order;
    rating.value = 5;
    comment.value = '';
    showRatingModal.value = true;
};

const submitRating = async () => {
    if (!selectedOrder.value) return;
    try {
        await axios.post(`${API_BASE_URL}/api/reviews`, {
            orderId: selectedOrder.value.id,
            driverId: selectedOrder.value.driver_id,
            userId: auth.user.id,
            rating: rating.value,
            comment: comment.value
        });
        
        // Mark as completed locally
        const idx = orders.value.findIndex(o => o.id === selectedOrder.value.id);
        if (idx !== -1) {
            orders.value[idx].is_completed_by_user = true;
            // Optionally update backend to flag order as fully reviewed if needed
        }
        
        alert("Cảm ơn đánh giá của bạn!");
        showRatingModal.value = false;
    } catch (e) {
        console.error(e);
        alert("Lỗi gửi đánh giá");
    }
};

const fetchOrders = async () => {
  if (!auth.user) {
     router.push('/login');
     return;
  }
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/orders`, {
      params: { 
        role: 'user', 
        userId: auth.user.id 
      }
    });
    
    // Check if already reviewed (naive check, better to have a flag in DB)
    // For now we rely on local state or simple logic. 
    // Ideally backend should return `has_reviewed` flag.
    // Let's assume for prototype if it's delivered we show button unless clicked.
    // We'll fetch reviews to check if already reviewed.
    const ordersData = response.data;
    
    // Quick check for existing reviews (optional optimization)
    // For now, simple implementation.
    orders.value = ordersData;

  } catch (error) {
    console.error("Lỗi tải đơn hàng:", error);
  } finally {
    loading.value = false;
  }
};

const getStatusText = (status) => {
  const map = {
    'pending': 'Chờ xác nhận',
    'confirmed': 'Đã xác nhận',
    'finding_driver': 'Tìm tài xế',
    'driver_assigned': 'Đã có tài xế',
    'picked_up': 'Đang giao',
    'delivered': 'Đã giao',
    'cancelled': 'Đã hủy'
  };
  return map[status] || status;
};

const getStatusClass = (status) => {
  const map = {
    'pending': 'bg-gray-100 text-gray-600',
    'confirmed': 'bg-blue-100 text-blue-600',
    'finding_driver': 'bg-yellow-100 text-yellow-600',
    'driver_assigned': 'bg-purple-100 text-purple-600',
    'picked_up': 'bg-orange-100 text-orange-600',
    'delivered': 'bg-green-100 text-green-600',
    'cancelled': 'bg-red-100 text-red-600'
  };
  return map[status] || 'bg-gray-100';
};

const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const formatDate = (dateStr) => {
  if(!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN');
};

onMounted(() => {
  fetchOrders();
  // Poll for updates every 10 seconds
  setInterval(fetchOrders, 10000);
});
</script>