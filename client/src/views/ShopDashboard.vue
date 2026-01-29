<template>
  <StandardHeader />
  <div class="container mx-auto p-4 mt-4">
    <h1 class="text-3xl font-bold mb-6 text-green-800">Quản Lý Đơn Hàng - {{ auth.user?.full_name }}</h1>
    
    <div v-if="loading" class="text-center">Loading orders...</div>
    
    <div v-else class="space-y-6">
       <div v-if="orders.length === 0" class="text-center text-gray-500 py-10 bg-white rounded shadow">
           Hiện chưa có đơn hàng nào.
       </div>

       <div v-for="order in orders" :key="order.id" class="bg-white rounded-lg shadow-md overflow-hidden border-l-4" :class="getBorderColor(order.status)">
           <div class="p-4 flex justify-between items-start">
               <div>
                   <h3 class="font-bold text-lg">Đơn #{{ order.id }} - {{ order.user_name }}</h3>
                   <p class="text-sm text-gray-600">{{ new Date(order.created_at).toLocaleString() }}</p>
                   <p class="mt-2 font-bold text-red-600">Tổng: {{ formatPrice(order.total_price) }}</p>
                   <p class="text-sm mt-1">Giao đến: {{ order.delivery_address }}</p>
                   <p class="text-sm mt-1 font-semibold text-blue-600">Trạng thái: {{ formatStatus(order.status) }}</p>
               </div>
               <div class="flex flex-col space-y-2">
                   <!-- Flow: Pending -> (Shop Confirms) -> Finding Driver -> (Driver Accepts) -> Driver Assigned -> (Shop Confirms Pickup) -> Picked Up -> Delivered -->
                   
                   <button v-if="order.status === 'pending'" @click="updateStatus(order.id, 'finding_driver')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold">
                       Xác nhận đơn & Tìm tài xế
                   </button>

                   <button v-if="order.status === 'driver_assigned'" @click="updateStatus(order.id, 'picked_up')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">
                       Xác nhận tài xế đã lấy hàng
                   </button>
                   
                   <div v-if="order.status === 'finding_driver'" class="text-sm text-yellow-600 font-bold animate-pulse">
                       Đang tìm tài xế...
                   </div>
               </div>
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
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';

const auth = useAuthStore();
const orders = ref([]);
const loading = ref(true);
const socket = io(SOCKET_URL);

// Assuming the auth.user has the shopId linked or we fetch by user ID
// For this prototype, let's assume we fetch all orders for the shop the user owns.
// We need to know the Shop ID. In a real app, backend sends this. 
// For now, we'll fetch orders by role='shop' and let backend handle logic.

const fetchOrders = async () => {
    try {
        // Need to pass Shop ID. In `seed.js`, we linked User to Shop.
        // We'll rely on the backend to find the shop for this user.
        // But our backend endpoint `GET /orders` expects `shopId` in query if role is shop.
        // Quick fix: Fetch shop details first to get ID.
        
        // Actually, let's just fetch all shops, find the one owned by this user.
        const shopsRes = await axios.get(`${API_BASE_URL}/api/shops`);
        // This is inefficient but works for the prototype without changing backend auth structure deeply
        // Wait, schema says shops has user_id. 
        // Backend `GET /orders` logic: `if (role === 'shop') query += ' WHERE o.shop_id = ?'`
        
        // Let's first get the shop ID for this user.
        const myShop = shopsRes.data.find(s => s.user_id === auth.user.id);
        
        if (myShop) {
             const res = await axios.get(`${API_BASE_URL}/api/orders?role=shop&shopId=${myShop.id}`);
             orders.value = res.data;
             
             // Join Socket Room
             socket.emit('join_room', `shop_${myShop.id}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const updateStatus = async (orderId, status) => {
    try {
        await axios.put(`${API_BASE_URL}/api/orders/${orderId}/status`, { status });
        // Optimistic update
        const o = orders.value.find(x => x.id === orderId);
        if (o) o.status = status;
    } catch (e) {
        alert("Lỗi cập nhật trạng thái");
    }
};

const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'k';
const formatStatus = (s) => s.toUpperCase();
const getBorderColor = (s) => {
    if (s === 'pending') return 'border-yellow-500';
    if (s === 'finding_driver') return 'border-blue-500';
    if (s === 'completed') return 'border-green-500';
    return 'border-gray-500';
};

onMounted(() => {
    fetchOrders();

    socket.on('new_order', (data) => {
        alert("Có đơn hàng mới!");
        fetchOrders(); // Reload to get full details
    });
    
    socket.on('driver_notification', () => {
         // Not really for shop, but good to know
    });
});
</script>
