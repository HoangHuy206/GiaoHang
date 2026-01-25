<template>
  <transition name="cart-slide">
    <div v-if="isVisible" class="cart-overlay" @click.self="closeCart">
      <div class="cart-container">

        <div class="cart-header">
          <h2 class="cart-title" v-if="cartItems.length > 0">Giỏ hàng ({{ totalItems }} món)</h2>
          <h2 class="cart-title" v-else>Giỏ hàng</h2>
          <button class="close-btn" @click="closeCart" title="Đóng">×</button>
        </div>

        <div class="cart-content">
          <div v-if="cartItems.length === 0" class="empty-cart">
            <img src="../assets/img/anh.logo/anhlogogiohangxoanen.png" alt="Trống" class="empty-cart-img" />
            <h3>Giỏ hàng trống!</h3>
            <p>Thêm món ăn để đặt ngay.</p>
            <button class="browse-btn" @click="closeCart">Đặt món ngay!</button>
          </div>

          <div v-else class="cart-items-container">

            <div class="select-all-bar">
              <label class="select-all-label">
                <input type="checkbox" v-model="isSelectAll" @change="toggleSelectAll" class="custom-checkbox">
                <span>Tất cả ({{ cartItems.length }})</span>
              </label>

              <button v-if="selectedCount > 0" class="delete-selected-btn" @click="removeSelected">
                Xóa ({{ selectedCount }})
              </button>
            </div>

            <div class="cart-items-list">
              <div v-for="(item, index) in cartItems" :key="index" class="cart-item">

                <div class="item-checkbox">
                  <input type="checkbox" v-model="item.selected" class="custom-checkbox">
                </div>

                <div class="item-quantity-control">
                  <button @click="decreaseQty(index)" class="qty-btn">-</button>
                  <span class="qty-number">{{ item.quantity }}</span>
                  <button @click="increaseQty(index)" class="qty-btn">+</button>
                </div>

                <div class="item-info">
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-note" v-if="item.note">{{ item.note }}</span>
                </div>

                <div class="item-actions">
                  <div class="item-price">{{ formatCurrency(item.price * item.quantity) }}</div>
                  <button class="delete-item-btn" @click="removeItem(index)" title="Xóa món này">
                    🗑️
                  </button>
                </div>

              </div>
            </div>

            <div class="cart-summary">
              <div class="summary-row">
                <span>Đã chọn</span>
                <span>{{ selectedCount }} món</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-row total">
                <span>Tổng thanh toán</span>
                <span class="total-price">{{ formatCurrency(subTotal) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="cartItems.length > 0" class="cart-footer">
          <button class="checkout-btn" @click="goToCheckout" :disabled="subTotal === 0" :style="{ opacity: subTotal === 0 ? 0.5 : 1 }">
            Mua hàng ({{ selectedCount }})
          </button>
        </div>

      </div>
    </div>
  </transition>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { cartBus } from '../utils/cartBus';

export default {
  name: "GioHang",
  setup() {
    const CART_KEY = 'myShoppingCart';
    const TEMP_KEY = 'tempCart';

    const isVisible = ref(false);
    const cartItems = ref([]);
    const router = useRouter();
    const route = useRoute();

    const syncCart = () => {
      const savedCart = localStorage.getItem(CART_KEY);
      if (savedCart) {
        try {
          let items = JSON.parse(savedCart);
          items = items.map(i => ({ ...i, selected: i.selected !== undefined ? i.selected : true }));
          cartItems.value = items;
        } catch (e) {
          cartItems.value = [];
        }
      } else {
        cartItems.value = [];
      }
    };

    const persistCart = () => {
      // Lưu giỏ chính (cartItems) vào localStorage
      if (cartItems.value.length > 0) {
        localStorage.setItem(CART_KEY, JSON.stringify(cartItems.value));
      } else {
        localStorage.removeItem(CART_KEY);
      }
    };

    onMounted(() => syncCart());
    watch(() => route.path, () => syncCart());

    watch(cartItems, () => {
      persistCart();
    }, { deep: true });

    // --- TÍNH TOÁN ---
    const totalItems = computed(() =>
      cartItems.value.reduce((total, item) => total + item.quantity, 0)
    );

    const subTotal = computed(() => {
      return cartItems.value
        .filter(item => item.selected)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    });

    const selectedCount = computed(() => cartItems.value.filter(i => i.selected).length);

    const isSelectAll = computed({
      get: () => cartItems.value.length > 0 && cartItems.value.every(i => i.selected),
      set: () => { /* xử lý ở toggleSelectAll */ }
    });

    const toggleSelectAll = (e) => {
      const checked = e.target.checked;
      cartItems.value.forEach(item => item.selected = checked);
    };

    const formatCurrency = (val) =>
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const increaseQty = (index) => cartItems.value[index].quantity++;

    const decreaseQty = (index) => {
      if (cartItems.value[index].quantity > 1) cartItems.value[index].quantity--;
      else removeItem(index);
    };

    // --- XÓA ---
    const removeItem = (index) => {
      if (confirm("Bạn muốn xóa món này khỏi giỏ?")) {
        cartItems.value.splice(index, 1);
      }
    };

    const removeSelected = () => {
      if (confirm(`Bạn chắc chắn muốn xóa ${selectedCount.value} món đang chọn?`)) {
        cartItems.value = cartItems.value.filter(item => !item.selected);
      }
    };

    const openCart = () => isVisible.value = true;
    const closeCart = () => isVisible.value = false;

    // ✅ FIX CHÍNH: BẤM MUA HÀNG -> LƯU tempCart + XÓA CÁC MÓN ĐÃ CHỌN KHỎI GIỎ CHÍNH
    const goToCheckout = () => {
      const itemsToPay = cartItems.value.filter(item => item.selected);
      if (itemsToPay.length === 0) return alert("Vui lòng tích chọn món cần thanh toán!");

      // 1) Lưu giỏ tạm để trang thanh toán dùng
      localStorage.setItem(TEMP_KEY, JSON.stringify(itemsToPay));

      // 2) XÓA các món đã chọn khỏi giỏ chính
      cartItems.value = cartItems.value.filter(item => !item.selected);

      // Nếu bạn muốn đặt xong là xóa sạch giỏ, dùng dòng này thay cho filter ở trên:
      // cartItems.value = [];

      // 3) Lưu lại giỏ mới
      persistCart();

      closeCart();
      router.push('/thanhtoan');
    };

    cartBus.on('add-to-cart', (product) => {
      // Ensure product has shopId if possible.
      // If product object comes from Restaurant, it might not have shopId if it's nested.
      // But let's assume 'product' object is what we get.
      
      const existingItem = cartItems.value.find(item => item.id === product.id && item.name === product.name);

      if (existingItem) {
        existingItem.quantity++;
        existingItem.selected = true;
      } else {
        cartItems.value.push({ ...product, quantity: 1, selected: true });
      }
      isVisible.value = true;
    });

    cartBus.on('open-cart', openCart);

    return {
      isVisible, cartItems, totalItems, subTotal, selectedCount,
      formatCurrency, increaseQty, decreaseQty, removeItem, removeSelected,
      closeCart, goToCheckout, isSelectAll, toggleSelectAll
    };
  }
};
</script>

<style scoped>
/* CSS CHO CHECKBOX VÀ NÚT XÓA */
.select-all-bar {
  padding: 10px 20px; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
  background: #fdfdfd;
}
.select-all-label {
  display: flex; align-items: center; cursor: pointer; font-weight: 600; font-size: 14px;
}
.custom-checkbox {
  width: 18px; height: 18px; margin-right: 8px; cursor: pointer; accent-color: #00b140;
}
.delete-selected-btn {
  background: none; border: none; color: #ff4757; font-weight: 600; font-size: 13px; cursor: pointer;
}
.delete-selected-btn:hover { text-decoration: underline; }

/* CSS ITEM */
.item-checkbox { margin-right: 12px; display: flex; align-items: center; }
.item-actions {
  display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between;
  height: 100%; min-height: 40px;
}
.delete-item-btn {
  background: none; border: none; font-size: 16px; cursor: pointer; margin-top: 5px; opacity: 0.7;
}
.delete-item-btn:hover { opacity: 1; transform: scale(1.1); transition: 0.2s; }

/* CÁC CSS CŨ GIỮ NGUYÊN */
.cart-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); z-index: 9999; display: flex; justify-content: flex-end; }
.cart-container { width: 400px; max-width: 85%; height: 100%; background-color: #fff; display: flex; flex-direction: column; box-shadow: -5px 0 15px rgba(0,0,0,0.1); }
.cart-header { padding: 15px 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background-color: white; }
.cart-title { font-size: 18px; font-weight: 600; margin: 0; }
.close-btn { background: none; border: none; font-size: 28px; cursor: pointer; color: #888; }
.cart-content { flex: 1; overflow-y: auto; display: flex; flex-direction: column; background: white;}
.empty-cart { padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; }
.empty-cart-img { width: 120px; margin-bottom: 20px; height: auto; object-fit: contain; }
.browse-btn { margin-top: 15px; padding: 10px 24px; border: 1px solid #00b140; color: #fff; border-radius: 4px; font-weight: bold; cursor: pointer; background-color: #00b14f; transition: 0.2s; }
.cart-items-container { padding: 0; }
.cart-item { display: flex; align-items: center; padding: 15px 20px; border-bottom: 1px solid #f0f0f0; }
.item-quantity-control { display: flex; align-items: center; border: 1px solid #ddd; border-radius: 4px; margin-right: 15px; height: 32px; }
.qty-btn { background: none; border: none; width: 25px; height: 100%; cursor: pointer; font-size: 16px; color: #00b140; }
.qty-number { font-size: 14px; font-weight: 600; padding: 0 5px; }
.item-info { flex: 1; display: flex; flex-direction: column; padding-right: 10px; }
.item-name { font-weight: 500; font-size: 15px; color: #333; }
.item-note { font-size: 12px; color: #888; margin-top: 4px; }
.item-price { font-weight: 600; font-size: 15px; color: #333; }
.cart-summary { padding: 20px; background-color: #f9f9f9; }
.summary-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #555; }
.summary-divider { height: 1px; background-color: #ddd; margin: 15px 0; }
.summary-row.total { font-weight: bold; color: #000; font-size: 18px; }
.total-price { color: #00b140; }
.cart-footer { padding: 15px 20px; border-top: 1px solid #eee; background: #fff; }
.checkout-btn { width: 100%; padding: 15px; background-color: #00b140; color: white; border: none; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer; }
.checkout-btn:disabled { background-color: #ccc; cursor: not-allowed; }
.cart-slide-enter-active, .cart-slide-leave-active { transition: opacity 0.3s; }
.cart-slide-enter-active .cart-container, .cart-slide-leave-active .cart-container { transition: transform 0.3s ease-out; }
.cart-slide-enter-from, .cart-slide-leave-to { opacity: 0; }
.cart-slide-enter-from .cart-container, .cart-slide-leave-to .cart-container { transform: translateX(100%); }
</style>
