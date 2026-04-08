<template>
  <div class="profile-page-wrapper animate-fade-in">
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
            <label class="block text-sm font-medium text-gray-700">Địa chỉ Email</label>
            <input v-model="user.email" type="email" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700">Số điện thoại</label>
            <input v-model="user.phone" type="tel" class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500">
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

      <!-- Address Book Section -->
      <div class="mt-12" v-if="user.role === 'user'">
          <div class="flex justify-between items-center mb-4">
              <h3 class="text-xl font-bold">Sổ Địa Chỉ 📍</h3>
              <button @click="showAddAddress = true" class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold hover:bg-green-200">+ Thêm mới</button>
          </div>

          <div v-if="savedAddresses.length === 0" class="text-gray-500 italic p-4 bg-gray-50 rounded-lg border-dashed border-2">Chưa lưu địa chỉ nào.</div>
          <div v-else class="space-y-3">
              <div v-for="(addr, index) in savedAddresses" :key="index" class="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm">
                  <div>
                      <div class="flex items-center gap-2">
                          <span class="font-bold text-gray-800">{{ addr.label }}</span>
                          <span v-if="addr.is_default" class="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded">Mặc định</span>
                      </div>
                      <p class="text-sm text-gray-600 truncate max-w-xs">{{ addr.address }}</p>
                  </div>
                  <button @click="deleteAddress(index)" class="text-red-500 hover:text-red-700 p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
              </div>
          </div>
      </div>

      <!-- Favorites Section -->
      <div class="mt-12" v-if="user.role === 'user'">
          <h3 class="text-xl font-bold mb-4">Quán Ăn Yêu Thích ❤️</h3>
          <div v-if="favorites.length === 0" class="text-gray-500 italic">Chưa có quán yêu thích.</div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="shop in favorites" :key="shop.id" class="border rounded-lg overflow-hidden shadow-sm bg-white relative">
                  <div class="p-4">
                      <h4 class="font-bold">{{ shop.name }}</h4>
                      <router-link :to="'/restaurant/' + shop.id" class="text-sm text-green-600">Xem Menu</router-link>
                  </div>
              </div>
          </div>
      </div>
    </div>

    <!-- Add Address Modal -->
    <div v-if="showAddAddress" class="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4">
        <div class="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h4 class="text-lg font-bold mb-4">Thêm Địa Chỉ Mới</h4>
            <div class="space-y-4">
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase">Tên gợi nhớ</label>
                    <input v-model="newAddr.label" type="text" class="mt-1 block w-full border rounded-md p-2">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase">Địa chỉ chi tiết</label>
                    <textarea v-model="newAddr.address" rows="2" class="mt-1 block w-full border rounded-md p-2"></textarea>
                </div>
                <div class="flex gap-2">
                    <button @click="saveNewAddress" class="flex-1 bg-green-600 text-white py-2 rounded-md font-bold">Lưu</button>
                    <button @click="showAddAddress = false" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md font-bold">Hủy</button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { useConfirmStore } from '../stores/confirm';
import StandardHeader from '../components/StandardHeader.vue';
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const auth = useAuthStore();
const toast = useToastStore();
const confirmStore = useConfirmStore();
const user = ref({ ...auth.user });
const orders = ref([]);
const favorites = ref([]);
const fileInput = ref(null);

const savedAddresses = ref([]);
const showAddAddress = ref(false);
const newAddr = ref({ label: '', address: '', lat: 0, lng: 0, is_default: false });

const fetchAddresses = async () => {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/user/addresses`);
        savedAddresses.value = res.data;
    } catch (e) { console.error(e); }
};

const saveNewAddress = async () => {
    if (!newAddr.value.label || !newAddr.value.address) return toast.warning("Nhập đủ!");
    try {
        const res = await axios.post(`${API_BASE_URL}/api/user/addresses`, newAddr.value);
        savedAddresses.value = res.data.addresses;
        showAddAddress.value = false;
        newAddr.value = { label: '', address: '', lat: 0, lng: 0, is_default: false };
        toast.success("Đã lưu!");
    } catch (e) { toast.error("Lỗi!"); }
};

const deleteAddress = async (index) => {
    const ok = await confirmStore.ask("Xóa?");
    if (!ok) return;
    try {
        const res = await axios.delete(`${API_BASE_URL}/api/user/addresses/${index}`);
        savedAddresses.value = res.data.addresses;
        toast.success("Xóa xong!");
    } catch (e) { toast.error("Lỗi!"); }
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
    try {
        const res = await axios.put(`${API_BASE_URL}/api/users/${user.value.id}`, formData);
        if (res.data.success) {
            auth.user = res.data.user;
            localStorage.setItem('user', JSON.stringify(res.data.user));
            toast.success("Xong!");
        }
    } catch (e) { toast.error("Lỗi!"); }
};

const updateProfile = async () => {
    try {
        const res = await axios.put(`${API_BASE_URL}/api/users/${user.value.id}`, user.value);
        if (res.data.success) {
            auth.user = res.data.user;
            localStorage.setItem('user', JSON.stringify(res.data.user));
            toast.success("Xong!");
        }
    } catch (e) { toast.error("Lỗi!"); }
};

onMounted(async () => {
    if (auth.user) {
        fetchAddresses();
        try {
            const resOrders = await axios.get(`${API_BASE_URL}/api/orders?role=${auth.user.role}&userId=${auth.user.id}`);
            orders.value = resOrders.data;
            const resFav = await axios.get(`${API_BASE_URL}/api/like/${auth.user.id}`);
            favorites.value = resFav.data;
        } catch (e) { console.error(e); }
    }
});
</script>

<style scoped>
/* Thêm style nếu cần */
</style>