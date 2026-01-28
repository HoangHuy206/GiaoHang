<template>
  <div class="flex flex-col h-[400px] w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
    <!-- Header -->
    <div class="bg-green-600 text-white p-3 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
          {{ otherPartyRole === 'driver' ? '🛵' : '👤' }}
        </div>
        <div>
          <h4 class="font-bold text-sm">Chat với {{ otherPartyRole === 'driver' ? 'Tài xế' : 'Khách hàng' }}</h4>
          <p class="text-[10px] opacity-80">Đơn hàng #{{ orderId }}</p>
        </div>
      </div>
      <button @click="$emit('close')" class="hover:bg-white/10 rounded p-1">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" ref="messageContainer">
      <div v-if="loading" class="text-center text-gray-400 text-sm py-4"> Đang tải tin nhắn... </div>
      
      <div v-for="msg in messages" :key="msg.id || msg.created_at" 
           :class="['flex w-full', msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start']">
        <div :class="[
          'max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm',
          msg.sender_id === currentUser.id 
            ? 'bg-green-600 text-white rounded-tr-none' 
            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
        ]">
          <p>{{ msg.content }}</p>
          <p :class="['text-[9px] mt-1', msg.sender_id === currentUser.id ? 'text-green-100 text-right' : 'text-gray-400']">
            {{ formatTime(msg.created_at) }}
          </p>
        </div>
      </div>
      
      <div v-if="messages.length === 0 && !loading" class="text-center text-gray-400 text-xs py-10 italic">
        Bắt đầu cuộc trò chuyện...
      </div>
    </div>

    <!-- Input -->
    <form @submit.prevent="sendMessage" class="p-3 border-t bg-white flex gap-2 shrink-0">
      <input 
        v-model="newMessage" 
        type="text" 
        placeholder="Nhập tin nhắn..." 
        class="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
      />
      <button 
        type="submit" 
        :disabled="!newMessage.trim()"
        class="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from 'vue';
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
let socket = null;

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
    loading.value = false;
    scrollToBottom();
  } catch (error) {
    console.error('Lỗi tải tin nhắn:', error);
    loading.value = false;
  }
};

const sendMessage = () => {
  if (!newMessage.value.trim()) return;

  const messageData = {
    orderId: props.orderId,
    senderId: props.currentUser.id,
    content: newMessage.value.trim()
  };

  socket.emit('send_message', messageData);
  newMessage.value = '';
};

onMounted(() => {
  fetchMessages();

  socket = io(SOCKET_URL);
  
  socket.emit('join_room', `order_${props.orderId}`);

  socket.on('receive_message', (data) => {
    if (data.orderId == props.orderId) {
      messages.value.push(data);
      scrollToBottom();
    }
  });
});
</script>
