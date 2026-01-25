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
      // Clear cart if adding from a different shop (optional rule, but common)
      if (this.items.length > 0 && this.items[0].shopId !== shopId) {
        if(!confirm("Start a new basket? You can only order from one shop at a time.")) return;
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
