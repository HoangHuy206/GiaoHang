<template>
  <div class="fixed bottom-4 right-4 z-50">
    <!-- Toggle Button -->
    <button
      @click="toggleChat"
      class="bg-[#00b14f] hover:bg-[#009e39] text-white rounded-full w-14 h-14 shadow-lg transition-all duration-300 flex items-center justify-center focus:outline-none ring-2 ring-white overflow-hidden"
    >
      <img :src="aiImageUrl" alt="AI" class="w-full h-full object-cover transition-transform duration-300" :class="{ 'scale-110': isOpen }" />
    </button>

    <!-- Chat Window -->
    <div v-if="isOpen" class="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden h-[500px]">
      <!-- Header -->
      <div class="bg-[#00b14f] p-4 text-white font-bold flex justify-between items-center shadow-md">
        <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-white relative">
                <img :src="aiImageUrl" @error="e => e.target.src='https://cdn-icons-png.flaticon.com/512/4712/4712027.png'" alt="AI" class="w-full h-full object-cover animate-pulse-slow" />
            </div>
            <div class="flex flex-col">
                <span>Trợ lý AI</span>
                <span class="text-xs opacity-75 font-normal">Luôn sẵn sàng hỗ trợ</span>
            </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <div v-for="(msg, index) in messages" :key="index" :class="['flex flex-col', msg.isUser ? 'items-end' : 'items-start']">
          <div :class="['max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed', msg.isUser ? 'bg-[#00b14f] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none']">
            {{ msg.text }}
          </div>
          
          <!-- Suggested Products -->
          <div v-if="msg.products && msg.products.length > 0" class="mt-2 w-full max-w-[90%] overflow-x-auto pb-2 flex gap-3 scrollbar-hide snap-x">
             <div v-for="prod in msg.products" :key="prod.id" class="snap-center min-w-[140px] w-[140px] bg-white rounded-xl border border-gray-100 shadow-md overflow-hidden flex flex-col transition-transform hover:scale-105">
                <div class="h-28 w-full bg-gray-100 relative">
                   <img :src="getFullImageUrl(prod.image_url)" class="w-full h-full object-cover" @error="e => e.target.src='https://via.placeholder.com/150'"/>
                   <div class="absolute top-1 right-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-bold text-[#00b14f] shadow-sm">
                      {{ formatPrice(prod.price) }}
                   </div>
                </div>
                <div class="p-2 flex flex-col flex-1 bg-white">
                   <h4 class="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight mb-1" :title="prod.name">{{ prod.name }}</h4>
                   <p class="text-[10px] text-gray-500 truncate">{{ prod.shop_name }}</p>
                </div>
             </div>
          </div>
        </div>
        <div v-if="isLoading" class="flex justify-start">
           <div class="bg-white text-gray-800 border border-gray-200 shadow-sm max-w-[80%] rounded-2xl rounded-bl-none p-3 text-sm flex gap-1 items-center">
             <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
             <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
             <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
           </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="p-3 bg-white border-t border-gray-100">
        <form @submit.prevent="sendMessage" class="flex gap-2">
          <input
            v-model="newMessage"
            type="text"
            placeholder="Nhập tin nhắn..."
            class="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00b14f]"
          />
          <button type="submit" class="bg-[#00b14f] text-white rounded-full p-2 hover:bg-[#009e39] transition-colors flex-shrink-0 w-10 h-10 flex items-center justify-center" :disabled="!newMessage.trim()">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import aiAvatar from '../assets/img/anh.logo/anh-AI.png';

const isOpen = ref(false);
const messages = ref([]);
const newMessage = ref('');
const isLoading = ref(false);
const messagesContainer = ref(null);
const authStore = useAuthStore();

// --- DÙNG ẢNH CỦA BẠN (ĐÃ IMPORT CHUẨN VITE) ---
const aiImageUrl = ref(aiAvatar);

const toggleChat = () => {
    isOpen.value = !isOpen.value;
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const addMessage = (text, isUser = false, products = []) => {
  messages.value.push({ text, isUser, products });
  scrollToBottom();
};

const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
};

const getFullImageUrl = (url) => {
    if (!url) return 'https://via.placeholder.com/150';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  let timeWish = 'một ngày tốt lành';
  if (hour >= 5 && hour < 11) timeWish = 'buổi sáng tốt lành';
  else if (hour >= 11 && hour < 14) timeWish = 'buổi trưa vui vẻ';
  else if (hour >= 14 && hour < 18) timeWish = 'buổi chiều thuận lợi';
  else if (hour >= 18 && hour < 22) timeWish = 'buổi tối ấm áp';
  else timeWish = 'một đêm ngon giấc';

  const name = authStore.user ? authStore.user.full_name : 'bạn';
  return `Xin chào ${name}, chúc bạn ${timeWish}! Tôi là trợ lý ảo của GiaoHangTanNoi. Tôi có thể giúp bạn xem Menu của các quán ăn hoặc tư vấn chọn món ngon hôm nay.`;
};

watch(isOpen, (newVal) => {
  if (newVal && messages.value.length === 0) {
    addMessage(getGreeting());
  }
});

const processMessage = async (text) => {
  isLoading.value = true;
  await new Promise(r => setTimeout(r, 600));
  try {
    const payload = {
        message: text,
        userId: authStore.user ? authStore.user.id : null
    };
    const response = await axios.post(`${API_BASE_URL}/api/chat`, payload);
    
    // Ưu tiên hiển thị reply từ server (dù là thông báo lỗi hay nội dung chat)
    if (response.data && (response.data.reply || response.data.message)) {
        const replyText = response.data.reply || response.data.message;
        addMessage(replyText, false, response.data.suggestedProducts || []);
    } else {
        // Nếu server trả về 200 OK nhưng không có reply, hiển thị toàn bộ data để debug
        addMessage(`Server Response: ${JSON.stringify(response.data)}`);
    }
  } catch (err) {
    // Hiển thị lỗi thực tế từ server (nếu có response) hoặc lỗi mạng
    const errorMsg = err.response?.data?.reply || err.response?.data?.error || err.message;
    addMessage(`Lỗi: ${errorMsg}`);
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim()) return;
  const text = newMessage.value;
  addMessage(text, true);
  newMessage.value = '';
  await processMessage(text);
};
</script>