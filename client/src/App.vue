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
    <main>
      <router-view />
    </main>
    <!-- Add CartDrawer here so it exists globally -->
    <CartDrawer />
  </div>
</template>


<style>
body, html {
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}
</style>