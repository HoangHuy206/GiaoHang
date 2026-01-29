<template>
  <StandardHeader />
  <div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border-t-4 border-green-500 mt-8 mb-8">
    <h2 class="text-3xl font-bold text-green-800 mb-8 text-center">Hồ Sơ Của Bạn</h2>

    <div class="flex flex-col items-center mb-8">
        <div class="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-green-100 relative">
             <img v-if="user.avatar_url" :src="getAvatarUrl(user.avatar_url)" alt="Avatar" class="w-full h-full object-cover">
             <span v-else class="text-4xl">👤</span>
        </div>
        <input type="file" ref="fileInput" @change="handleFileChange" accept="image/*" class="hidden">
        <button type="button" @click="$refs.fileInput.click()" class="text-sm text-green-600 font-bold hover:underline">Đổi Avatar</button>
    </div>

    <form @submit.prevent="updateProfile" class="space-y-6">
        <div>
            <label class="block text-sm font-medium text-gray-700">Họ và tên</label>
            <input v-model="user.full_name" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Địa chỉ Email (Để nhận thông báo đơn hàng)</label>
            <input v-model="user.email" type="email" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500" placeholder="example@gmail.com">
        </div>
        <div>
             <label class="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
             <input :value="user.username" disabled type="text" class="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm py-2 px-3">
        </div>
        <div v-if="user.role === 'user'">
            <label class="block text-sm font-medium text-gray-700">Địa chỉ mặc định</label>
            <input v-model="user.address" type="text" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
        </div>
        
        <button type="submit" class="w-full bg-green-600 text-white py-2 px-4 rounded-md font-bold hover:bg-green-700">Lưu Thay Đổi</button>
    </form>

    <!-- Favorite Restaurants Section -->
    <div class="mt-12" v-if="user.role === 'user'">
        <h3 class="text-xl font-bold mb-4">Quán Ăn Yêu Thích ❤️</h3>
        <div v-if="favorites.length === 0" class="text-gray-500 italic">Chưa có quán yêu thích nào.</div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-for="shop in favorites" :key="shop.id" class="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition bg-white relative group">
                <div class="h-32 bg-gray-100">
                    <img :src="shop.image_url" class="w-full h-full object-cover" alt="Shop Image">
                </div>
                <div class="p-4">
                    <h4 class="font-bold text-gray-800">{{ shop.name }}</h4>
                    <router-link :to="'/restaurant/' + shop.id" class="text-sm text-green-600 hover:underline mt-1 inline-block">Xem Menu</router-link>
                </div>
                <button @click="unlike(shop.id)" class="absolute top-2 right-2 bg-white rounded-full p-1 shadow hover:bg-red-50 text-red-500" title="Bỏ thích">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"></path></svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Simple Order History for User -->
    <div class="mt-12" v-if="user.role === 'user'">
        <h3 class="text-xl font-bold mb-4">Lịch Sử Đơn Hàng</h3>
        <div v-if="orders.length === 0" class="text-gray-500">Chưa có đơn hàng nào.</div>
        <div v-else class="space-y-4">
            <div v-for="order in orders" :key="order.id" class="border p-4 rounded-lg bg-gray-50">
                <div class="flex justify-between font-bold">
                    <span>Đơn #{{ order.id }} - {{ order.shop_name }}</span>
                    <span :class="getStatusColor(order.status)">{{ formatStatus(order.status) }}</span>
                </div>
                <div class="text-sm text-gray-600 mt-1">Tổng: {{ formatPrice(order.total_price) }}</div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';
import StandardHeader from '../components/StandardHeader.vue';
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// Import images for consistent display with Food.vue
import comngon from '@/assets/img/anhND/comngon.jpg'
import lotte from '@/assets/img/anhND/lotte.jpg'
import comtho from '@/assets/img/anhND/comtho.jpg'
import gaham from '@/assets/img/anhND/gaham.jpg'
import toco from '@/assets/img/anhND/toco.jpg'
import buncham from '@/assets/img/anhND/buncham.jpg'
import mixue from '@/assets/img/anhND/mixue.jpg'

const localShopImages = {
    1: comngon,
    2: lotte,
    3: comtho,
    4: gaham,
    5: toco,
    6: buncham,
    7: mixue
};

const auth = useAuthStore();
const user = ref({ ...auth.user });
const orders = ref([]);
const favorites = ref([]);
const fileInput = ref(null);

const getAvatarUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) {
        return path.replace('http://localhost:3000', API_BASE_URL);
    }
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Immediately upload avatar for better UX
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('full_name', user.value.full_name || ''); // Send current name/addr to avoid clearing
    formData.append('address', user.value.address || '');
    formData.append('email', user.value.email || '');

    try {
        const res = await axios.put(`${API_BASE_URL}/api/users/${user.value.id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        
        if (res.data.success) {
            user.value = res.data.user;
            // Update store
            auth.user = res.data.user;
            localStorage.setItem('user', JSON.stringify(res.data.user));
            alert("Đổi avatar thành công!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi khi tải ảnh lên: " + (e.response?.data?.error || e.message));
    }
};

const updateProfile = async () => {
    try {
        const payload = {
            full_name: user.value.full_name || '',
            address: user.value.address || '',
            email: user.value.email || ''
        };

        const res = await axios.put(`${API_BASE_URL}/api/users/${user.value.id}`, payload);

        if (res.data.success) {
             user.value = res.data.user;
             auth.user = res.data.user;
             localStorage.setItem('user', JSON.stringify(res.data.user));
             alert("Cập nhật hồ sơ thành công!");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi cập nhật: " + (e.response?.data?.error || e.message));
    }
};

const formatPrice = (price) => new Intl.NumberFormat('vi-VN').format(price) + 'k';

const getStatusColor = (status) => {
    const colors = {
        pending: 'text-yellow-600',
        finding_driver: 'text-blue-600',
        picked_up: 'text-purple-600',
        delivered: 'text-green-600'
    };
    return colors[status] || 'text-gray-600';
};

const formatStatus = (status) => {
    const map = {
        pending: 'Chờ quán xác nhận',
        finding_driver: 'Đang tìm tài xế',
        driver_assigned: 'Tài xế đang đến shop',
        picked_up: 'Tài xế đang giao',
        delivered: 'Giao hàng thành công',
        cancelled: 'Đã hủy'
    };
    return map[status] || status;
};

const unlike = async (shopId) => {
    if (!confirm('Bạn muốn bỏ yêu thích quán này?')) return;
    try {
        await axios.post(`${API_BASE_URL}/api/like`, {
            maNguoiDung: user.value.id,
            maQuan: shopId
        });
        // Remove from list
        favorites.value = favorites.value.filter(f => f.id !== shopId);
    } catch (e) {
        alert("Lỗi: " + e.message);
    }
};

onMounted(async () => {
    if (auth.user) {
        try {
            // Load Orders
            const resOrders = await axios.get(`${API_BASE_URL}/api/orders?role=${auth.user.role}&userId=${auth.user.id}`);
            orders.value = resOrders.data;

            // Load Favorites
            const resFav = await axios.get(`${API_BASE_URL}/api/like/${auth.user.id}`);
            favorites.value = resFav.data.map(shop => ({
                ...shop,
                // Override image if local mapping exists
                image_url: localShopImages[shop.id] || shop.image_url
            }));
        } catch (e) {
            console.error(e);
        }
    }
});
</script>
