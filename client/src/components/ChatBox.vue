<template>
  <div class="flex flex-col h-[450px] w-full bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden font-sans">
    <!-- Header -->
    <div class="bg-gradient-to-r from-green-600 to-green-500 text-white p-4 flex justify-between items-center shrink-0 shadow-md">
      <div class="flex items-center gap-3">
        <div class="relative">
          <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg backdrop-blur-sm">
            {{ otherPartyRole === 'driver' ? '🛵' : '👤' }}
          </div>
          <span v-if="isOtherUserOnline" class="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-green-600 rounded-full"></span>
        </div>
        <div>
          <h4 class="font-bold text-base leading-tight">Chat với {{ otherPartyRole === 'driver' ? 'Tài xế' : 'Khách hàng' }}</h4>
          <p class="text-xs text-green-100 opacity-90">Đơn hàng #{{ orderId }}</p>
        </div>
      </div>
      <button @click="$emit('close')" class="hover:bg-white/10 rounded-full p-2 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scroll-smooth" ref="messageContainer">
      <div v-if="loading" class="flex justify-center py-6">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
      </div>
      
      <div v-for="msg in messages" :key="msg.id || msg.tempId" 
           :class="['flex w-full group', msg.sender_id == currentUser.id ? 'justify-end' : 'justify-start']">
        
        <div :class="[
          'max-w-[75%] px-4 py-2.5 shadow-sm relative transition-all duration-200',
          msg.sender_id == currentUser.id 
            ? 'bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl rounded-tr-sm' 
            : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-tl-sm'
        ]">
          <p class="text-[15px] leading-relaxed break-words">{{ msg.content }}</p>
          <div :class="['text-[10px] mt-1 flex items-center gap-1', msg.sender_id == currentUser.id ? 'text-green-100 justify-end' : 'text-gray-400']">
            <span>{{ formatTime(msg.created_at) }}</span>
            <span v-if="msg.sending" class="animate-pulse">⏳</span>
          </div>
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="flex w-full justify-start animate-fade-in">
        <div class="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
           <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
           <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
           <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
      </div>
      
      <div v-if="messages.length === 0 && !loading" class="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
        <span class="text-2xl mb-2">💬</span>
        <p>Bắt đầu cuộc trò chuyện...</p>
      </div>
    </div>

    <!-- Input -->
    <form @submit.prevent="sendMessage" class="p-3 border-t border-gray-100 bg-white flex gap-2 shrink-0 items-center">
      <input 
        v-model="newMessage" 
        @input="handleTyping"
        type="text" 
        placeholder="Nhập tin nhắn..." 
        class="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all placeholder-gray-400"
      />
      <button 
        type="submit" 
        :disabled="!newMessage.trim()"
        class="bg-green-600 text-white p-2.5 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg transform active:scale-95 flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed, onUnmounted } from 'vue';
import axios from 'axios';
import { io } from 'socket.io-client';
import { SOCKET_URL, API_BASE_URL } from '../config';

const props = defineProps({
  orderId: { type: [Number, String], required: true },
  currentUser: { type: Object, required: true }
});

const emit = defineEmits(['close']);

const messages = ref([]);
const newMessage = ref('');
const loading = ref(true);
const messageContainer = ref(null);
const isTyping = ref(false);
const isOtherUserOnline = ref(true); // Simplified online status
let socket = null;
let typingTimeout = null;

const otherPartyRole = computed(() => {
    return props.currentUser.role === 'user' ? 'driver' : 'user';
});

const scrollToBottom = async () => {
  await nextTick();
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const fetchMessages = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/orders/${props.orderId}/messages`);
    messages.value = response.data;
  } catch (error) {
    console.error('Lỗi tải tin nhắn:', error);
  } finally {
    loading.value = false;
    scrollToBottom();
  }
};

const handleTyping = () => {
  if (!socket) return;
  
  socket.emit('typing', { orderId: props.orderId, userId: props.currentUser.id });

  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop_typing', { orderId: props.orderId, userId: props.currentUser.id });
  }, 1000);
};

const sendMessage = () => {
  const content = newMessage.value.trim();
  if (!content) return;

  // Optimistic UI: Add message immediately
  const tempMsg = {
    tempId: Date.now(),
    sender_id: props.currentUser.id,
    content: content,
    created_at: new Date().toISOString(),
    sending: true
  };
  
  messages.value.push(tempMsg);
  newMessage.value = '';
  scrollToBottom();

  // Stop typing immediately
  if (typingTimeout) clearTimeout(typingTimeout);
  socket.emit('stop_typing', { orderId: props.orderId, userId: props.currentUser.id });

  const messageData = {
    orderId: props.orderId,
    senderId: props.currentUser.id,
    content: content
  };

  socket.emit('send_message', messageData);
};

onMounted(() => {
  fetchMessages();

  socket = io(SOCKET_URL);
  
  socket.emit('join_room', `order_${props.orderId}`);

  socket.on('receive_message', (data) => {
    if (data.orderId == props.orderId) {
      // If it's my message coming back from server, replace the temp one or ignore
      // But simpler: just check if we have a temp message with same content & recent time?
      // For now, let's just push it. If we want perfect de-duplication we'd match IDs.
      // Since socket sends to everyone in room including sender (usually), we might get duplicates if we don't handle it.
      // However, `socket.broadcast.to` sends to others, `io.to` sends to all.
      // Server uses `io.to`, so sender gets it back.
      
      const existingIdx = messages.value.findIndex(m => m.sending && m.content === data.content);
      if (existingIdx !== -1) {
        // Update existing optimistic message
        messages.value[existingIdx] = { ...data, sending: false };
      } else if (data.sender_id !== props.currentUser.id) {
        // Only push if it's from others (or somehow we missed our own optimistic update)
        messages.value.push(data);
        isTyping.value = false; // Stop typing animation if message received
      }
      scrollToBottom();
    }
  });

  socket.on('typing', (data) => {
    if (data.userId !== props.currentUser.id) {
      isTyping.value = true;
      scrollToBottom();
    }
  });

  socket.on('stop_typing', (data) => {
    if (data.userId !== props.currentUser.id) {
      isTyping.value = false;
    }
  });
});

onUnmounted(() => {
  if (socket) socket.disconnect();
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
