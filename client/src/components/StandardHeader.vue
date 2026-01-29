<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { cartBus } from '../utils/cartBus';

const props = defineProps({
  showMenuButton: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle-menu']);

const auth = useAuthStore();
const router = useRouter();

const homeLink = computed(() => {
  if (!auth.user) return '/';
  if (auth.user.role === 'driver') return '/trangchutaixe';
  if (auth.user.role === 'shop') return '/shop-admin';
  return '/food';
});

const isDriver = computed(() => auth.user?.role === 'driver');

const logout = () => {
  auth.logout();
  router.push('/login');
};

const openCart = () => {
  cartBus.emit('open-cart');
};
</script>

<template>
  <header class="unified-header">
    <div class="header-inner">
      <div class="header-left">
        <!-- Nút menu chỉ hiện nếu trang đó yêu cầu (như Home/Food) và không phải tài xế -->
        <button v-if="showMenuButton && !isDriver" class="menu-btn" @click="emit('toggle-menu')">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        
        <router-link :to="homeLink" class="logo-area">
          <img src="@/assets/img/anh.logo/anhnen.png" alt="Logo" class="logo-img">
          <span class="logo-name" v-if="!isDriver">Giao Hàng Tận Nơi</span>
        </router-link>
      </div>

      <nav class="header-nav" v-if="!isDriver">
        <router-link :to="homeLink" class="nav-link">Trang chủ</router-link>
        <router-link to="/food" class="nav-link">Đặt món</router-link>
        <router-link to="/theodoidonhang" class="nav-link" v-if="auth.user && auth.user.role === 'user'">Đơn hàng</router-link>
        <router-link to="/hotro" class="nav-link">Hỗ Trợ</router-link>
      </nav>

      <div class="header-right">
        <template v-if="!auth.user">
          <router-link to="/login" class="auth-link">Đăng nhập</router-link>
          <router-link to="/hoidangky" class="auth-btn">Đăng ký</router-link>
        </template>
        <template v-else>
          <div class="user-info">
            <button v-if="auth.user.role === 'user'" @click="openCart" class="icon-btn" title="Giỏ hàng">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </button>
            
            <router-link to="/profile" class="profile-link">
              <span class="user-name">{{ auth.user.full_name || auth.user.username }}</span>
              <div class="avatar-circle">
                {{ (auth.user.full_name || auth.user.username).charAt(0).toUpperCase() }}
              </div>
            </router-link>
            
            <button @click="logout" class="logout-btn">Đăng xuất</button>
          </div>
        </template>
      </div>
    </div>
  </header>
</template>

<style scoped>
.unified-header {
  width: 100%;
  height: 80px;
  background-color: #9EF3C0;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 100;
  position: relative;
}

.header-inner {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(10px, 3vw, 20px);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left { display: flex; align-items: center; gap: clamp(5px, 2vw, 15px); }
.menu-btn { background: none; border: none; cursor: pointer; color: #333; padding: 5px; display: flex; align-items: center; }
.logo-area { display: flex; align-items: center; gap: clamp(5px, 1.5vw, 10px); text-decoration: none; }
.logo-img { height: clamp(35px, 5vw, 50px); width: auto; object-fit: contain; }
.logo-name { font-weight: 800; font-size: clamp(14px, 2vw, 18px); color: #2c7a3f; text-transform: uppercase; letter-spacing: 0.5px; }

.header-nav { display: flex; gap: clamp(10px, 2vw, 25px); }
.nav-link { text-decoration: none; color: #333; font-weight: 600; font-size: clamp(13px, 1.5vw, 15px); transition: 0.2s; }
.nav-link:hover { color: #2c7a3f; }

.header-right { display: flex; align-items: center; gap: clamp(8px, 2vw, 15px); }
.auth-link { text-decoration: none; color: #333; font-weight: 600; font-size: clamp(13px, 1.5vw, 15px); }
.auth-btn { text-decoration: none; background: #2c7a3f; color: white; padding: 6px clamp(12px, 2vw, 18px); border-radius: 8px; font-weight: bold; font-size: clamp(12px, 1.5vw, 14px); transition: 0.2s; }
.auth-btn:hover { background: #246332; }

.user-info { display: flex; align-items: center; gap: clamp(10px, 2vw, 20px); }
.icon-btn { background: none; border: none; cursor: pointer; color: #333; transition: 0.2s; display: flex; align-items: center; }
.icon-btn:hover { color: #2c7a3f; }
.profile-link { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #333; background: rgba(255,255,255,0.4); padding: 4px clamp(8px, 1.5vw, 12px); border-radius: 20px; }
.user-name { font-weight: 600; font-size: 13px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.avatar-circle { width: 28px; height: 28px; background: #2c7a3f; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
.logout-btn { background: #ff4757; color: white; border: none; padding: 6px clamp(10px, 1.5vw, 15px); border-radius: 8px; cursor: pointer; font-weight: bold; font-size: clamp(11px, 1.2vw, 13px); transition: 0.2s; }
.logout-btn:hover { background: #ff2e44; }

@media (max-width: 768px) {
  .header-nav { display: none; }
  .logo-name { display: none; }
}

@media (max-width: 480px) {
  .user-name { display: none; }
}
</style>