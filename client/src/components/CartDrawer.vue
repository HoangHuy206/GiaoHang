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
              <p v-if="cart.items.length > 0" class="cart-note text-[10px] text-orange-600 bg-orange-50 p-2 mb-2 rounded border border-orange-100">
                💡 Lưu ý: Bạn chỉ có thể chọn thanh toán món của 1 quán duy nhất trong mỗi đơn hàng.
              </p>
              <div v-for="group in cart.groupedItems" :key="group.shopId" class="shop-group-wrapper mb-4">
                <div class="shop-header-in-cart bg-green-50 p-3 rounded mb-2 flex items-center gap-3 border-l-4 border-green-500 shadow-sm">
                   <div class="shop-icon-circle bg-green-500 text-white p-1.5 rounded-full flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                   </div>
                   <span class="font-bold text-green-800 notranslate text-base">{{ group.shopName }}</span>
                </div>

                <div v-for="(item, index) in group.items" :key="item.productId" class="cart-item">
                  <div class="item-checkbox">
                    <input type="checkbox" v-model="item.selected" @change="cart.saveToStorage()" class="custom-checkbox">
                  </div>

                  <div class="item-quantity-control">
                    <button @click="decreaseQtyByItem(item)" class="qty-btn">-</button>
                    <span class="qty-number">{{ item.quantity }}</span>
                    <button @click="increaseQtyByItem(item)" class="qty-btn">+</button>
                  </div>

                  <div class="item-info">
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-note" v-if="item.note">{{ item.note }}</span>
                  </div>

                  <div class="item-actions">
                    <div class="item-price">{{ formatCurrency(item.price * item.quantity) }}</div>
                    <button class="delete-item-btn" @click="removeItemById(item.productId)" title="Xóa món này">
                      🗑️
                    </button>
                  </div>
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
import { useCartStore } from '../stores/cart';
import { useToastStore } from '../stores/toast';
import { useConfirmStore } from '../stores/confirm';

export default {
  name: "GioHang",
  setup() {
    const cart = useCartStore();
    const toast = useToastStore();
    const confirmStore = useConfirmStore();
    const isVisible = ref(false);
    const router = useRouter();
    const route = useRoute();

    // --- TÍNH TOÁN ---
    const cartItems = computed(() => cart.items);
    
    const totalItems = computed(() => cart.itemCount);

    const subTotal = computed(() => {
      return cart.items
        .filter(item => item.selected !== false)
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
    });

    const selectedCount = computed(() => cart.items.filter(i => i.selected !== false).length);

    const isSelectAll = computed({
      get: () => cart.items.length > 0 && cart.items.every(i => i.selected !== false),
      set: (val) => {
        cart.items.forEach(item => item.selected = val);
      }
    });

    const toggleSelectAll = (e) => {
      const checked = e.target.checked;
      cart.items.forEach(item => item.selected = checked);
    };

    const itemCount = computed(() => cart.itemCount);
    const groupedItems = computed(() => cart.groupedItems);

    const formatCurrency = (val) =>
      new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    const increaseQty = (index) => {
      cart.items[index].quantity++;
      cart.saveToStorage();
    };

    const decreaseQty = (index) => {
      if (cart.items[index].quantity > 1) {
        cart.items[index].quantity--;
        cart.saveToStorage();
      } else {
        removeItem(index);
      }
    };

    const increaseQtyByItem = (item) => {
      item.quantity++;
      cart.saveToStorage();
    };

    const decreaseQtyByItem = (item) => {
      if (item.quantity > 1) {
        item.quantity--;
        cart.saveToStorage();
      } else {
        removeItemById(item.productId);
      }
    };

    const removeItemById = async (productId) => {
      const confirmed = await confirmStore.ask("Bạn muốn xóa món này khỏi giỏ hàng?");
      if (confirmed) {
        cart.removeFromCart(productId);
        toast.success("Đã xóa món ăn.");
      }
    };

    const removeItem = async (index) => {
      const confirmed = await confirmStore.ask("Bạn muốn xóa món này khỏi giỏ hàng?");
      if (confirmed) {
        cart.items.splice(index, 1);
        cart.saveToStorage();
        toast.success("Đã xóa món ăn.");
      }
    };

    const removeSelected = async () => {
      const count = selectedCount.value;
      if (count > 0) {
        const confirmed = await confirmStore.ask(`Bạn chắc chắn muốn xóa ${count} món đang chọn khỏi giỏ hàng?`);
        if (confirmed) {
          cart.items = cart.items.filter(item => item.selected === false);
          cart.saveToStorage();
          toast.success(`Đã xóa ${count} món.`);
        }
      }
    };

    const openCart = () => isVisible.value = true;
    const closeCart = () => isVisible.value = false;

    const goToCheckout = () => {
      const itemsToPay = cart.items.filter(item => item.selected !== false);
      if (itemsToPay.length === 0) {
        toast.warning("Vui lòng tích chọn món cần thanh toán!");
        return;
      }

      // --- KIỂM TRA QUÁN ---
      // Lấy danh sách ID các quán từ các món đã chọn
      const shopIds = [...new Set(itemsToPay.map(item => item.shopId))];
      
      if (shopIds.length > 1) {
        toast.warning("Bạn chỉ có thể thanh toán món ăn của 1 quán trong mỗi đơn hàng. Vui lòng bỏ chọn các món của quán khác!");
        return;
      }

      localStorage.setItem('tempCart', JSON.stringify(itemsToPay));
      
      // Không xóa món ở đây nữa, chỉ xóa sau khi thanh toán thành công tại trang ThanhToan.vue
      
      closeCart();
      router.push('/thanhtoan');
    };

    cartBus.on('add-to-cart', (product) => {
      // Bây giờ việc thêm vào store được xử lý trực tiếp tại View để đảm bảo tốc độ
      // Event này chỉ dùng để kích hoạt mở giỏ hàng nếu cần
      isVisible.value = true;
    });

    cartBus.on('open-cart', openCart);

    return {
      cart, isVisible, cartItems, totalItems, subTotal, selectedCount,
      formatCurrency, increaseQty, decreaseQty, removeItem, removeSelected,
      closeCart, goToCheckout, isSelectAll, toggleSelectAll,
      groupedItems, decreaseQtyByItem, increaseQtyByItem, removeItemById
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
