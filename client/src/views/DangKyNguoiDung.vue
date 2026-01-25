<template>
  <div class="register-page">
    <div class="design-container">
      
      <img src="../assets/img/anh.logo/anhdangkynguoidung.png" alt="Background" class="bg-image">

      <div class="phone-screen-overlay">
        <h3 class="mini-title" style="margin-right: 20px;">Đăng Ký Người Dùng</h3>
        
        <form @submit.prevent="handleRegister" class="mini-form">
          <input 
            type="text" 
            v-model="fullname" 
            placeholder="Họ và tên của bạn" 
            class="mini-input"
            required style="margin-right: 20px;"
          />

          <input 
            type="email" 
            v-model="email" 
            placeholder="Địa chỉ Gmail của bạn" 
            class="mini-input"
            required style="margin-right: 20px;"
          />

          <input 
            type="text" 
            v-model="username" 
            placeholder="Tên đăng nhập" 
            class="mini-input"
            required style="margin-right: 20px;"
          />
          
          <input 
            type="password" 
            v-model="password" 
            placeholder="Mật khẩu" 
            class="mini-input"
            required style="margin-right: 20px;"
          />
          
          <input 
            type="password" 
            v-model="confirmPassword" 
            placeholder="Nhập lại MK" 
            class="mini-input"
            required style="margin-right: 20px;"
          />

          <button type="submit" class="mini-btn" style="margin-right: 20px;">Đăng ký</button>
        </form>

        <router-link to="/login" class="mini-link" style="margin-right: 20px;">Đã có TK? Đăng nhập</router-link>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';

const router = useRouter();
const fullname = ref(''); // Thêm ref cho Họ tên
const email = ref('');
const username = ref('');
const password = ref('');
const confirmPassword = ref('');

const handleRegister = async () => {
  // ... (password check)
  if (password.value !== confirmPassword.value) {
    alert("Mật khẩu nhập lại không khớp!");
    return;
  }

  try {
    // 2. Gửi dữ liệu về Server (Bao gồm cả email)
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fullName: fullname.value,
        email: email.value,
        username: username.value,
        password: password.value,
        role: 'user'
      })
    });

    const data = await response.json();

    // 3. Xử lý kết quả
    if (response.ok && data.success) {
      alert("Đăng ký thành công! Hãy đăng nhập ngay.");
      router.push('/login'); 
    } else {
      alert("Lỗi: " + (data.error || "Đăng ký thất bại"));
    }

  } catch (error) {
    console.error("Lỗi kết nối:", error);
    alert("Không thể kết nối tới Server. Hãy đảm bảo file server.js đang chạy!");
  }
};
</script>

<style scoped>
/* Giữ nguyên phần CSS cũ của bạn */
.register-page {
  background-color: #e8dbc8;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: flex-end; 
  overflow: hidden;
  padding-bottom: 0;
  /* Ensure it covers other content */
  position: fixed; top: 0; left: 0; width: 100vw; z-index: 1000;
}

.design-container {
  position: relative;
  width: 1450px; 
  max-width: 100vw; 
}

.bg-image {
  width: 100%; 
  height: auto;
  display: block;
  mix-blend-mode: multiply;
  margin-bottom: -10px; 
}

.phone-screen-overlay {
  position: absolute;
  top: 11%;
  right: 28.5%;
  width: 17%; 
  height: 77%;
  border-radius: 28px;
  padding: 25px 15px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  /* Removed inset shadow as it might look weird on some displays */
  /* box-shadow: inset 0 0 15px rgba(0,0,0,0.05); */
}

.mini-title {
  font-size: 16px; 
  color: #2c7a3f;
  margin-bottom: 18px;
  text-transform: uppercase;
  font-weight: 800;
  white-space: nowrap;
}

.mini-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mini-input {
  width: 90%;
  margin: 0 auto;
  font-size: 13px; 
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #f8f9fa;
  outline: none;
}

.mini-input:focus {
  border-color: #2c7a3f;
  background: #fff;
}

.mini-btn {
  width: 90%;
  margin: 12px auto 0;
  background-color: #2c7a3f;
  color: white;
  border: none;
  font-size: 13px; 
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.mini-btn:hover {
  background-color: #246332;
}

.mini-link {
  font-size: 12px;
  margin-top: 12px;
  color: #666;
  text-decoration: none;
}

@media (max-width: 600px) {
  .register-page { align-items: center; }
  .design-container { width: 100%; }
  .phone-screen-overlay {
    position: static;
    width: 80%;
    height: auto;
    margin: 20px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 10px;
  }
  .bg-image { display: none; }
}
</style>