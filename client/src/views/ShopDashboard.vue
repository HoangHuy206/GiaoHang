<template>
  <StandardHeader />
  <div class="container mx-auto p-4 mt-4">
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-green-800">Quản Lý Shop #{{ myShopId }} - {{ auth.user?.full_name }}</h1>
        <div class="flex gap-2">
            <button @click="showConfig = true" class="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition shadow-md">
                ⚙️ Cấu Hình Shop
            </button>
            <button @click="showAddProduct = !showAddProduct" class="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition shadow-md">
                {{ showAddProduct ? 'Đóng Form' : '+ Thêm Sản Phẩm' }}
            </button>
        </div>
    </div>

    <!-- Shop Config Modal -->
    <div v-if="showConfig" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div class="bg-blue-600 p-4 text-white flex justify-between items-center">
                <h3 class="font-bold text-lg">Cấu Hình Shop & Thanh Toán</h3>
                <button @click="showConfig = false" class="text-2xl">&times;</button>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700">Tên hiển thị Shop</label>
                    <input v-model="shopConfig.name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md p-2">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Địa chỉ Shop</label>
                    <input v-model="shopConfig.address" type="text" class="mt-1 block w-full border border-gray-300 rounded-md p-2">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Ngân hàng (Mã)</label>
                        <input v-model="shopConfig.bank_code" type="text" placeholder="Vd: MB, VCB" class="mt-1 block w-full border border-gray-300 rounded-md p-2">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700">Số tài khoản</label>
                        <input v-model="shopConfig.bank_account" type="text" class="mt-1 block w-full border border-gray-300 rounded-md p-2">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700">Telegram Chat ID (Nhận thông báo)</label>
                    <input v-model="shopConfig.telegram_chat_id" type="text" placeholder="Lấy từ bot GHTN" class="mt-1 block w-full border border-gray-300 rounded-md p-2">
                </div>
                <div class="pt-4">
                    <button @click="updateShopInfo" :disabled="submittingConfig" class="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition">
                        {{ submittingConfig ? 'Đang lưu...' : 'Lưu Cấu Hình' }}
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Add Product Form -->
    <div v-if="showAddProduct" class="bg-white p-6 rounded-xl shadow-lg mb-8 border border-orange-100 animate-fade-in">
        <h2 class="text-xl font-bold mb-4 text-orange-600">Thêm Món Mới</h2>
        <form @submit.prevent="addProduct" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="block text-sm font-medium text-gray-700">Tên món</label>
                <input v-model="newProd.name" type="text" required class="mt-1 block w-full border border-gray-300 rounded-md p-2" placeholder="Ví dụ: Cơm rang gà quay">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Giá (k)</label>
                <input v-model="newProd.price" type="number" required class="mt-1 block w-full border border-gray-300 rounded-md p-2" placeholder="Ví dụ: 35">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Mã món (Tùy chọn)</label>
                <input v-model="newProd.productCode" type="text" class="mt-1 block w-full border border-gray-300 rounded-md p-2" placeholder="Ví dụ: C001">
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700">Hình ảnh</label>
                <input type="file" @change="handleFileUpload" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100">
            </div>
            <div class="md:col-span-2 flex justify-end">
                <button type="submit" :disabled="submitting" class="bg-green-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                    {{ submitting ? 'Đang thêm...' : 'Xác Nhận Thêm' }}
                </button>
            </div>
        </form>
    </div>
    
    <div v-if="loading" class="text-center">Loading orders...</div>
    
    <div v-else class="space-y-6">
       <div v-if="orders.length === 0" class="text-center text-gray-500 py-10 bg-white rounded shadow">
           Hiện chưa có đơn hàng nào.
       </div>

       <div v-for="order in orders" :key="order.id" class="bg-white rounded-lg shadow-md overflow-hidden border-l-4" :class="getBorderColor(order.status)">
           <div class="p-4 flex justify-between items-start">
               <div class="flex gap-4">
                   <!-- Product Image -->
                   <div class="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                       <img :src="getImageUrl(order.first_product_image)" alt="Product" class="w-full h-full object-cover">
                   </div>
                   <div>
                       <h3 class="font-bold text-lg">Đơn #{{ order.id }} - {{ order.user_name }}</h3>
                       <p class="text-sm text-gray-600">{{ new Date(order.created_at).toLocaleString() }}</p>
                       <p class="mt-2 font-bold text-red-600">Tổng: {{ formatPrice(order.total_price) }}</p>
                       <p class="text-sm mt-1">Giao đến: {{ order.delivery_address }}</p>
                       <p class="text-sm mt-1 font-semibold text-blue-600">Trạng thái: {{ formatStatus(order.status) }}</p>
                   </div>
               </div>
               <div class="flex flex-col space-y-2">
                   <!-- Flow: Pending -> (Shop Confirms) -> Finding Driver -> (Driver Accepts) -> Driver Assigned -> (Shop Confirms Pickup) -> Picked Up -> Delivered -->
                   
                   <button v-if="order.status === 'pending'" @click="updateStatus(order.id, 'finding_driver')" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold">
                       Xác nhận đơn & Tìm tài xế
                   </button>

                   <button v-if="order.status === 'driver_assigned'" @click="updateStatus(order.id, 'picked_up')" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold">
                       Xác nhận tài xế đã lấy hàng
                   </button>
                   
                   <div v-if="order.status === 'finding_driver'" class="flex flex-col gap-2">
                       <div class="text-sm text-yellow-600 font-bold animate-pulse">
                           Đang tìm tài xế...
                       </div>
                       <button @click="simulateRefund(order)" class="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition">
                           Test Hoàn Tiền (2 phút)
                       </button>
                   </div>
               </div>
           </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import StandardHeader from '../components/StandardHeader.vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from '../config';
import { botBus } from '../utils/botBus';

const auth = useAuthStore();
const orders = ref([]);
const loading = ref(true);
const socket = io(SOCKET_URL);

// --- PRODUCT ADDING LOGIC ---
const showAddProduct = ref(false);
const showConfig = ref(false);
const submitting = ref(false);
const submittingConfig = ref(false);
const myShopId = ref(null);

const shopConfig = reactive({
    name: '',
    address: '',
    bank_code: '',
    bank_account: '',
    telegram_chat_id: ''
});

const newProd = reactive({
    name: '',
    price: '',
    productCode: '',
    image: null
});

const handleFileUpload = (e) => {
    newProd.image = e.target.files[0];
};

const updateShopInfo = async () => {
    if (!myShopId.value) return;
    submittingConfig.value = true;
    try {
        await axios.put(`${API_BASE_URL}/api/shops/${myShopId.value}`, shopConfig);
        alert("Cập nhật thông tin Shop thành công!");
        showConfig.value = false;
        fetchOrders(); // Refresh data
    } catch (e) {
        alert("Lỗi khi cập nhật Shop: " + (e.response?.data?.message || e.message));
    } finally {
        submittingConfig.value = false;
    }
};

const addProduct = async () => {
    if (!myShopId.value) return alert("Không tìm thấy thông tin Shop của bạn.");
    
    submitting.value = true;
    try {
        const formData = new FormData();
        formData.append('shopId', myShopId.value);
        formData.append('name', newProd.name);
        formData.append('price', newProd.price);
        formData.append('productCode', newProd.productCode);
        if (newProd.image) formData.append('image', newProd.image);

        const res = await axios.post(`${API_BASE_URL}/api/products`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.success) {
            // Trigger bot notification
            botBus.emit('notify', {
                message: `🤖 Bot: Chúc mừng! Món "${newProd.name}" đã được thêm thành công vào shop của bạn. Giờ đây khách hàng có thể tìm thấy món này rồi!`
            });
            
            // Reset Form
            newProd.name = '';
            newProd.price = '';
            newProd.productCode = '';
            newProd.image = null;
            showAddProduct.value = false;
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi khi thêm sản phẩm: " + (e.response?.data?.message || e.message));
    } finally {
        submitting.value = false;
    }
};

const getImageUrl = (url) => {
    if (!url) return `${API_BASE_URL}/uploads/anhdaidienmacdinh.jpg`;
    if (url.startsWith('http')) {
        return url.replace('http://localhost:3000', API_BASE_URL);
    }
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return `${API_BASE_URL}/uploads/${url}`;
};

const fetchOrders = async () => {
    try {
        const shopsRes = await axios.get(`${API_BASE_URL}/api/shops`);
        const myShop = shopsRes.data.find(s => s.user_id === auth.user.id);
        
        if (myShop) {
             myShopId.value = myShop.id;
             // Populate config
             shopConfig.name = myShop.name;
             shopConfig.address = myShop.address;
             shopConfig.bank_code = myShop.bank_code;
             shopConfig.bank_account = myShop.bank_account;
             shopConfig.telegram_chat_id = myShop.telegram_chat_id;

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

    socket.on('connect', () => {
        console.log("✅ Socket connected with ID:", socket.id);
        if (myShopId.value) {
            socket.emit('join_room', `shop_${myShopId.value}`);
            console.log(`- Rejoined room: shop_${myShopId.value}`);
        }
    });

    socket.on('new_order', (data) => {
        alert("Có đơn hàng mới!");
        fetchOrders(); 
    });

    socket.on('bot_notification', (data) => {
        console.log("📩 Received bot notification:", data);
        botBus.emit('notify', {
            message: data.message
        });
    });

    socket.on('connect_error', (err) => {
        console.error("❌ Socket connection error:", err.message);
    });
});

const simulateRefund = async (order) => {
    try {
        const res = await axios.post(`${API_BASE_URL}/api/test/simulate-refund`, {
            orderId: order.id,
            shopId: myShopId.value,
            amount: order.total_price,
            customerName: order.user_name,
            // Thêm thông tin ngân hàng của khách
            bankCode: order.customer_bank_code,
            bankAccount: order.customer_bank_account,
            bankName: order.customer_bank_name
        });
        alert(res.data.message);
    } catch (e) {
        alert("Lỗi mô phỏng hoàn tiền");
    }
};
</script>