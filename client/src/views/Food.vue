<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'        
import { RouterLink } from 'vue-router'
import axios from 'axios' 
import { API_BASE_URL } from '../config'

const getImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url.replace('http://localhost:3000', API_BASE_URL);
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

// --- 2. IMPORT EVENT BUS TỪ GIỎ HÀNG (Mới thêm) ---
import { cartBus } from '@/utils/cartBus.js' 

import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const isMenuOpen = ref(false)
const activeTab = ref('nguoi-dung')
const searchQuery = ref('')

// Kiểm tra trạng thái đăng nhập
const isLoggedIn = computed(() => !!auth.user)

// --- LOGIC MỞ GIỎ HÀNG (Mới thêm) ---
const openCartPopup = () => {
  console.log("Đã bấm mở giỏ hàng");
  cartBus.emit('open-cart'); // Gửi tín hiệu sang App.vue -> GioHang.vue
}

// --- DỮ LIỆU MENU ---
const menuData = [
  {
    id: 've-grab',
    label: 'Về Grab',
    columns: [
      { title: 'Về chúng tôi', items: ['Câu chuyện của tài xế', 'Chúng tôi là ai', 'Sứ mệnh'] },
      { title: 'Tin tưởng & An toàn', items: ['Chính sách an toàn', 'Tiêu chuẩn cộng đồng'] }
    ]
  },
  {
    id: 'nguoi-dung',
    label: 'Người dùng',
    columns: [
      { title: 'Có gì mới?', items: ['Sự kiện nổi bật', 'Ưu đãi hấp dẫn'] },
      { title: 'Di chuyển', items: ['Đặt xe ngay', 'Thuê xe theo giờ'] },
      { title: 'GrabFood', items: ['Món ngon tại nhà', 'Khuyến mãi'] },
      { title: 'Ví điện tử', items: ['Liên kết thẻ', 'Nạp tiền'] }
    ]
  },
  {
    id: 'doi-tac',
    label: 'Đối tác tài xế',
    columns: [
      { title: 'Thông tin mới nhất', items: ['Cập nhật chính sách', 'Chương trình thưởng'] },
      { title: 'Đăng ký', items: ['Trở thành tài xế công nghệ', 'Giao đồ ăn'] }
    ]
  }
]

const currentContent = computed(() => {
  return menuData.find(item => item.id === activeTab.value)?.columns || []
})

// --- LOGIC SLIDER ---
const currentIndex = ref(0)
const images = [
  { src: new URL('@/assets/img/anhbanner/anhbanh.webp', import.meta.url).href, alt: 'Banner 1' },
  { src: new URL('@/assets/img/anhbanner/anhbanh2.jpg', import.meta.url).href, alt: 'Banner 2' },
  { src: new URL('@/assets/img/anhbanner/anhbun.jpg', import.meta.url).href, alt: 'Banner 3' },
]

const nextSlide = () => { currentIndex.value = (currentIndex.value + 1) % images.length }
const prevSlide = () => { currentIndex.value = (currentIndex.value - 1 + images.length) % images.length }

let timer = null

// --- DANH SÁCH NHÀ HÀNG ---
const restaurants = ref([
  { id: 1, name: "Phở gà anh thư", type: "Cơm , phở ", rating: 4.9, time: "30 phút", distance: "4.4 km", promo: "Giảm 15.000đ", image: new URL('@/assets/img/anhND/comngon.jpg', import.meta.url).href, isFavorite: false },
  { id: 2, name: "Lotteria - Vincom Smart City", type: "đồ uống", rating: 3.8, time: "25 phút", distance: "2.8 km", promo: "Tặng Menu", image: new URL('@/assets/img/anhND/lotte.jpg', import.meta.url).href, isFavorite: false },
  { id: 3, name: "Cơm bình dân", type: "Cơm", rating: 4.9, time: "30 phút", distance: "4.4 km", promo: "Giảm 15.000đ", image: new URL('@/assets/img/anhND/comtho.jpg', import.meta.url).href, isFavorite: false },
  { id: 4, name: "Cơm Gà hầm", type: "Cơm, Thức ăn nhanh", rating: 4.9, time: "30 phút", distance: "4.4 km", promo: "Giảm 15.000đ", image: new URL('@/assets/img/anhND/gaham.jpg', import.meta.url).href, isFavorite: false },
  { id: 5, name: "Tocotoco", type: "đồ uống", rating: 4.9, time: "30 phút", distance: "4.4 km", promo: "Giảm 15.000đ", image: new URL('@/assets/img/anhND/toco.jpg', import.meta.url).href, isFavorite: false },
  { id: 6, name: "Bún chấm", type: "đồ ăn chín", rating: 4.9, time: "30 phút", distance: "4.4 km", promo: "Giảm 15.000đ", image: new URL('@/assets/img/anhND/buncham.jpg', import.meta.url).href, isFavorite: false },
  { id: 7, name: "Mixue", type: "đồ uống", rating: 4.9, time: "30 phút", distance: "4.4 km", promo: "Giảm 15.000đ", image: new URL('@/assets/img/anhND/mixue.jpg', import.meta.url).href, isFavorite: false },
])

// --- HÀM LẤY USER TỪ LOCALSTORAGE ---
const getCurrentUser = () => {
    const userStr = localStorage.getItem('user'); // Fixed: user instead of userLogin
    if (userStr) return JSON.parse(userStr);
    return null;
}

onMounted(async () => {
  timer = setInterval(nextSlide, 4000)
  
  // --- LOGIC MỚI: ĐỒNG BỘ TRÁI TIM TỪ DATABASE ---
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id) { // Fixed: id instead of account_id
      try {
          const res = await axios.get(`${API_BASE_URL}/api/like/${currentUser.id}`); 
          const likedList = res.data; 

          restaurants.value.forEach(r => {
              const isLiked = likedList.some(dbItem => dbItem.MaQuan === r.id);
              if (isLiked) r.isFavorite = true;
          });
      } catch (error) {
          console.error("Lỗi tải danh sách yêu thích:", error);
      }
  }
})

onUnmounted(() => { if (timer) clearInterval(timer) })

// --- LOGIC MỚI: BẤM TIM GỌI API ---
const toggleFavorite = async (res) => {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    alert("Vui lòng đăng nhập để sử dụng tính năng yêu thích!");
    return;
  }

  const oldState = res.isFavorite;
  res.isFavorite = !res.isFavorite;

  try {
      const response = await axios.post(`${API_BASE_URL}/api/like`, { 
          maNguoiDung: currentUser.id, // Fixed: id
          maQuan: res.id
      });
  } catch (error) {
      console.error("Lỗi thả tim:", error);
      res.isFavorite = oldState; 
      alert("Lỗi kết nối server!");
  }
}

const filteredRestaurants = computed(() => {
  if (!searchQuery.value.trim()) return restaurants.value
  return restaurants.value.filter(res => res.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})
</script>

<template>
  <div class="grab-container">
    <header class="navbar-custom">
      <div class="nav-left">
        <svg class="menu-icon" @click="isMenuOpen = !isMenuOpen" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <div class="logo-box">
           <img src="@/assets/img/anh.logo/anhnen.png" alt="Grab" class="logo-img" style="width: 100px; height:100px;"/> 
        </div>
      </div>
      <div class="nav-right">
        <span class="support-text">Trung Tâm Hỗ Trợ</span>
        
        <a href="/giohang" @click.prevent="openCartPopup" class="cart-icon-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: black;">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        </a>

        <router-link to="/profile">
            <svg class="icon-action" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </router-link>
      </div>
    </header>

    <div v-if="isMenuOpen" class="mega-menu">
      <div class="menu-sidebar">
        <ul>
          <li v-for="item in menuData" :key="item.id" :class="{ active: activeTab === item.id }" @click="activeTab = item.id">{{ item.label }}</li>
        </ul>
      </div>
      <div class="menu-content">
        <div class="content-grid">
          <div v-for="(col, index) in currentContent" :key="index" class="content-column">
            <h3 class="column-title">{{ col.title }}</h3>
            <ul>
              <li v-for="(subItem, subIndex) in col.items" :key="subIndex">{{ subItem }}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <main class="hero-section">
      <div class="slider-container">
        <div class="slides-wrapper" :style="{ transform: `translateX(-${currentIndex * 100}%)` }">
          <div v-for="(img, index) in images" :key="index" class="slide">
            <img :src="img.src" :alt="img.alt" />
          </div>
        </div>
        <button class="nav-btn prev" @click="prevSlide">❮</button>
        <button class="nav-btn next" @click="nextSlide">❯</button>

        <div class="search-overlay">
          <div class="search-box">
            <p class="greeting">Xin Chào Bạn</p>
            <h1 class="title">Chúng tôi nên giao thức ăn của bạn ở đâu hôm nay?</h1>
            <div class="input-group">
              <input v-model="searchQuery" type="text" class="inp-find" placeholder="Nhập Quán bạn muốn tìm..." />
              <button class="btn-find">Tìm kiếm</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <section class="restaurant-container">
      <h2 class="title-section">Ưu đãi Giao Hàng Tận Nơi tại <span class="green-text">Hà Nội</span></h2>
      <div class="restaurant-grid">
        <div v-for="res in filteredRestaurants" :key="res.id" class="restaurant-card-wrapper">
          <router-link :to="'/restaurant/' + res.id" class="restaurant-card">
            <div class="image-box">
              <img :src="res.image" alt="restaurant" />
              <span class="promo-label">Promo</span>
            </div>
            <div class="info-box">
              <h3 class="res-name">{{ res.name }}</h3>
              <p class="res-type">{{ res.type }}</p>
              <div class="res-meta">
                <span>⭐ {{ res.rating }}</span>
                <span>{{ res.time }} • {{ res.distance }}</span>
              </div>
              <div class="res-discount">
                <span class="icon">🎫</span> {{ res.promo }}
              </div>
            </div>
          </router-link>
          <div class="favorite-icon" @click.stop.prevent="toggleFavorite(res)">
            <span v-if="res.isFavorite" style="color: #ff4757;">❤️</span>
            <span v-else>🤍</span>
          </div>
        </div>
      </div>
    </section>

    <div class="footer">
      <div class="footer-container">
        <div class="footer-column branding">
          <img src="@/assets/img/anh.logo/anhnen.png" alt="Logo" class="footer-logo">
          <div class="address-box">
            <h4>ĐỊA CHỈ</h4>
            <div class="map-container">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.3824554371583!2d105.74418387595463!3d21.01737758063065!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31345383f733e8fb%3A0xc39200389367332b!2zVHLGsOG7nW5nIENhbyDEkeG6s25nIEPDtG5nIG5naOG7hyBDYW8gSMOgIE7hu5lp!5e0!3m2!1svi!2s!4v1705680000000" 
                width="100%" height="200" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
            </div>
          </div>
        </div>
        <div class="footer-column">
          <h4>Người dùng</h4>
          <ul>
            <li><router-link to="">Có gì mới?</router-link></li>
            <li><router-link to="">Món ngon</router-link></li>
            <li><router-link to="">Dịch vụ Food</router-link></li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Đối tác tài xế</h4>
          <ul>
            <li><router-link to="">Thông tin mới</router-link></li>
            <li><router-link to="">Di chuyển</router-link></li>
            <li><router-link to="">Trung tâm tài xế</router-link></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom"><p>Theo dõi chúng tôi @2026</p></div>
    </div>
  </div>
</template>

<style scoped>
* { padding: 0; margin: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
.grab-container { width: 100%; overflow-x: hidden; margin: 0; padding: 0; }

.navbar-custom { display: flex; justify-content: space-between; align-items: center; padding: 0 40px; background-color: #9EF3C0; position: fixed; top: 0; left: 0; width: 100%; height: 80px; z-index: 1000; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin: 0; }
.nav-left, .nav-right { display: flex; align-items: center; gap: 20px; }
.logo-img { height: 60px; object-fit: contain; }

.slider-container { position: relative; width: 100%; height: 500px; overflow: hidden; margin-top: 80px; padding: 0; }
.slides-wrapper { display: flex; height: 100%; transition: transform 0.8s ease; width: 100%; margin: 0; padding: 0; }
.slide { min-width: 100%; height: 100%; }
.slide img { width: 100%; height: 100%; object-fit: cover; display: block; }

.search-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; padding-left: 80px; pointer-events: none; }
.search-box { background: white; padding: 40px; border-radius: 8px; width: 450px; pointer-events: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.inp-find { width: 70%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
.btn-find { padding: 10px 20px; background: #00b14f; color: white; border: none; border-radius: 4px; margin-left: 10px; cursor: pointer; }

.restaurant-container { padding: 40px 80px; max-width: 1400px; margin: 0 auto; }
.restaurant-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
.restaurant-card-wrapper { position: relative; }
.restaurant-card { text-decoration: none; color: inherit; display: block; border-radius: 8px; transition: 0.3s; }
.restaurant-card:hover { transform: translateY(-5px); }

.image-box { position: relative; height: 180px; }
.image-box img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.promo-label { position: absolute; top: 10px; left: 10px; background: #00b14f; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; }

.favorite-icon { position: absolute; top: 10px; right: 10px; background: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }

.footer { background-color: #f0fbf4; padding: 60px 0 20px; border-top: 4px solid #00b14f; margin-top: 50px; }
.footer-container { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; padding: 0 40px; gap: 40px; }
.footer-column { flex: 1; min-width: 250px; }
.footer-logo { width: 150px; margin-bottom: 20px; }
.footer-column h4 { margin-bottom: 20px; font-size: 18px; color: #333; }
.footer-column ul { list-style: none; }
.footer-column li { margin-bottom: 10px; }
.footer-column a { text-decoration: none; color: #666; font-size: 15px; }
.map-container { margin-top: 15px; border-radius: 8px; overflow: hidden; }

.mega-menu { position: fixed; top: 80px; left: 0; width: 100%; height: 400px; background: white; z-index: 999; display: flex; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
.menu-sidebar { width: 250px; background: #f7f7f7; border-right: 1px solid #eee; }
.menu-sidebar li { padding: 15px 30px; cursor: pointer; list-style: none; font-weight: 600; }
.menu-sidebar li.active { color: #00b14f; background: white; border-left: 4px solid #00b14f; }
.menu-content { flex: 1; padding: 40px; display: flex; gap: 40px; }

.content-grid {
   display: flex;
   gap: 50px; flex-wrap: wrap;
   }
.column-title { font-size: 16px; 
  font-weight: bold; 
  margin-bottom: 20px; 
  padding-bottom: 5px; 
  border-bottom: 2px solid #ddd; 
  display: inline-block; }
.menu-content ul {
   list-style: none;
   }
.menu-content li {
   margin-bottom: 12px; 
   color: #555; 
   font-size: 14px; 
   cursor: pointer; }
.menu-content li:hover {
   color: #00B14F; 
   text-decoration: underline; 
  }

/* --- CSS TRỢ LÝ ẢO --- */
.ai-assistant-container {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.ai-button {
  width: 60px;
  height: 60px;
  background-color: #00b14f;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  transition: all 0.3s ease;
  border: 2px solid white;
}
.ai-button:hover { transform: scale(1.1); }
.ai-button img { width: 40px; height: 40px; object-fit: contain; }

.ai-tooltip {
  background-color: white;
  color: #333;
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  margin-bottom: 15px;
  font-size: 14px;
  position: relative;
  white-space: nowrap;
  font-weight: 600;
  animation: float 2s infinite ease-in-out;
}
.tooltip-arrow {
  position: absolute;
  bottom: -6px;
  right: 25px;
  width: 12px;
  height: 12px;
  background: white;
  transform: rotate(45deg);
}

.chat-box-popup {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 360px;
  height: 520px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.25);
  overflow: hidden;
  border: 1px solid #ddd;
}

 @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease-out; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(20px); opacity: 0; }
</style>