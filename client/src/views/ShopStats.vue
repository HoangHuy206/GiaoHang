<template>
  <div class="shop-stats-page">
    <StandardHeader />
    <div class="container mx-auto p-4 mt-4 animate-fade-in">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
              <button @click="$router.push('/shop-admin')" class="text-green-600 font-bold flex items-center gap-1 hover:underline mb-2">
                  ← Quay lại Dashboard
              </button>
              <h1 class="text-3xl font-bold text-green-800">Thống Kê Kinh Doanh</h1>
          </div>
          
          <!-- Date Picker -->
          <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-gray-500">Ngày:</span>
              <input 
                  type="date" 
                  v-model="selectedDate" 
                  @change="fetchStats"
                  class="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
              />
          </div>
      </div>
      
      <div v-if="loading" class="text-center py-20 bg-white rounded-xl shadow">
          <div class="animate-spin inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
          <p class="text-gray-500 font-medium">Đang tải dữ liệu...</p>
      </div>

      <!-- STATS CHARTS SECTION -->
      <div v-else-if="stats" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <!-- Top Products Chart -->
          <div class="bg-white p-6 rounded-xl shadow border border-gray-100">
              <h3 class="font-bold text-lg text-gray-700 mb-4 flex items-center gap-2">
                  🏆 Top Món Bán Chạy
              </h3>
              <div class="space-y-3">
                  <template v-if="stats.topProducts && stats.topProducts.length > 0">
                    <div v-for="(item, index) in stats.topProducts" :key="index" class="relative">
                        <div class="flex justify-between text-sm mb-1">
                            <span class="font-medium text-gray-600 truncate w-3/4">{{ item.name }}</span>
                            <span class="font-bold text-green-600">{{ item.sold }} bán</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2.5">
                            <div class="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                                 :style="{ width: getWidth(item.sold, maxSold) + '%' }"></div>
                        </div>
                    </div>
                  </template>
                  <div v-else class="text-center text-gray-400 py-10 italic">
                    Chưa có dữ liệu món ăn cho ngày này.
                  </div>
              </div>
          </div>

          <!-- Peak Time Chart -->
          <div class="bg-white p-6 rounded-xl shadow border border-gray-100">
              <h3 class="font-bold text-lg text-gray-700 mb-4 flex items-center gap-2">
                  ⏰ Giờ Cao Điểm
              </h3>
              <div class="flex items-end justify-between h-40 gap-1 pt-4 border-b border-gray-200">
                  <div v-for="hour in 24" :key="hour" class="flex flex-col items-center flex-1 group relative">
                      <!-- Tooltip -->
                      <div class="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 bg-black text-white text-xs px-2 py-1 rounded transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {{ hour-1 }}h: {{ getCountForHour(hour-1) }} đơn
                      </div>
                      <!-- Bar -->
                      <div class="w-full bg-blue-100 rounded-t hover:bg-blue-400 transition-colors relative"
                           :style="{ height: getHeight(getCountForHour(hour-1), maxHourCount) + '%' }">
                           <div v-if="getCountForHour(hour-1) > 0" class="absolute bottom-0 w-full bg-blue-500 h-1"></div>
                      </div>
                  </div>
              </div>
              <div class="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
              </div>
          </div>
      </div>
      
      <div v-else class="text-center py-20 bg-white rounded-xl shadow text-gray-500">
          Không tìm thấy thông tin shop hoặc dữ liệu thống kê.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import StandardHeader from '../components/StandardHeader.vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { io } from 'socket.io-client';

const auth = useAuthStore();
const stats = ref(null);
const loading = ref(true);
const selectedDate = ref(new Date().toISOString().split('T')[0]); // Default to today

const maxSold = ref(1);
const maxHourCount = ref(1);
const myShopId = ref(null);
let socket = null;

const fetchStats = async (showLoading = true) => {
    try {
        if (!auth.user?.id) return;
        if (showLoading) loading.value = true;
        
        const shopsRes = await axios.get(`${API_BASE_URL}/api/shops`);
        const myShop = shopsRes.data.find(s => s.user_id === auth.user.id);

        if (myShop) {
            myShopId.value = myShop.id;
            const res = await axios.get(`${API_BASE_URL}/api/shops/${myShop.id}/stats`, {
                params: { date: selectedDate.value }
            });
            stats.value = res.data;
            
            // Calculate Max for scaling
            if (stats.value?.topProducts && stats.value.topProducts.length > 0) {
                maxSold.value = Math.max(...stats.value.topProducts.map(i => i.sold));
            } else {
                maxSold.value = 1;
            }
            
            if (stats.value?.peakTimes && stats.value.peakTimes.length > 0) {
                maxHourCount.value = Math.max(...stats.value.peakTimes.map(i => i.count));
            } else {
                maxHourCount.value = 1;
            }

            // Join socket room if not already
            if (socket && socket.connected) {
                socket.emit('join_room', `shop_${myShop.id}`);
            }
        }
    } catch (e) {
        console.error("Lỗi tải thống kê:", e);
    } finally {
        if (showLoading) loading.value = false;
    }
};

const getWidth = (val, max) => (max > 0 ? (val / max) * 100 : 0);
const getHeight = (val, max) => (max > 0 ? (val / max) * 100 : 0);
const getCountForHour = (h) => {
    if (!stats.value?.peakTimes) return 0;
    const found = stats.value.peakTimes.find(t => t.order_hour === h);
    return found ? found.count : 0;
};

onMounted(() => {
    fetchStats();

    // Setup Socket for Real-time
    socket = io(SOCKET_URL);

    socket.on('connect', () => {
        console.log("📊 Stats Socket connected");
        if (myShopId.value) {
            socket.emit('join_room', `shop_${myShopId.value}`);
        }
    });

    socket.on('new_order', (data) => {
        console.log("🔔 New order in Stats page, refreshing...", data);
        // Refresh stats without full page loading spinner for smoother feel
        fetchStats(false); 
    });

    // Also refresh on status updates if you want to track "Completed" orders in real-time
    socket.on('order_status_updated', () => {
        fetchStats(false);
    });
});

onUnmounted(() => {
    if (socket) {
        socket.disconnect();
        console.log("📊 Stats Socket disconnected");
    }
});
</script>
