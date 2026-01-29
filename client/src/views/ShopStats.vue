<template>
  <StandardHeader />
  <div class="container mx-auto p-4 mt-4">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-green-800">Thống Kê Kinh Doanh - {{ auth.user?.full_name }}</h1>
        
        <!-- Date Picker -->
        <input 
            type="date" 
            v-model="selectedDate" 
            @change="fetchStats"
            class="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
        />
    </div>
    
    <div v-if="loading" class="text-center">Đang tải dữ liệu...</div>

    <!-- STATS CHARTS SECTION -->
    <div v-else-if="stats" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Top Products Chart -->
        <div class="bg-white p-6 rounded-xl shadow border border-gray-100">
            <h3 class="font-bold text-lg text-gray-700 mb-4 flex items-center gap-2">
                🏆 Top Món Bán Chạy
            </h3>
            <div class="space-y-3">
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
                <div v-if="stats.topProducts.length === 0" class="text-center text-gray-400 py-4">Chưa có dữ liệu</div>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import StandardHeader from '../components/StandardHeader.vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const auth = useAuthStore();
const stats = ref(null);
const loading = ref(true);
const selectedDate = ref(new Date().toISOString().split('T')[0]); // Default to today

// Computed for charts
const maxSold = ref(1);
const maxHourCount = ref(1);

const fetchStats = async () => {
    try {
        loading.value = true;
        // Find Shop ID first
        const shopsRes = await axios.get(`${API_BASE_URL}/api/shops`);
        const myShop = shopsRes.data.find(s => s.user_id === auth.user.id);

        if (myShop) {
            const res = await axios.get(`${API_BASE_URL}/api/shops/${myShop.id}/stats`, {
                params: { date: selectedDate.value }
            });
            stats.value = res.data;
            
            // Calculate Max for scaling
            if (stats.value.topProducts.length) {
                maxSold.value = Math.max(...stats.value.topProducts.map(i => i.sold));
            } else {
                maxSold.value = 1;
            }
            
            if (stats.value.peakTimes.length) {
                maxHourCount.value = Math.max(...stats.value.peakTimes.map(i => i.count));
            } else {
                maxHourCount.value = 1;
            }
        }
    } catch (e) {
        console.error("Lỗi tải thống kê:", e);
    } finally {
        loading.value = false;
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
});
</script>
