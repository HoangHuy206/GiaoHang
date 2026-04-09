<script setup>
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';
import { computed, onMounted, ref } from 'vue';
import CartDrawer from './components/CartDrawer.vue';
import AI from './AI/AI.vue';
import Toast from './components/Toast.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import { cartBus } from './utils/cartBus';
import { useToastStore } from './stores/toast';

// Logo Path
const logoUrl = new URL('./assets/img/anh.logo/logo.jpg', import.meta.url).href;

const auth = useAuthStore();
const router = useRouter();
const toast = useToastStore();
const isSplashing = ref(true);

onMounted(async () => {
  // Tự động tắt Splash Screen sau 2 giây
  setTimeout(() => {
    isSplashing.value = false;
  }, 2000);
});

const homeLink = computed(() => {
  if (!auth.user) return '/';
  if (auth.user.role === 'driver') return '/trangchutaixe';
  if (auth.user.role === 'shop') return '/shop-admin';
  return '/food';
});

const logout = () => {
  auth.logout();
  toast.success('Đã đăng xuất thành công!');
  router.push('/login');
};

const openCart = () => {
  cartBus.emit('open-cart');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 m-0 p-0 overflow-x-hidden relative">
    <!-- Splash Screen -->
    <transition name="splash-fade">
      <div v-if="isSplashing" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
        <div class="splash-logo-container relative">
          <img :src="logoUrl" alt="Logo" class="w-32 h-32 rounded-full shadow-2xl animate-logo-pop" />
          <div class="absolute -inset-4 rounded-full border-2 border-orange-500/20 animate-ping"></div>
        </div>
        <div class="mt-8 flex flex-col items-center">
          <h1 class="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent animate-fade-in-up">
            Giao Hàng Tận Nơi
          </h1>
          <p class="text-gray-400 text-sm mt-2 tracking-[0.2em] uppercase animate-pulse">
            Đang khởi tạo...
          </p>
        </div>
      </div>
    </transition>

    <main v-show="!isSplashing">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <!-- Global Components -->
    <CartDrawer v-if="!isSplashing" />
    <AI v-if="!isSplashing && (!auth.user || auth.user.role === 'user' || auth.user.role === 'shop') && !['/login', '/dangky', '/dangkytaixe', '/hoidangky'].includes(router.currentRoute.value.path) && router.currentRoute.value.name !== 'PageNotFound'" />
    <Toast />
    <ConfirmModal />
  </div>
</template>


<style>
body, html {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  scroll-behavior: smooth;
}

/* Splash Animations */
.splash-fade-leave-active {
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.splash-fade-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

@keyframes logoPop {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-logo-pop {
  animation: logoPop 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s ease-out 0.5s both;
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Common Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out forwards;
}

.animate-slide-up {
  animation: slideUp 0.5s ease-out forwards;
}
</style>