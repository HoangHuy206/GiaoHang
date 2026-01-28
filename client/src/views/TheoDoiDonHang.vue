<template>
  <div class="max-w-4xl mx-auto p-4">
    <h2 class="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Đơn Hàng Của Bạn</h2>

    <div v-if="loading" class="text-center py-10">
      <p>Đang tải dữ liệu...</p>
    </div>

    <div v-else-if="orders.length === 0" class="text-center py-10 bg-white rounded-lg shadow">
      <p class="text-gray-500 mb-4">Bạn chưa có đơn hàng nào.</p>
      <router-link to="/food" class="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 transition">Đặt món ngay</router-link>
    </div>

    <div v-else class="space-y-6">
      <div v-for="order in orders" :key="order.id" class="bg-white p-6 rounded-xl shadow border border-gray-100">
        <div class="flex justify-between items-start mb-4 border-b pb-4">
          <div>
            <h3 class="font-bold text-lg text-gray-800">Mã đơn: #{{ order.id }}</h3>
            <p class="text-sm text-gray-500">{{ formatDate(order.created_at) }}</p>
            <p class="text-sm font-semibold text-gray-700 mt-1">Quán: {{ order.shop_name }}</p>
          </div>
          <div class="text-right">
             <span :class="getStatusClass(order.status)" class="px-3 py-1 rounded-full text-sm font-bold uppercase inline-block mb-2">
               {{ getStatusText(order.status) }}
             </span>
             <p class="text-xl font-bold text-green-600">{{ formatPrice(order.total_price) }}</p>
          </div>
        </div>

        <!-- Driver Info -->
        <div v-if="order.status === 'delivered'" class="mb-4 bg-green-50 p-4 rounded-lg flex items-center gap-4 border border-green-200">
           <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✅</div>
           <div>
              <p class="font-bold text-green-800">Giao hàng thành công!</p>
              <p class="text-sm text-green-700">Chúc bạn ngon miệng. Cảm ơn đã sử dụng dịch vụ.</p>
           </div>
        </div>

        <div v-else-if="order.driver_id" class="mb-4 bg-blue-50 p-4 rounded-lg flex flex-col gap-4">
           <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-2xl">🛵</div>
              <div class="flex-1">
                 <p class="font-bold text-gray-800">Tài xế: {{ order.driver_name }}</p>
                 <p class="text-sm text-gray-600">SĐT: <a :href="`tel:${order.driver_phone}`" class="text-blue-600 font-bold hover:underline">{{ order.driver_phone }}</a></p>
              </div>
              <button @click="toggleChat(order.id)" 
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
import ChatBox from '../components/ChatBox.vue';

const auth = useAuthStore();
const router = useRouter();
const orders = ref([]);
const loading = ref(true);
const openChatId = ref(null);

const toggleChat = (orderId) => {
  if (openChatId.value === orderId) {
    openChatId.value = null;
  } else {
    openChatId.value = orderId;
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
    orders.value = response.data;
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