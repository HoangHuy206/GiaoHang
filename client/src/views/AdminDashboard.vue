<template>
  <div class="admin-dashboard-wrapper animate-fade-in">
    <StandardHeader v-if="!selectedShop" />
    <div class="container mx-auto p-4 mt-4">
      <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-red-800">Quản Trị Hệ Thống (Admin)</h1>
          <div class="text-sm bg-gray-100 p-2 rounded border">
              Chào, <b>{{ auth.user?.full_name || auth.user?.username }}</b> (Admin)
          </div>
      </div>
  
      <div v-if="loading" class="text-center py-10">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto"></div>
          <p class="mt-4 text-gray-600">Đang tải danh sách Shop...</p>
      </div>

    <div v-else>
        <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th class="p-4 font-bold text-gray-700">ID</th>
                            <th class="p-4 font-bold text-gray-700">Shop / Hình ảnh</th>
                            <th class="p-4 font-bold text-gray-700">Địa chỉ</th>
                            <th class="p-4 font-bold text-gray-700">Thông tin Chủ Shop</th>
                            <th class="p-4 font-bold text-gray-700">Thanh Toán</th>
                            <th class="p-4 font-bold text-gray-700">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="shop in shops" :key="shop.id" class="border-b border-gray-100 hover:bg-gray-50 transition">
                            <td class="p-4 text-gray-600 font-mono">#{{ shop.id }}</td>
                            <td class="p-4">
                                <div class="flex items-center gap-3 cursor-pointer group" @click="showShopDetail(shop)">
                                    <div class="relative">
                                        <img :src="getImageUrl(shop.image_url)" class="w-12 h-12 rounded-lg object-cover border border-gray-200 group-hover:opacity-80 transition" />
                                        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                            <span class="bg-black/50 text-white text-[10px] px-1 rounded">Xem</span>
                                        </div>
                                    </div>
                                    <div class="font-bold text-gray-800 group-hover:text-blue-600 transition">{{ shop.name }}</div>
                                </div>
                            </td>
                            <td class="p-4 text-sm text-gray-600 max-w-xs">{{ shop.address }}</td>
                            <td class="p-4">
                                <div class="text-sm">
                                    <div class="font-bold text-blue-700">👤 {{ shop.owner_name || 'N/A' }}</div>
                                    <div class="text-gray-500 italic">(@{{ shop.owner_username }})</div>
                                </div>
                            </td>
                            <td class="p-4">
                                <div class="text-xs space-y-1">
                                    <div class="bg-green-50 text-green-700 px-2 py-1 rounded inline-block font-mono">
                                        🏦 {{ shop.bank_code }}: {{ shop.bank_account }}
                                    </div>
                                </div>
                            </td>
                            <td class="p-4">
                                <button @click="confirmDelete(shop)" class="bg-red-100 text-red-600 px-3 py-1 rounded-lg hover:bg-red-600 hover:text-white transition shadow-sm text-sm" title="Xóa Shop">
                                    🗑️ Xóa
                                </button>
                            </td>
                        </tr>
                        <tr v-if="shops.length === 0">
                            <td colspan="6" class="p-10 text-center text-gray-500 italic">Chưa có Shop nào trong hệ thống.</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    </div>

    <!-- Shop Detail Modal -->
    <div v-if="selectedShop" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200">
            <div class="relative h-48">
                <img :src="getImageUrl(selectedShop.image_url)" class="w-full h-full object-cover" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                    <h2 class="text-2xl font-bold text-white">{{ selectedShop.name }}</h2>
                </div>
                <button @click="selectedShop = null" class="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white w-8 h-8 rounded-full flex items-center justify-center text-xl backdrop-blur-md transition">
                    &times;
                </button>
            </div>
            
            <div class="p-6 space-y-6">
                <div class="grid grid-cols-2 gap-6">
                    <div class="space-y-1">
                        <p class="text-xs text-gray-400 uppercase font-bold tracking-wider">Ngày đăng ký</p>
                        <p class="font-semibold text-gray-800">{{ formatDate(selectedShop.registration_date) }}</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs text-gray-400 uppercase font-bold tracking-wider">ID Hệ thống</p>
                        <p class="font-mono text-gray-800">#{{ selectedShop.id }}</p>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-gray-400 uppercase font-bold tracking-wider">Thông tin liên hệ chủ quán</p>
                    <div class="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <p class="font-bold text-blue-900">{{ selectedShop.owner_name }}</p>
                        <p class="text-sm text-blue-700">Username: @{{ selectedShop.owner_username }}</p>
                        <p class="text-sm text-blue-700 mt-1">📞 SĐT: <b>{{ selectedShop.owner_phone || 'Chưa cập nhật' }}</b></p>
                        <p class="text-sm text-blue-700">📧 Email: <b>{{ selectedShop.owner_email || 'Chưa cập nhật' }}</b></p>
                    </div>
                </div>

                <div class="space-y-1">
                    <p class="text-xs text-gray-400 uppercase font-bold tracking-wider">Địa chỉ kinh doanh</p>
                    <p class="text-sm text-gray-700 leading-relaxed">{{ selectedShop.address }}</p>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-green-50 p-3 rounded-xl border border-green-100">
                        <p class="text-[10px] text-green-600 uppercase font-bold">Ngân hàng</p>
                        <p class="font-bold text-green-800 text-lg">{{ selectedShop.bank_code }}</p>
                        <p class="font-mono text-green-700">{{ selectedShop.bank_account }}</p>
                    </div>
                    <div class="bg-purple-50 p-3 rounded-xl border border-purple-100">
                        <p class="text-[10px] text-purple-600 uppercase font-bold">Kết nối Telegram</p>
                        <p v-if="selectedShop.telegram_chat_id" class="font-mono font-bold text-purple-800 text-sm mt-1">ID: {{ selectedShop.telegram_chat_id }}</p>
                        <p v-else class="text-sm italic text-gray-400 mt-1">Chưa liên kết</p>
                    </div>
                </div>
            </div>

            <div class="p-4 bg-gray-50 flex justify-end">
                <button @click="selectedShop = null" class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition">Đóng</button>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import StandardHeader from '../components/StandardHeader.vue';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const auth = useAuthStore();
const toast = useToastStore();
const shops = ref([]);
const loading = ref(true);
const selectedShop = ref(null);

const fetchShops = async () => {
    loading.value = true;
    try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/shops?userId=${auth.user.id}`);
        shops.value = res.data;
    } catch (e) {
        console.error("Error fetching shops:", e);
        toast.error(e.response?.data?.error || "Lỗi khi tải danh sách Shop");
        if (e.response?.status === 403) {
            window.location.href = '/';
        }
    } finally {
        loading.value = false;
    }
};

const showShopDetail = (shop) => {
    selectedShop.value = shop;
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getImageUrl = (url) => {
    if (!url) return `${API_BASE_URL}/uploads/anhdaidienmacdinh.jpg`;
    if (url.startsWith('http')) return url.replace('http://localhost:3000', API_BASE_URL);
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return `${API_BASE_URL}/uploads/${url}`;
};

const confirmDelete = async (shop) => {
    if (confirm(`⚠️ CẢNH BÁO CỰC NGUY HIỂM!\n\nBạn có chắc chắn muốn XÓA VĨNH VIỄN Shop "${shop.name}" không?\n\nHành động này sẽ xóa sạch:\n- Thông tin Shop\n- Toàn bộ sản phẩm của Shop\n- Toàn bộ đơn hàng và tài khoản chủ quán.\n\nKHÔNG THỂ KHÔI PHỤC!`)) {
        try {
            await axios.delete(`${API_BASE_URL}/api/admin/shops/${shop.id}`, {
                data: { userId: auth.user.id }
            });
            toast.success(`Đã xóa thành công Shop "${shop.name}"`);
            fetchShops(); // Reload
        } catch (e) {
            console.error(e);
            toast.error("Lỗi khi xóa Shop: " + (e.response?.data?.error || e.message));
        }
    }
};

onMounted(() => {
    // Basic protection: check if user is admin AND has correct telegram ID
    if (auth.user?.role !== 'admin' || auth.user?.telegram_chat_id !== '5807941249') {
        toast.warning("Chỉ Admin chính chủ mới có quyền truy cập trang này!");
        window.location.href = '/';
        return;
    }
    fetchShops();
});
</script>

<style scoped>
.animate-in {
    animation: zoomIn 0.2s ease-out;
}
@keyframes zoomIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
}
</style>
