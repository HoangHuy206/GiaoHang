<template>
  <div class="chrome-crash-page">
    
    <div v-if="isLoading" class="white-screen"></div>

    <div v-else class="content-container">
      
      <div class="icon-wrapper">
        <img :src="errorImg" alt="Crash Icon" class="crash-img">
      </div>

      <h1 class="crash-title">Ôi, hỏng!</h1>
      <p class="crash-desc">Đã xảy ra lỗi khi hiển thị trang web này.</p>
      <p class="error-code">Mã lỗi: RESULT_CODE_KILLED</p>

      <div class="action-footer">
        <a href="https://support.google.com/chrome" target="_blank" class="link-help">Tìm hiểu thêm</a>
        <button class="btn-reload" @click="reloadPage">Tải lại</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import errorImg from './anhloi404.jpg';

const isLoading = ref(true);

onMounted(() => {
  // SỬA Ở ĐÂY: Delay 3 giây (3000ms)
  setTimeout(() => {
    isLoading.value = false;
  }, 3000);
});

const reloadPage = () => {
  window.location.reload();
};
</script>

<style scoped>
/* Reset cơ bản */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Khung bao ngoài cùng */
.chrome-crash-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: #fff;
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding-top: 12vh;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #202124;
}

/* Màn hình trắng loading */
.white-screen {
  width: 100%;
  height: 100%;
  background: #fff;
}

/* Khung nội dung chính */
.content-container {
  width: 100%;
  max-width: 600px;
  padding: 0 24px;
  text-align: left; /* Đảm bảo mọi thứ bên trong căn trái */
}

/* Icon Wrapper */
.icon-wrapper {
  margin-bottom: 24px;
}

/* SỬA Ở ĐÂY: Class mới cho ảnh */
.crash-img {
  width: 72px; /* Kích thước chuẩn icon Chrome */
  height: auto; /* Giữ tỷ lệ ảnh */
  display: block; /* Đảm bảo nằm riêng 1 dòng */
  /* Không cần margin-left/right vì container đã text-align: left */
}

/* Typography */
.crash-title {
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #202124;
}

.crash-desc {
  font-size: 15px;
  color: #5f6368;
  margin-bottom: 12px;
}

.error-code {
  font-size: 12px;
  color: #5f6368;
  margin-bottom: 40px;
  text-transform: uppercase;
}

/* Footer */
.action-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* Link */
.link-help {
  color: #1a73e8;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}
.link-help:hover {
  text-decoration: underline;
}

/* Nút Tải lại (Đã xóa đoạn text rác bị lỗi) */
.btn-reload {
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: background 0.2s;
}

.btn-reload:hover {
  background-color: #1765cc;
box-shadow: 0 1px 2px rgba(60,64,67,0.3);
}

.btn-reload:active {
  background-color: #1558b0;
}
</style>
