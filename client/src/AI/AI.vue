<template>
  <div class="fixed bottom-4 right-4 z-50">
    <!-- Toggle Button -->
    <button
      @click="toggleChat"
      class="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 shadow-lg transition-all duration-300 flex items-center justify-center focus:outline-none ring-2 ring-white overflow-hidden"
    >
      <img src="@/assets/img/anh.logo/AII.png" alt="AI" class="w-full h-full object-cover transition-transform duration-300" :class="{ 'scale-110': isOpen }" />
    </button>

    <!-- Chat Window -->
    <div v-if="isOpen" class="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden h-[500px]">
      <!-- Header -->
      <div class="bg-blue-600 p-4 text-white font-bold flex justify-between items-center shadow-md">
        <div class="flex items-center gap-2">
            <div class="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-white">
                <img src="@/assets/img/anh.logo/AII.png" alt="AI" class="w-full h-full object-cover" />
            </div>
            <div class="flex flex-col">
                <span>Trợ lý AI</span>
                <span class="text-xs opacity-75 font-normal">Luôn sẵn sàng hỗ trợ</span>
            </div>
        </div>
      </div>

      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <div v-for="(msg, index) in messages" :key="index" :class="['flex', msg.isUser ? 'justify-end' : 'justify-start']">
          <div :class="['max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed', msg.isUser ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-none']">
            {{ msg.text }}
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
            class="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" class="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 transition-colors flex-shrink-0 w-10 h-10 flex items-center justify-center" :disabled="!newMessage.trim()">
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
import { ref, nextTick, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';

const isOpen = ref(false);
const messages = ref([]);
const newMessage = ref('');
const isLoading = ref(false);
const messagesContainer = ref(null);
const authStore = useAuthStore();

const toggleChat = () => {
    isOpen.value = !isOpen.value;
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const addMessage = (text, isUser = false) => {
  messages.value.push({ text, isUser });
  scrollToBottom();
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
  
  return `Xin chào ${name}, chúc bạn ${timeWish}! Tôi là trợ lý ảo của GiaoHangTanNoi. Tôi có thể giúp bạn theo dõi đơn hàng hoặc tư vấn chọn món.`;
};

// Auto greet when opened for the first time
watch(isOpen, (newVal) => {
  if (newVal && messages.value.length === 0) {
    addMessage(getGreeting());
  }
});

const processMessage = async (text) => {
  const lowerText = text.toLowerCase();
  isLoading.value = true;

  await new Promise(r => setTimeout(r, 600));

  try {
    if (!authStore.user) {
      addMessage('Vui lòng đăng nhập/đăng ký để sử dụng dịch vụ và được tư vấn');
      return;
    }

    if (lowerText.includes('chào')) {
       addMessage(getGreeting());
    }
    else if (lowerText.includes('đơn hàng') || lowerText.includes('vận chuyển') || lowerText.includes('ở đâu') || lowerText.includes('bao lâu')) {
         const response = await axios.get('http://localhost:3000/api/orders', {
            params: { role: 'user', userId: authStore.user.id }
         });
         const orders = response.data;
         const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
         
         if (activeOrders.length === 0) {
           addMessage('Hiện tại bạn không có đơn hàng nào đang giao. 😔');
         } else {
           const order = activeOrders[0];
           let statusText = '';
           switch(order.status) {
             case 'pending': statusText = 'đang chờ xác nhận ⏳'; break;
             case 'confirmed': statusText = 'đã được quán xác nhận ✅'; break;
             case 'finding_driver': statusText = 'đang tìm tài xế 🛵'; break;
             case 'driver_assigned': statusText = 'đã có tài xế nhận đơn 👤'; break;
             case 'picked_up': statusText = 'đã lấy hàng và đang giao đến bạn 🚚'; break;
             default: statusText = order.status;
           }

           let msg = `Đơn hàng mới nhất của bạn (ID: #${order.id}) ${statusText}.`;
           if (order.driver_name) {
             msg += `\n\nTài xế: ${order.driver_name}\nSĐT: ${order.driver_phone} 📞`;
           }
           if (order.status === 'picked_up' || order.status === 'driver_assigned') {
              msg += `\nĐịa điểm hiện tại: Đang di chuyển đến ${order.delivery_address}.`;
           }
           addMessage(msg);
         }
    }
    else if (lowerText.includes('tư vấn') || lowerText.includes('mua gì') || lowerText.includes('ăn gì') || lowerText.includes('menu') || lowerText.includes('món ngon') || lowerText.includes('hôm nay') || lowerText.includes('mùa')) {
       
       const prodRes = await axios.get('http://localhost:3000/api/products');
       const products = prodRes.data;
       
       if (products.length === 0) {
           addMessage('Hiện tại bên mình chưa cập nhật menu. Bạn quay lại sau nhé!');
           return;
       }

       const now = new Date();
       const day = now.getDate();
       const month = now.getMonth() + 1;
       const year = now.getFullYear();
       const hour = now.getHours();
       const minute = now.getMinutes().toString().padStart(2, '0');
       
       let season = ''; 
       if ([2, 3, 4].includes(month)) season = 'Xuân';
       else if ([5, 6, 7, 8].includes(month)) season = 'Hè';
       else if ([9, 10, 11].includes(month)) season = 'Thu';
       else season = 'Đông';

       let timeLabel = '';
       if (hour >= 5 && hour < 11) timeLabel = 'Sáng';
       else if (hour >= 11 && hour < 14) timeLabel = 'Trưa';
       else if (hour >= 14 && hour < 18) timeLabel = 'Chiều';
       else if (hour >= 18 && hour < 22) timeLabel = 'Tối';
       else timeLabel = 'Khuya';

       let contextMsg = `Bây giờ là ${hour}:${minute} ngày ${day}/${month}/${year} (${timeLabel}), đang vào mùa ${season}. `;
       let filtered = [];

       if (season === 'Hè') {
           filtered = products.filter(p => /trà|kem|sữa|nước|dừa|đá|tô/.test(p.name.toLowerCase()));
       } else if (season === 'Đông') {
           filtered = products.filter(p => /phở|bún|lẩu|nướng|canh|cháo|gà hầm/.test(p.name.toLowerCase()));
       }

       if (timeLabel === 'Sáng') {
           filtered = [...filtered, ...products.filter(p => /phở|bún|bánh mì|xôi/.test(p.name.toLowerCase()))];
       } else if (timeLabel === 'Trưa') {
           filtered = [...filtered, ...products.filter(p => /cơm|gà|bò/.test(p.name.toLowerCase()))];
       }

       if (filtered.length < 3) {
           filtered = products;
       }

       const randomPicks = [];
       const tempArr = [...filtered];
       for (let i = 0; i < Math.min(3, tempArr.length); i++) {
           const idx = Math.floor(Math.random() * tempArr.length);
           randomPicks.push(tempArr.splice(idx, 1)[0]);
       }

       let msg = contextMsg + "Mình gợi ý cho bạn một vài món ngon nhé: 😋\n";
       randomPicks.forEach(p => {
           msg += `\n- ${p.name} (${p.shop_name}) - ${Number(p.price).toLocaleString('vi-VN')}đ`;
       });
       
       addMessage(msg + "\n\nBạn có muốn thử ngay không?");
    }
    else if (lowerText.includes('cảm ơn')) {
       addMessage('Không có chi! Chúc bạn ngon miệng! 🥰');
    }
    else {
       addMessage('Xin lỗi, tôi chưa hiểu ý bạn lắm. 🤔 Bạn có thể hỏi về "đơn hàng của tôi" hoặc nhờ "tư vấn món ăn".');
    }
  } catch (err) {
    console.error(err);
    addMessage('Oop! Có lỗi xảy ra khi kết nối với máy chủ. Vui lòng thử lại sau.');
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