<template>
  <div class="selection-page">
    <div class="container">
      
      <div class="left-side">
        <img :src="shipperImg" alt="Shipper Illustration" class="shipper-img" />
      </div>

      <div class="right-side">
        <div class="selection-card">
          <h2 class="title">BẠN MUỐN ĐĂNG KÝ ?</h2>

          <div class="button-group">
            <button class="btn btn-user" @click="goToUserRegister">
              Người dùng
            </button>

            <button class="btn btn-driver" @click="goToDriverRegister">
              Tài xế
            </button>
          </div>
          
          <div style="margin-top: 20px;">
             <router-link to="/login" style="color: #666; text-decoration: none; font-size: 14px;">Quay lại Đăng nhập</router-link>
          </div>

        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
// Import using relative path
import shipperImg from '../assets/img/anh.logo/anhbiadangnhap1.png'; 

const router = useRouter();

const goToUserRegister = () => {
  router.push('/dangkynguoidung');
};

const goToDriverRegister = () => {
  router.push('/dangkytaixe');
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Roboto:wght@400;500;700&display=swap');

/* Cấu trúc trang (giống trang Login) */
.selection-page {
  font-family: 'Roboto', sans-serif;
  background-color: #FEF5E7; /* Màu nền kem */
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed; top: 0; left: 0; width: 100vw; z-index: 100; /* Ensure overlay */
}

.container {
  display: flex;
  width: 90%;
  max-width: 1200px;
  align-items: center;
}

/* --- PHẦN ẢNH --- */
.left-side {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.shipper-img {
  max-width: 100%;
  height: auto;
  object-fit: contain;
}

/* --- PHẦN BẢNG CHỌN --- */
.right-side {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.selection-card {
  background-color: white;
  padding: 60px 40px; /* Padding rộng để tạo khoảng trắng */
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.title {
  font-family: 'Merriweather', serif;
  font-size: 24px;
  font-weight: 700;
  color: #000;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Nhóm nút bấm */
.button-group {
  display: flex;
  justify-content: center;
  gap: 20px; /* Khoảng cách giữa 2 nút */
}

.btn {
  flex: 1; /* Hai nút rộng bằng nhau */
  padding: 15px 20px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  color: white;
  transition: transform 0.2s, opacity 0.2s;
  white-space: nowrap; /* Giữ chữ trên 1 dòng */
}

.btn:active {
  transform: scale(0.95);
}

.btn:hover {
  opacity: 0.9;
}

/* Màu nút */
.btn-user {
  background-color: #FF9900; /* Màu cam */
}

.btn-driver {
  background-color: #FF9900; /* Cũng màu cam giống ảnh */
}

/* Responsive Mobile */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
  
  .left-side {
    max-width: 250px;
    margin-bottom: 20px;
  }

  .button-group {
    flex-direction: column; /* Trên mobile nút xếp dọc */
  }
}
</style>
