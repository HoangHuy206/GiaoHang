<script setup>
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';
import { computed } from 'vue';
import CartDrawer from './components/CartDrawer.vue';
import AI from './AI/AI.vue';
import Toast from './components/Toast.vue';
import { cartBus } from './utils/cartBus';
import { useToastStore } from './stores/toast';

const auth = useAuthStore();
const router = useRouter();
const toast = useToastStore();

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
  <div class="min-h-screen bg-gray-50 m-0 p-0 overflow-x-hidden">
    <main>
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <!-- Global Components -->
    <CartDrawer />
    <AI v-if="!auth.user || auth.user.role === 'user' || auth.user.role === 'shop'" />
    <Toast />
  </div>
</template>


<style>
body, html {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  scroll-behavior: smooth;
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