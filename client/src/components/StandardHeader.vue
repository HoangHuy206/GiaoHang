<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { cartBus } from '../utils/cartBus';
import { API_BASE_URL } from '../config';

const props = defineProps({
  showMenuButton: { type: Boolean, default: true } // Default to true to show menu on mobile
});

const emit = defineEmits(['toggle-menu']);

const auth = useAuthStore();
const cart = useCartStore();
const router = useRouter();
const isMobileMenuOpen = ref(false); // Local state for mobile menu
const currentLang = ref('vi');
const isTranslating = ref(false);

const itemCount = computed(() => cart.itemCount);

onMounted(() => {
  // Khởi tạo script Google Translate
  if (!window.googleTranslateElementInit) {
    window.googleTranslateElementInit = () => {
      new window.google.translate.TranslateElement({
        pageLanguage: 'vi',
        includedLanguages: 'en,vi,zh-CN,ja,ko',
        autoDisplay: false
      }, 'google_translate_element');
    };
    
    const script = document.createElement('script');
    script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(script);
  }

  // Đọc trạng thái ngôn ngữ hiện tại từ cookie nếu có
  const match = document.cookie.match(/googtrans=\/vi\/(.+)/);
  if (match) currentLang.value = match[1];

  // Cơ chế "Dọn dẹp" tự động để xóa bỏ thanh Toolbar cứng đầu
  const cleanup = setInterval(() => {
    const banner = document.querySelector('.goog-te-banner-frame');
    if (banner) {
      banner.style.display = 'none';
      document.body.style.top = '0px';
    }
    // Nếu trang đã dịch rồi, dừng kiểm tra sau 5 giây để tiết kiệm pin
  }, 500);
  setTimeout(() => clearInterval(cleanup), 5000);
});

const toggleLanguage = () => {
  const newLang = currentLang.value === 'vi' ? 'en' : 'vi';
  
  // 1. Ghi đè cookie của Google Translate
  document.cookie = `googtrans=/vi/${newLang}; path=/`;
  document.cookie = `googtrans=/vi/${newLang}; domain=${window.location.hostname}; path=/`;
  
  // 2. Cố gắng kích hoạt combo ngầm
  const combo = document.querySelector('.goog-te-combo');
  if (combo) {
    combo.value = newLang;
    combo.dispatchEvent(new Event('change'));
    currentLang.value = newLang;
  } else {
    // Nếu không tìm thấy combo, làm mới trang để áp dụng cookie mới
    location.reload();
  }
};

const homeLink = computed(() => {
  if (!auth.user) return '/';
  if (auth.user.role === 'driver') return '/trangchutaixe';
  if (auth.user.role === 'shop') return '/shop-admin';
  if (auth.user.role === 'admin') return '/admin';
  return '/food';
});

const isDriver = computed(() => auth.user?.role === 'driver');

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
  emit('toggle-menu'); // Keep emitting for parents that use it (like Food.vue)
};

const logout = () => {
  auth.logout();
  router.push('/login');
};

const openCart = () => {
  cartBus.emit('open-cart');
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
</script>

<template>
  <header class="unified-header">
    <div class="header-inner">
      <div class="header-left">
        <!-- Nút menu hamburger -->
        <button class="menu-btn md:hidden" @click="toggleMobileMenu">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

      <!-- Desktop Nav -->
      <nav class="header-nav hidden md:flex" v-if="!isDriver">
        <router-link :to="homeLink" class="nav-link">Trang chủ</router-link>
        
        <template v-if="!auth.user || auth.user.role === 'user'">
          <router-link to="/food" class="nav-link">Đặt món</router-link>
          <router-link to="/theodoidonhang" class="nav-link" v-if="auth.user">Đơn hàng</router-link>
          <router-link to="/hotro" class="nav-link">Hỗ Trợ</router-link>
        </template>

        <template v-else-if="auth.user.role === 'shop'">
          <router-link to="/shop-stats" class="nav-link">Thống kê</router-link>
        </template>

        <template v-else-if="auth.user.role === 'admin'">
          <router-link to="/admin" class="nav-link">Quản trị Shop</router-link>
        </template>
      </nav>

      <div class="header-right">
        <!-- Nút dịch -->
        <button @click="toggleLanguage" class="lang-toggle-btn notranslate" :title="currentLang === 'vi' ? 'Switch to English' : 'Chuyển sang Tiếng Việt'">
          <span class="lang-icon">🌐</span>
          <span class="lang-text hidden sm:inline">{{ currentLang === 'vi' ? 'VI' : 'EN' }}</span>
        </button>
        <div id="google_translate_element"></div>

        <template v-if="!auth.user">
          <router-link to="/login" class="auth-link">Đăng nhập</router-link>
          <router-link to="/hoidangky" class="auth-btn">Đăng ký</router-link>
        </template>
        <template v-else>
          <div class="user-info">
            <button v-if="auth.user.role === 'user'" @click="openCart" class="icon-btn cart-icon-wrapper" title="Giỏ hàng">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <!-- Cart Badge -->
              <span v-if="itemCount > 0" :key="itemCount" class="cart-badge">{{ itemCount }}</span>
            </button>
            
            <router-link to="/profile" class="profile-link">
              <span class="user-name">{{ (auth.user?.full_name || auth.user?.username) || 'Người dùng' }}</span>
              <div class="avatar-circle">
                <img v-if="auth.user?.avatar_url" :src="getAvatarUrl(auth.user.avatar_url)" alt="AVT" class="avatar-img" @error="e => e.target.style.display='none'">
                <span v-else>{{ (auth.user?.full_name || auth.user?.username || 'U').charAt(0).toUpperCase() }}</span>
              </div>
            </router-link>
            
            <button @click="logout" class="logout-btn hidden md:block">Đăng xuất</button>
          </div>
        </template>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <div v-if="isMobileMenuOpen && !isDriver" class="absolute top-full left-0 w-full bg-white shadow-lg border-t z-50 flex flex-col p-4 md:hidden">
        <router-link :to="homeLink" class="mobile-link" @click="isMobileMenuOpen = false">Trang chủ</router-link>
        
        <template v-if="!auth.user || auth.user.role === 'user'">
          <router-link to="/food" class="mobile-link" @click="isMobileMenuOpen = false">Đặt món</router-link>
          <router-link to="/theodoidonhang" class="mobile-link" v-if="auth.user" @click="isMobileMenuOpen = false">Đơn hàng</router-link>
          <router-link to="/hotro" class="mobile-link" @click="isMobileMenuOpen = false">Hỗ Trợ</router-link>
        </template>

        <template v-else-if="auth.user.role === 'shop'">
          <router-link to="/shop-stats" class="mobile-link" @click="isMobileMenuOpen = false">Thống kê</router-link>
        </template>

        <template v-else-if="auth.user.role === 'admin'">
          <router-link to="/admin" class="mobile-link" @click="isMobileMenuOpen = false">Quản trị Shop</router-link>
        </template>

        <button @click="logout" class="mobile-link text-red-500 border-t mt-2 pt-2">Đăng xuất</button>
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
.logo-img { height: clamp(60px, 8vw, 85px); width: auto; object-fit: contain; }
.logo-name { font-weight: 800; font-size: clamp(14px, 2vw, 18px); color: #2c7a3f; text-transform: uppercase; letter-spacing: 0.5px; }

.header-nav { display: flex; gap: clamp(10px, 2vw, 25px); }
.nav-link { text-decoration: none; color: #333; font-weight: 600; font-size: clamp(13px, 1.5vw, 15px); transition: 0.2s; }
.nav-link:hover { color: #2c7a3f; }

.header-right { display: flex; align-items: center; gap: clamp(8px, 2vw, 15px); }
.auth-link { text-decoration: none; color: #333; font-weight: 600; font-size: clamp(23px, 2.5vw, 20px); }
.auth-btn { text-decoration: none; background: #2c7a3f; color: white; padding: 6px clamp(12px, 2vw, 18px); border-radius: 8px; font-weight: bold; font-size: clamp(12px, 1.5vw, 14px); transition: 0.2s; }
.auth-btn:hover { background: #246332; }

.lang-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.6);
  border: 1px solid #2c7a3f;
  padding: 5px 10px;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 700;
  color: #2c7a3f;
  transition: 0.3s;
  font-size: 13px;
}
.lang-toggle-btn:hover {
  background: #2c7a3f;
  color: white;
}
.lang-icon { font-size: 16px; }

.user-info { display: flex; align-items: center; gap: clamp(10px, 2vw, 20px); }
.cart-icon-wrapper { position: relative; }
.cart-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #ff4757;
  color: white;
  font-size: 10px;
  font-weight: bold;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #9EF3C0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  0% { transform: scale(0); }
  100% { transform: scale(1); }
}

.icon-btn { background: none; border: none; cursor: pointer; color: #333; transition: 0.2s; display: flex; align-items: center; }
.icon-btn:hover { color: #2c7a3f; }
.profile-link { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #333; background: rgba(255,255,255,0.4); padding: 4px clamp(8px, 1.5vw, 12px); border-radius: 20px; }
.user-name { font-weight: 600; font-size: 13px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.avatar-circle { width: 28px; height: 28px; background: #2c7a3f; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; overflow: hidden; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
.logout-btn { background: #ff4757; color: white; border: none; padding: 6px clamp(10px, 1.5vw, 15px); border-radius: 8px; cursor: pointer; font-weight: bold; font-size: clamp(11px, 1.2vw, 13px); transition: 0.2s; }
.logout-btn:hover { background: #ff2e44; }

.mobile-link {
  display: block;
  padding: 12px 0;
  font-weight: 600;
  color: #333;
  text-decoration: none;
  border-bottom: 1px solid #f0f0f0;
}
.mobile-link:last-child { border-bottom: none; }

@media (max-width: 768px) {
  .header-nav { display: none; }
  .logo-name { display: none; }
}

@media (max-width: 480px) {
  .user-name { display: none; }
}
</style>