<template>
  <div v-if="shop">
    <div class="bg-green-100 p-8 rounded-xl mb-8 flex flex-col md:flex-row items-center md:justify-between">
        <div>
            <h2 class="text-4xl font-bold text-green-800 mb-2">{{ shop.name }}</h2>
            <p class="text-green-600">Thưởng thức món ngon ngay tại nhà</p>
        </div>
        <div class="mt-4 md:mt-0">
             <span class="bg-white px-4 py-2 rounded-full shadow text-sm font-bold text-green-700">Uy tín & Chất lượng</span>
        </div>
    </div>

    <!-- Search Products -->
    <div class="mb-6">
         <input v-model="searchQuery" type="text" placeholder="Tìm kiếm món ăn..." class="w-full p-3 rounded-lg border border-gray-300 focus:ring-green-500 focus:border-green-500">
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
      <div v-for="product in filteredProducts" :key="product.id" class="bg-white p-4 rounded-xl shadow border border-gray-100 flex justify-between items-center group hover:border-green-400 transition">
        <img :src="product.image_url" alt="" class="w-20 h-20 rounded-lg object-cover mr-4 shadow-sm bg-gray-200">
        <div class="flex-1">
            <h3 class="font-bold text-lg text-gray-800 group-hover:text-green-700 transition">{{ product.name }}</h3>
            <p class="text-red-500 font-bold mt-1">{{ formatPrice(product.price) }}</p>
        </div>
        <button @click="addToCart(product)" class="bg-green-500 hover:bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition">
            <span class="text-2xl font-bold">+</span>
        </button>
      </div>
    </div>

  </div>
  <div v-else class="text-center py-10">
      Loading...
  </div>
</template>

<style scoped>
.animate-slide-up {
    animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}
</style>


<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { cartBus } from '../utils/cartBus';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const shop = ref(null);
const products = ref([]);
const searchQuery = ref('');

onMounted(async () => {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/shops/${route.params.id}`);
        shop.value = res.data;
        products.value = res.data.products;
    } catch (error) {
        console.error(error);
    }
});

const filteredProducts = computed(() => {
    if (!products.value) return [];
    return products.value.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'k';
};

const addToCart = (product) => {
    if (!auth.user) {
        if(confirm("Bạn cần đăng nhập để mua hàng. Chuyển đến trang đăng nhập?")) {
            router.push('/login');
        }
        return;
    }

    if (auth.user.role === 'driver' || auth.user.role === 'shop') {
        alert("Tài khoản của bạn không thể đặt hàng. Chỉ tài khoản Khách hàng (User) mới được phép đặt món.");
        return;
    }

    // Use event bus for new CartDrawer
    cartBus.emit('add-to-cart', { ...product, shopId: shop.value.id });
};
</script>
