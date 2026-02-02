import { defineStore } from 'pinia';

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [], // { productId, name, price, quantity, shopId }
  }),
  getters: {
    totalPrice: (state) => state.items.reduce((total, item) => total + (item.price * item.quantity), 0),
    itemCount: (state) => state.items.reduce((count, item) => count + item.quantity, 0)
  },
  actions: {
    addToCart(product, shopId) {
      // Clear cart if adding from a different shop
      if (this.items.length > 0 && this.items[0].shopId !== shopId) {
        if(!confirm("Giỏ hàng đang chứa món của quán khác. Bạn có muốn xóa giỏ hàng cũ để bắt đầu đặt quán mới này không?")) {
            return;
        }
        this.items = [];
      }

      const existing = this.items.find(i => i.productId === product.id);
      if (existing) {
        existing.quantity++;
      } else {
        this.items.push({
          productId: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          shopId: shopId
        });
      }
    },
    removeFromCart(productId) {
      const index = this.items.findIndex(i => i.productId === productId);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    },
    clearCart() {
      this.items = [];
    }
  }
});
