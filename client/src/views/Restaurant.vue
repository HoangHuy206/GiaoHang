<template>
  <div class="restaurant-page-wrapper animate-fade-in">
    <StandardHeader />
    <div v-if="shop" class="shop-content-area">
      <!-- Banner & Logo Section -->
      <div class="shop-banner-container">
          <div class="shop-banner-img" :style="{ backgroundImage: `url(${getBannerUrl(shop.banner_url)})` }">
              <div class="banner-overlay"></div>
          </div>
          
          <div class="shop-info-glass">
              <div class="shop-header-flex">
                  <div class="shop-logo-wrapper">
                      <img :src="getImageUrl(shop.image_url)" alt="Logo" class="shop-main-logo">
                  </div>
                  <div class="shop-text-info">
                      <h2 class="shop-name-title notranslate">{{ shop.name }}</h2>
                      <div v-if="!shop.is_active" class="closed-status-badge">
                        🔴 Hiện đang đóng cửa (Vui lòng quay lại vào ngày mai)
                      </div>
                      <p class="shop-address-text">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {{ shop.address }}
                      </p>
                      <div class="shop-tags">
                          <span class="tag">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#f1c40f" stroke="#f1c40f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            4.8 (500+)
                          </span>
                          <span class="tag">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline; margin-right:4px;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                            Giao nhanh 20p
                          </span>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  
      <div class="p-4 pt-10">
        <!-- Search Products -->
        <div class="mb-6">
           <input v-model="searchQuery" type="text" placeholder="Tìm kiếm món ăn..." class="w-full p-3 rounded-lg border border-gray-300 focus:ring-green-500 focus:border-green-500">
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
          <div v-for="product in filteredProducts" :key="product.id" 
               :id="`product-${product.id}`"
               :class="{'highlight-product': product.id == route.query.highlight}"
               class="bg-white p-4 rounded-xl shadow border border-gray-100 flex justify-between items-center group hover:border-green-400 transition">
            <img :src="getImageUrl(product.image_url)" alt="" class="w-20 h-20 rounded-lg object-cover mr-4 shadow-sm bg-gray-200" loading="lazy">
            <div class="flex-1">
                <h3 class="font-bold text-lg text-gray-800 group-hover:text-green-700 transition">{{ product.name }}</h3>
                <p class="text-red-500 font-bold mt-1">{{ formatPrice(product.price) }}</p>
            </div>
            <button @click="addToCartWithAnimation($event, product)" class="bg-green-500 hover:bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform active:scale-95 transition">
                <span class="text-2xl font-bold">+</span>
            </button>
          </div>
        </div>
      </div>
    </div> 
    <div v-else class="text-center py-10">
        <p class="animate-pulse text-gray-500">Đang tải thông tin quán...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import StandardHeader from '../components/StandardHeader.vue';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';
import { useConfirmStore } from '../stores/confirm';
import { cartBus } from '../utils/cartBus';
import axios from 'axios';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const toast = useToastStore();
const confirmStore = useConfirmStore();
const shop = ref(null);
const products = ref([]);
const searchQuery = ref('');

// --- HIỆU ỨNG BAY VÀO GIỎ HÀNG ---
const flyToCart = (event, imageUrl) => {
  const btn = event.currentTarget;
  const btnRect = btn.getBoundingClientRect();
  
  const cartIcon = document.querySelector('.cart-icon-wrapper');
  if (!cartIcon) return;
  const cartRect = cartIcon.getBoundingClientRect();

  const flyer = document.createElement('img');
  flyer.className = 'food-flyer';
  flyer.src = imageUrl || getImageUrl(null);
  
  flyer.style.left = `${btnRect.left}px`;
  flyer.style.top = `${btnRect.top}px`;
  flyer.style.width = '50px';
  flyer.style.height = '50px';
  flyer.style.borderRadius = '50%';
  flyer.style.objectFit = 'cover';
  flyer.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
  document.body.appendChild(flyer);

  const diffX = cartRect.left + cartRect.width / 2 - (btnRect.left + 25);
  const diffY = cartRect.top + cartRect.height / 2 - (btnRect.top + 25);

  requestAnimationFrame(() => {
    flyer.style.transition = 'all 1.2s cubic-bezier(0.42, 0, 0.58, 1)';
    flyer.style.transform = `translate(${diffX}px, ${diffY}px) scale(0.2) rotate(360deg)`;
    flyer.style.opacity = '0.7';
  });

  setTimeout(() => {
    flyer.remove();
  }, 1200);
};

const addToCartWithAnimation = async (event, product) => {
    if (!shop.value.is_active) {
        toast.error("Rất tiếc, quán hiện đang đóng cửa. Vui lòng quay lại vào ngày mai!");
        return;
    }

    if (!auth.user) {
        toast.info("Vui lòng đăng nhập để bắt đầu mua hàng!");
        setTimeout(() => {
            router.push('/login');
        }, 1500);
        return;
    }

    if (auth.user.role === 'driver' || auth.user.role === 'shop') {
        toast.warning("Tài khoản của bạn không thể đặt hàng.");
        return;
    }

    // Thêm trực tiếp vào giỏ hàng
    cart.addToCart(product, shop.value.id, shop.value.name);

    // Chạy hiệu ứng bay (Dùng ảnh sản phẩm)
    flyToCart(event, getImageUrl(product.image_url));
    
    // Mở giỏ hàng sau khi hiệu ứng bay gần xong (khoảng 800ms)
    setTimeout(() => {
        cartBus.emit('open-cart');
    }, 800);
};

// Socket listener added here
onMounted(async () => {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/shops/${route.params.id}`);
        shop.value = res.data;
        products.value = res.data.products;

        // Check for highlight
        if (route.query.highlight) {
            await nextTick();
            const el = document.getElementById(`product-${route.query.highlight}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        // Initialize socket only once if not already initialized or use global one if exists
        // However, for simplicity and ensuring it works in this component:
        const { io } = await import('socket.io-client');
        const { SOCKET_URL } = await import('../config');
        const socket = io(SOCKET_URL);

        // Listen for new products
        socket.on('new_product', (newProduct) => {
            console.log("🍔 New product received via socket:", newProduct);
            if (shop.value && String(newProduct.shopId) === String(shop.value.id)) {
                const exists = products.value.some(p => p.id === newProduct.id);
                if (!exists) {
                    products.value.unshift({
                        id: newProduct.id || Date.now(),
                        name: newProduct.name,
                        price: newProduct.price,
                        image_url: newProduct.image_url,
                        shop_id: newProduct.shopId
                    });
                    toast.info(`🍔 Món mới: ${newProduct.name} vừa được thêm vào thực đơn!`);
                }
            }
        });

        // Store socket to clean up
        route.socket = socket;
    } catch (error) {
        console.error(error);
    }
});

onUnmounted(() => {
    if (route.socket) {
        route.socket.off('new_product');
        route.socket.disconnect();
    }
});

const filteredProducts = computed(() => {
    if (!products.value) return [];
    return products.value.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'k';
};

const getImageUrl = (url) => {
    if (!url) return `${API_BASE_URL}/uploads/anhdaidienmacdinh.jpg`;
    if (url.startsWith('http')) {
        return url.replace('http://localhost:3000', API_BASE_URL);
    }
    if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
        return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return `${API_BASE_URL}/uploads/${url}`;
};

const getBannerUrl = (url) => {
    if (!url) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80';
    return getImageUrl(url);
};

const addToCart = async (product) => {
    if (!auth.user) {
        const confirmed = await confirmStore.ask("Bạn cần đăng nhập để mua hàng. Chuyển đến trang đăng nhập?");
        if (confirmed) {
            router.push('/login');
        }
        return;
    }

    if (auth.user.role === 'driver' || auth.user.role === 'shop') {
        toast.warning("Tài khoản của bạn không thể đặt hàng. Chỉ tài khoản Khách hàng (User) mới được phép đặt món.");
        return;
    }

    cartBus.emit('add-to-cart', { 
        ...product, 
        id: product.id, 
        shopId: shop.value.id 
    });
};
</script>

<style scoped>
.animate-slide-up {
    animation: slideUp 0.3s ease-out;
}
@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

@keyframes flashHighlight {
    0% { background-color: rgba(34, 197, 94, 0.2); border-color: #22c55e; box-shadow: 0 0 15px rgba(34, 197, 94, 0.5); }
    50% { background-color: rgba(34, 197, 94, 0.05); border-color: transparent; box-shadow: none; }
    100% { background-color: rgba(34, 197, 94, 0.2); border-color: #22c55e; box-shadow: 0 0 15px rgba(34, 197, 94, 0.5); }
}

.highlight-product {
    animation: flashHighlight 1.5s ease-in-out 3;
    border: 2px solid #22c55e !important;
}

.shop-banner-container {
    position: relative;
    height: 350px;
    width: 100%;
    margin-bottom: 60px;
}

.shop-banner-img {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    position: relative;
}

.banner-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5));
}

.shop-info-glass {
    position: absolute;
    bottom: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 90%;
    max-width: 1000px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    padding: 25px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.15);
    border: 1px solid rgba(255,255,255,0.3);
    z-index: 10;
}

.shop-header-flex {
    display: flex;
    align-items: center;
    gap: 25px;
}

.shop-logo-wrapper {
    flex-shrink: 0;
}

.shop-main-logo {
    width: 100px;
    height: 100px;
    border-radius: 15px;
    object-fit: cover;
    border: 4px solid white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.shop-text-info {
    flex: 1;
}

.shop-name-title {
    font-size: 28px;
    font-weight: 800;
    color: #1a1a1a;
    margin: 0 0 5px 0;
}

.closed-status-badge {
    background: #fee2e2;
    color: #ef4444;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    display: inline-block;
    margin-bottom: 10px;
    border: 1px solid #fecaca;
}

.shop-address-text {
    color: #666;
    font-size: 14px;
    margin-bottom: 12px;
}

.shop-tags {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.tag {
    background: #f0fdf4;
    color: #16a34a;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid #dcfce7;
}

@media (max-width: 768px) {
    .shop-banner-container { height: 250px; }
    .shop-header-flex { flex-direction: column; text-align: center; gap: 15px; }
    .shop-main-logo { width: 80px; height: 80px; margin-top: -60px; }
    .shop-name-title { font-size: 22px; }
    .shop-info-glass { bottom: -80px; }
    .shop-content-area { margin-bottom: 80px; }
}
</style>

<style>
.food-flyer {
  position: fixed;
  z-index: 9999;
  font-size: 24px;
  pointer-events: none;
  transition: all 0.8s cubic-bezier(0.42, 0, 0.58, 1);
  opacity: 1;
  transform: scale(1);
}
</style>
