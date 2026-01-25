<template>
  <div class="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg">
    <h2 class="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Giỏ Hàng Của Bạn</h2>

    <div v-if="cart.items.length === 0" class="text-center py-10 text-gray-500">
        Giỏ hàng trống. <router-link to="/food" class="text-green-600 font-bold">Đi mua sắm ngay!</router-link>
    </div>

    <div v-else>
        <div class="space-y-4">
            <div v-for="item in cart.items" :key="item.productId" class="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <div>
                    <h3 class="font-bold text-lg">{{ item.name }}</h3>
                    <p class="text-gray-500">{{ formatPrice(item.price) }}</p>
                </div>
                <div class="flex items-center space-x-4">
                    <span class="font-bold text-green-700">x{{ item.quantity }}</span>
                    <span class="font-bold text-lg min-w-[100px] text-right">{{ formatPrice(item.price * item.quantity) }}</span>
                    <button @click="cart.removeFromCart(item.productId)" class="text-red-500 hover:text-red-700 text-sm font-bold">Xóa</button>
                </div>
            </div>
        </div>

        <div class="mt-8 border-t pt-6 flex flex-col items-end">
            <div class="text-2xl font-bold mb-4">Tổng cộng: <span class="text-green-600">{{ formatPrice(cart.totalPrice) }}</span></div>
            
            <button @click="placeOrder" class="mt-6 bg-green-600 text-white py-3 px-8 rounded-lg font-bold text-lg shadow hover:bg-green-700">
                Thanh Toán
            </button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';

const cart = useCartStore();
const auth = useAuthStore();
const router = useRouter();

const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN').format(price) + 'k';
};

const placeOrder = async () => {
    // Only check if cart is empty
    if (cart.items.length === 0) {
        alert("Giỏ hàng trống!");
        return;
    }

    // Save cart to localStorage for Checkout page to pick up
    localStorage.setItem('tempCart', JSON.stringify(cart.items));
    
    // Redirect to Checkout page
    router.push('/thanhtoan');
};
</script>
