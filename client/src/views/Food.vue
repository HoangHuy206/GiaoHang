<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'        
import { RouterLink } from 'vue-router'
import axios from 'axios' 
import StandardHeader from '../components/StandardHeader.vue'
import { API_BASE_URL } from '../config'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
const getImageUrl = (url) => {
    if (!url) return new URL('@/assets/img/anhND/anhdaidienmacdinh.jpg', import.meta.url).href;
    
    // Lấy tên file nguyên bản
    const fileName = url.split('/').pop();

    // Danh sách ảnh trong thư mục anhND
    const ndImages = ['comngon.jpg', 'lotte.jpg', 'comtho.jpg', 'gaham.jpg', 'toco.jpg', 'buncham.jpg', 'mixue.jpg', 'anhdaidienmacdinh.jpg'];
    if (ndImages.includes(fileName)) {
        return new URL(`../assets/img/anhND/${fileName}`, import.meta.url).href;
    }

    // Danh sách ảnh trong thư mục anhquanan
    const quanImages = ['pho-ga-anh-thu.png'];
    if (quanImages.includes(fileName)) {
        return new URL(`../assets/img/anhquanan/${fileName}`, import.meta.url).href;
    }

    if (url.startsWith('http')) return url;
    
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${API_BASE_URL}${path}`;
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

// --- DANH SÁCH NHÀ HÀNG (Sẽ được load từ API) ---
const restaurants = ref([])
const isLoading = ref(true)
const fetchError = ref(null)

const allProducts = ref([])

// --- HÀM LẤY USER TỪ LOCALSTORAGE ---
const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) return JSON.parse(userStr);
    return null;
}

const fetchData = async () => {
  isLoading.value = true;
  fetchError.value = null;
  console.log("Đang tải dữ liệu từ:", API_BASE_URL);
  
  try {
      // 1. Fetch real shops from API
      const shopsRes = await axios.get(`${API_BASE_URL}/api/shops`);
      console.log("Danh sách shop nhận được:", shopsRes.data);
      
      // Map API data to match the UI format
      restaurants.value = shopsRes.data.map(s => ({
          id: s.id,
          name: s.name,
          type: "Quán ăn", 
          rating: 4.9, 
          time: "30-40 phút",
          distance: "2.5 km",
          promo: "Giảm 10%",
          image: s.image_url, 
          isFavorite: false
      }));

      // 2. Fetch all products for search
      try {
          const prodRes = await axios.get(`${API_BASE_URL}/api/products`);
          allProducts.value = prodRes.data;
      } catch (e) {
          console.warn("Không thể tải danh sách món ăn:", e.message);
      }

      // 3. Đồng bộ trạng thái yêu thích
      if (auth.user && auth.user.id) {
          try {
              const res = await axios.get(`${API_BASE_URL}/api/like/${auth.user.id}`); 
              console.log("Favorite list from server:", res.data);
              const likedList = Array.isArray(res.data) ? res.data : []; 
              
              // Tạo một Set chứa ID của các shop đã thích để tìm kiếm nhanh hơn
              const likedShopIds = new Set(likedList.map(item => item.id || item.shop_id));
              
              restaurants.value.forEach(r => {
                  if (likedShopIds.has(r.id)) {
                      console.log(`Shop ${r.id} (${r.name}) is in favorites.`);
                      r.isFavorite = true;
                  } else {
                      r.isFavorite = false;
                  }
              });
          } catch (e) {
              console.error("Lỗi tải danh sách yêu thích:", e);
          }
      } else {
          // Nếu chưa đăng nhập, đảm bảo tất cả là false
          restaurants.value.forEach(r => r.isFavorite = false);
      }
  } catch (error) {
      console.error("Lỗi tải dữ liệu hệ thống:", error);
      fetchError.value = "Không thể kết nối tới máy chủ. Vui lòng thử lại.";
  } finally {
      isLoading.value = false;
  }
};

onMounted(async () => {
  timer = setInterval(nextSlide, 4000)
  await fetchData();
})

onUnmounted(() => { if (timer) clearInterval(timer) })

// --- LOGIC MỚI: BẤM TIM GỌI API ---
const toggleFavorite = async (res) => {
  const currentUser = getCurrentUser();
  
  if (!currentUser) {
    toast.warning("Vui lòng đăng nhập để sử dụng tính năng yêu thích!");
    return;
  }

  const oldState = res.isFavorite;
  res.isFavorite = !res.isFavorite;

  try {
      if (res.isFavorite) {
          // Thêm vào yêu thích
          await axios.post(`${API_BASE_URL}/api/like`, { 
              userId: currentUser.id, 
              shopId: res.id
          });
      } else {
          // Xóa khỏi yêu thích
          await axios.delete(`${API_BASE_URL}/api/like/${currentUser.id}/${res.id}`);
      }
  } catch (error) {
      console.error("Lỗi thả tim:", error);
      res.isFavorite = oldState; 
      toast.error("Lỗi kết nối server!");
  }
}

const filteredRestaurants = computed(() => {
  if (!searchQuery.value.trim()) return restaurants.value
  return restaurants.value.filter(res => res.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
})

const filteredFoods = computed(() => {
  if (!searchQuery.value.trim()) return [];
  return allProducts.value.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
})
</script>

<template>
  <div class="grab-container animate-fade-in">
    <StandardHeader show-menu-button @toggle-menu="isMenuOpen = !isMenuOpen" />

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
              <input v-model="searchQuery" type="text" class="inp-find" placeholder="Nhập Quán hoặc Món ăn bạn muốn tìm..." />
              <button class="btn-find">Tìm kiếm</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <section class="restaurant-container">
      <!-- FOUND DISHES SECTION -->
      <div v-if="searchQuery && filteredFoods.length > 0" class="mb-10">
          <h2 class="title-section">Món ăn tìm thấy</h2>
          <div class="food-grid">
              <router-link v-for="food in filteredFoods" :key="food.id" :to="'/restaurant/' + food.shop_id" class="food-card">
                  <div class="food-img-box">
                      <img :src="getImageUrl(food.image_url)" alt="food">
                  </div>
                  <div class="food-info">
                      <h4 class="food-name">{{ food.name }}</h4>
                      <p class="food-price">{{ new Intl.NumberFormat('vi-VN').format(food.price) }}đ</p>
                      <p class="shop-name">Tại: {{ food.shop_name }}</p>
                  </div>
              </router-link>
          </div>
          <div class="separator"></div>
      </div>

      <h2 class="title-section" style="margin-bottom: 30px;">Ưu đãi Giao Hàng Tận Nơi tại <span class="green-text">Hà Nội</span></h2>
      <div class="restaurant-grid">
        <div v-for="res in filteredRestaurants" :key="res.id" class="restaurant-card-wrapper">
          <router-link :to="'/restaurant/' + res.id" class="restaurant-card">
            <div class="image-box">
              <img :src="getImageUrl(res.image)" alt="restaurant" />
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

.nav-left, .nav-right { display: flex; align-items: center; gap: 20px; }
.logo-img { height: 60px; object-fit: contain; }

.slider-container { position: relative; width: 100%; height: clamp(300px, 50vh, 500px); overflow: hidden; margin-top: 0; padding: 0; }
.slides-wrapper { display: flex; height: 100%; transition: transform 0.8s ease; width: 100%; margin: 0; padding: 0; }
.slide { min-width: 100%; height: 100%; }
.slide img { width: 100%; height: 100%; object-fit: cover; display: block; }

.search-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; padding-left: 80px; pointer-events: none; }
.search-box { background: white; padding: 40px; border-radius: 8px; width: 450px; pointer-events: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.inp-find { width: 95%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 20px; margin-top: 10px; }
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

/* Food Search Styles */
.food-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}
.food-card {
    display: block;
    text-decoration: none;
    color: inherit;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: transform 0.2s, box-shadow 0.2s;
    overflow: hidden;
    border: 1px solid #eee;
}
.food-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-color: #00b14f;
}
.food-img-box {
    width: 100%;
    height: 150px;
    overflow: hidden;
    background: #f9f9f9;
}
.food-img-box img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.food-info {
    padding: 12px;
}
.food-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #333;
}
.food-price {
    font-size: 15px;
    font-weight: bold;
    color: #00b14f;
    margin-bottom: 5px;
}
.shop-name {
    font-size: 13px;
    color: #888;
    display: flex;
    align-items: center;
}
.separator {
    height: 1px;
    background: #e0e0e0;
    margin: 30px 0;
}
</style>