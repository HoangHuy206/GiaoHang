<script setup>
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import CartDrawer from './components/CartDrawer.vue';
import { cartBus } from './utils/cartBus';

const auth = useAuthStore();
const router = useRouter();

const homeLink = computed(() => {
  if (!auth.user) return '/';
  if (auth.user.role === 'driver') return '/trangchutaixe';
  if (auth.user.role === 'shop') return '/shop-admin';
  return '/food';
});

const logout = () => {
  auth.logout();
  router.push('/login');
};

const openCart = () => {
  cartBus.emit('open-cart');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 m-0 p-0">
    <nav v-if="!['/food', '/'].includes($route.path)" class="bg-green-600 text-white shadow-md sticky top-0 z-[1000] h-[80px] flex items-center">
      <div class="container mx-auto px-6 flex justify-between items-center w-full">
        <router-link :to="homeLink" class="text-2xl font-bold flex items-center">
           Giao Hàng Tận Nơi
        </router-link>
        
        <div class="flex items-center gap-6">
          <router-link :to="homeLink" class="font-medium hover:text-green-200 transition">Trang chủ</router-link>
          
          <router-link v-if="!auth.user" to="/login" class="font-medium hover:text-green-200 transition">Đăng nhập</router-link>
          
          <template v-else>
             <div class="flex items-center gap-4">
               <span class="bg-green-700 px-3 py-1 rounded-full text-sm">Chào, {{ auth.user.full_name }}</span>
               
               <router-link v-if="auth.user.role === 'user'" to="/theodoidonhang" class="hover:text-green-200 transition">Đơn hàng</router-link>
               
               <button v-if="auth.user.role === 'user'" @click="openCart" class="hover:text-green-200 transition relative">
                 Giỏ hàng
               </button>
               
               <router-link to="/profile" class="hover:text-green-200 transition">Hồ sơ</router-link>
               
               <button @click="logout" class="bg-red-500 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-red-600 transition shadow-sm">
                 Đăng xuất
               </button>
             </div>
          </template>
        </div>
      </div>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>


<style>
body, html {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}
</style>