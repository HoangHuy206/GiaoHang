<template>
  <div class="login-page animate-fade-in">
    <div class="container">
      
      <div class="left-side">
        <!-- Sử dụng ảnh placeholder chuyên nghiệp vì file nội bộ chưa tồn tại -->
        <img :src="shipperImg" alt="Shipper Illustration" class="shipper-img" />
      </div>

      <div class="right-side">
        <div class="login-card">
          <h2 class="login-header">ĐĂNG NHẬP</h2>

          <form @submit.prevent="handleLogin">
            <div class="input-group">
              <input 
                type="text" 
                v-model="username" 
                placeholder="Tên đăng nhập..." 
                required
              />
            </div>

            <div class="input-group">
              <input 
                type="password" 
                v-model="password" 
                placeholder="Mật khẩu..." 
                required
              />
            </div>

          
            <button type="submit" class="btn btn-login" :disabled="loading">
               {{ loading ? 'Đang xử lý...' : 'Đăng Nhập' }}
            </button>
          
            <div class="divider">
              <span>Hoặc</span>
            </div>

            <router-link to="/hoidangky" style="margin-bottom: 20px; display: block;">
              <button type="button" class="btn btn-register">Đăng ký</button>
            </router-link>

            <a href="#" @click.prevent="showForgotModal = true" style="margin-left: 60%; color: blue; text-decoration: none; font-size: 14px;">
              Quên mật khẩu
            </a>
          </form>
        </div>
      </div>

    </div>

    <!-- Forgot Password Modal -->
    <div v-if="showForgotModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Quên mật khẩu</h3>
          <button @click="closeForgotModal" class="close-btn">&times;</button>
        </div>
        
        <div v-if="forgotStep === 1" class="modal-body">
          <p>Nhập email liên kết với tài khoản của bạn để nhận mã xác thực.</p>
          <div class="input-group">
            <input type="email" v-model="forgotEmail" placeholder="Email của bạn..." required />
          </div>
          <button @click="handleSendCode" class="btn btn-login" :disabled="forgotLoading">
            {{ forgotLoading ? 'Đang gửi mã...' : 'Gửi mã xác nhận' }}
          </button>
        </div>

        <div v-if="forgotStep === 2" class="modal-body">
          <p>Mã xác thực 6 số đã được gửi tới <strong>{{ forgotEmail }}</strong>. Mã có hiệu lực trong 5 phút.</p>
          <div class="input-group">
            <input type="text" v-model="forgotCode" placeholder="Nhập mã 6 số..." maxlength="6" required />
          </div>
          <button @click="handleVerifyCode" class="btn btn-login" :disabled="forgotLoading">Tiếp theo</button>
          <button @click="forgotStep = 1" class="btn-text">Quay lại</button>
        </div>

        <div v-if="forgotStep === 3" class="modal-body">
          <p>Nhập mật khẩu mới cho tài khoản của bạn.</p>
          <div class="input-group">
            <input type="password" v-model="newPassword" placeholder="Mật khẩu mới..." required />
          </div>
          <div class="input-group">
            <input type="password" v-model="confirmPassword" placeholder="Xác nhận mật khẩu mới..." required />
          </div>
          <button @click="handleResetPassword" class="btn btn-login" :disabled="forgotLoading">Cập nhật mật khẩu</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import shipperImgSource from '@/assets/img/anh.logo/anhbiadangnhap1.png';

const auth = useAuthStore();
const toast = useToastStore();
const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);

// Forgot Password State
const showForgotModal = ref(false);
const forgotStep = ref(1);
const forgotEmail = ref('');
const forgotCode = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const forgotLoading = ref(false);

const closeForgotModal = () => {
  showForgotModal.value = false;
  forgotStep.value = 1;
  forgotEmail.value = '';
  forgotCode.value = '';
  newPassword.value = '';
  confirmPassword.value = '';
};

const handleSendCode = async () => {
  if (!forgotEmail.value) return toast.warning("Vui lòng nhập email!");
  forgotLoading.value = true;
  try {
    const res = await axios.post(`${API_BASE_URL}/api/forgot-password`, { email: forgotEmail.value });
    toast.success(res.data.message);
    forgotStep.value = 2;
  } catch (err) {
    toast.error(err.response?.data?.error || "Lỗi gửi mã!");
  } finally {
    forgotLoading.value = false;
  }
};

const handleVerifyCode = async () => {
  if (forgotCode.value.length !== 6) return toast.warning("Mã xác thực phải có 6 số!");
  forgotLoading.value = true;
  try {
    await axios.post(`${API_BASE_URL}/api/verify-code`, { email: forgotEmail.value, code: forgotCode.value });
    forgotStep.value = 3;
  } catch (err) {
    toast.error(err.response?.data?.error || "Mã không đúng hoặc hết hạn!");
  } finally {
    forgotLoading.value = false;
  }
};

const handleResetPassword = async () => {
  if (newPassword.value.length < 6) return toast.warning("Mật khẩu phải từ 6 ký tự!");
  if (newPassword.value !== confirmPassword.value) return toast.warning("Mật khẩu xác nhận không khớp!");
  
  forgotLoading.value = true;
  try {
    const res = await axios.post(`${API_BASE_URL}/api/reset-password`, {
      email: forgotEmail.value,
      code: forgotCode.value,
      newPassword: newPassword.value
    });
    toast.success(res.data.message);
    closeForgotModal();
  } catch (err) {
    toast.error(err.response?.data?.error || "Lỗi đổi mật khẩu!");
  } finally {
    forgotLoading.value = false;
  }
};

// Sử dụng ảnh minh họa shipper
const shipperImg = ref(shipperImgSource);

const handleLogin = async () => {
  if (!username.value || !password.value) {
    toast.warning("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
    return;
  }

  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    
    // Phân quyền điều hướng dựa trên logic dự án hiện tại
    if (auth.user.role === 'admin') {
      toast.success(`Xin chào Admin ${auth.user.full_name || auth.user.username}!`);
      router.push('/admin');
    } else if (auth.user.role === 'driver') {
      toast.success(`Xin chào Tài xế ${auth.user.full_name || auth.user.username}!`);
      router.push('/trangchutaixe'); 
    } else if (auth.user.role === 'shop') {
      toast.success(`Chào mừng chủ shop ${auth.user.full_name || auth.user.username}!`);
      router.push('/shop-admin');
    } else {
      toast.success(`Chào mừng ${auth.user.full_name || auth.user.username} quay trở lại!`);
      router.push('/food');
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    toast.error(error || "Sai tài khoản hoặc mật khẩu!");
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
 @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@700&family=Roboto:wght@400;500&display=swap');

.login-page {
  font-family: 'Roboto', sans-serif;
  background-color: #FEF5E7;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  display: flex;
  width: 90%;
  max-width: 1100px;
  background-color: transparent;
  align-items: center;
}

.left-side {
  flex: 1.2;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.shipper-img {
  max-width: 100%;
  height: auto;
  border-radius: 20px;
  object-fit: contain;
  filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
}

.right-side {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  background-color: white;
  padding: 50px 40px;
  border-radius: 25px;
  width: 100%;
  max-width: 450px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.login-header {
  font-family: 'Merriweather', serif;
  font-size: 28px;
  font-weight: 700;
  color: #000;
  margin-bottom: 40px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group input {
  width: 100%;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 12px;
  background-color: #F8F9FA;
  font-size: 16px;
  outline: none;
  transition: all 0.3s;
  box-sizing: border-box; 
}

.input-group input:focus {
  border-color: #FF9900;
  background-color: #fff;
  box-shadow: 0 0 0 4px rgba(255, 153, 0, 0.1);
}

.btn {
  width: 100%;
  padding: 15px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s, transform 0.1s;
}

.btn:active {
  transform: scale(0.98);
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-login {
  background-color: #FF9900;
  color: white;
  margin-top: 10px;
}

.btn-login:hover:not(:disabled) {
  background-color: #e68a00;
  box-shadow: 0 5px 15px rgba(255, 153, 0, 0.3);
}

.btn-register {
  background-color: #6c757d;
  color: white;
}

.btn-register:hover {
  background-color: #5a6268;
}

.divider {
  margin: 25px 0;
  position: relative;
  text-align: center;
}

.divider::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: #eee;
  z-index: 0;
}

.divider span {
  background-color: white;
  padding: 0 15px;
  color: #999;
  font-size: 14px;
  font-weight: 500;
  position: relative;
  z-index: 1;
}

 @media (max-width: 850px) {
  .container {
    flex-direction: column;
  }
  
  .left-side {
    margin-bottom: 20px;
    max-width: 300px; 
  }

  .login-card {
    padding: 30px 20px;
    border-radius: 20px;
  }
  }

  /* Modal Styles */
  .modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
  }

  .modal-content {
  background: white;
  padding: 30px;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  position: relative;
  }

  .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  }

  .modal-header h3 {
  margin: 0;
  color: #2e7d32;
  font-family: 'Merriweather', serif;
  }

  .close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  }

  .modal-body p {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 20px;
  }

  .btn-text {
  background: none;
  border: none;
  color: #FF9900;
  font-weight: 600;
  cursor: pointer;
  margin-top: 15px;
  width: 100%;
  text-align: center;
  }

  .btn-text:hover {
  text-decoration: underline;
  }
  </style>