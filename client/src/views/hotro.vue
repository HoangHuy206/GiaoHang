<template>
  <div class="hotro-page-wrapper animate-fade-in">
    <StandardHeader />
    <div class="hotro-page p-8 max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-green-800 mb-6">Hỗ Trợ Khách Hàng</h1>
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Cột trái: Thông tin liên hệ -->
        <div class="lg:col-span-1 space-y-6">
          <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 class="font-bold text-green-800 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.79 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l2.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              Liên hệ nhanh
            </h3>
            <p class="text-sm font-bold">Hotline:</p>
            <p class="text-green-600 mb-4"> 0377120866 (24/7)</p>
            
            <p class="text-sm font-bold">Email:</p>
            <p class="text-green-600"> haiquan2482006@gmail.com</p>
          </div>

          <div class="bg-green-600 text-white p-6 rounded-xl shadow-md">
            <h3 class="font-bold mb-2">Bạn có biết?</h3>
            <p class="text-sm opacity-90 leading-relaxed">
              Hầu hết các vấn đề về đơn hàng có thể được xử lý nhanh nhất qua mục "Chat với tài xế" trong phần Theo dõi đơn hàng.
            </p>
          </div>
        </div>
      </div>

      <!-- Cột phải: Form gửi hỗ trợ -->
      <div class="lg:col-span-2">
        <div class="bg-white p-8 rounded-xl shadow-md border border-gray-100">
          <h3 class="text-xl font-bold text-gray-800 mb-6">Gửi yêu cầu hỗ trợ</h3>
          
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                <input v-model="form.name" type="text" required class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Nguyễn Văn A">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input v-model="form.phone" type="tel" required class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="09xx xxx xxx">
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Địa chỉ Email</label>
              <input v-model="form.email" type="email" required class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="name@example.com">
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Vấn đề cần hỗ trợ</label>
              <select v-model="form.subject" class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                <option value="order">Lỗi đặt hàng / Thanh toán</option>
                <option value="driver">Khiếu nại tài xế</option>
                <option value="account">Vấn đề tài khoản</option>
                <option value="other">Vấn đề khác</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Nội dung chi tiết</label>
              <textarea v-model="form.message" rows="4" required class="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Mô tả chi tiết vấn đề của bạn..."></textarea>
            </div>

            <button type="submit" :disabled="isSubmitting" class="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2">
              <span v-if="isSubmitting" class="animate-spin text-xl">⏳</span>
              {{ isSubmitting ? 'Đang gửi...' : 'Gửi Yêu Cầu' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import axios from 'axios';
import StandardHeader from '../components/StandardHeader.vue';
import { useToastStore } from '../stores/toast';
import { API_BASE_URL } from '../config';

const isSubmitting = ref(false);
const toast = useToastStore();
const form = reactive({
  name: '',
  phone: '',
  email: '',
  subject: 'order',
  message: ''
});

const handleSubmit = async () => {
  isSubmitting.value = true;
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/support`, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        subject: form.subject,
        message: form.message
    });

    if (response.data.success) {
        toast.success("Cảm ơn bạn! Yêu cầu hỗ trợ đã được gửi. Chúng tôi sẽ phản hồi sớm nhất có thể.");
        // Reset form
        form.name = '';
        form.phone = '';
        form.email = '';
        form.subject = 'order';
        form.message = '';
    } else {
        toast.error("Có lỗi xảy ra: " + (response.data.error || "Không thể gửi yêu cầu."));
    }
  } catch (error) {
    console.error("Support submission error:", error);
    toast.error("Lỗi kết nối Server. Vui lòng thử lại sau.");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.hotro-page {
  min-height: calc(100vh - 80px);
  background-color: #f9fafb;
}
</style>