import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

export const useCartStore = defineStore('cart', {
  state: () => ({
    // Khởi tạo rỗng, sẽ nạp dữ liệu ở action loadFromStorage
    items: [], 
  }),
  getters: {
    totalPrice: (state) => state.items.reduce((total, item) => total + (item.price * item.quantity), 0),
    itemCount: (state) => state.items.reduce((count, item) => count + item.quantity, 0),
    // Phân nhóm món ăn theo Shop
    groupedItems: (state) => {
      const groups = {};
      state.items.forEach(item => {
        if (!groups[item.shopId]) {
          groups[item.shopId] = {
            shopId: item.shopId,
            shopName: item.shopName || 'Quán ăn',
            items: []
          };
        }
        groups[item.shopId].items.push(item);
      });
      return Object.values(groups);
    }
  },
  actions: {
    getStorageKey() {
      const auth = useAuthStore();
      const userId = auth.user ? auth.user.id : 'guest';
      return `cart_items_user_${userId}`;
    },
    loadFromStorage() {
      const key = this.getStorageKey();
      const stored = localStorage.getItem(key);
      this.items = stored ? JSON.parse(stored) : [];
    },
    saveToStorage() {
      const key = this.getStorageKey();
      localStorage.setItem(key, JSON.stringify(this.items));
    },
    addToCart(product, shopId, shopName) {
      // Tìm trong danh sách hiện tại thay vì reload liên tục
      const existing = this.items.find(i => i.productId === product.id && i.shopId === shopId);
      if (existing) {
        existing.quantity++;
      } else {
        this.items.push({
          productId: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          shopId: shopId,
          shopName: shopName || 'Quán ăn',
          selected: true,
          image_url: product.image_url
        });
      }
      this.saveToStorage();
      return { success: true };
    },
    removeFromCart(productId) {
      const index = this.items.findIndex(i => i.productId === productId);
      if (index !== -1) {
        this.items.splice(index, 1);
        this.saveToStorage();
      }
    },
    updateQuantity(productId, quantity) {
      const item = this.items.find(i => i.productId === productId);
      if (item) {
        item.quantity = quantity;
        this.saveToStorage();
      }
    },
    clearCart() {
      this.items = [];
      this.saveToStorage();
    }
  }
});
