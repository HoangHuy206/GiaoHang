<template>
  <div class="login-page animate-fade-in">
    <div class="container">
      
      <div class="left-side">
        <img :src="shipperImg" alt="Shipper Illustration" class="shipper-img" />
      </div>

      <div class="right-side">
        <div class="login-card">
          <h2 class="login-header">ĐĂNG NHẬP</h2>

          <form @submit.prevent="handleLogin">
            <div class="input-group">
              <input type="text" v-model="username" placeholder="Tên đăng nhập..." required />
            </div>

            <div class="input-group">
              <input type="password" v-model="password" placeholder="Mật khẩu..." required />
            </div>

            <button type="submit" class="btn btn-login" :disabled="loading">
               {{ loading ? 'Đang xử lý...' : 'Đăng Nhập' }}
            </button>
          
            <router-link to="/hoidangky" style="margin-top: 20px; margin-bottom: 20px; display: block;">
              <button type="button" class="btn btn-register">Đăng ký tài khoản mới</button>
            </router-link>

            <a href="#" @click.prevent="showForgotModal = true" style="color: blue; text-decoration: none; font-size: 14px; display: block; text-align: right;">
              Quên mật khẩu?
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
          <p>Mã xác thực 6 số đã được gửi tới <strong>{{ forgotEmail }}</strong>.</p>
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
const loading = ref(false);
const username = ref('');
const password = ref('');
const shipperImg = ref(shipperImgSource);

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
    const res = await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email: forgotEmail.value });
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
    await axios.post(`${API_BASE_URL}/api/auth/verify-code`, { email: forgotEmail.value, code: forgotCode.value });
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
    const res = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
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

const handleLogin = async () => {
  if (!username.value || !password.value) {
    toast.warning("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!");
    return;
  }

  loading.value = true;
  try {
    await auth.login(username.value, password.value);
    if (auth.user.role === 'admin') router.push('/admin');
    else if (auth.user.role === 'driver') router.push('/trangchutaixe'); 
    else if (auth.user.role === 'shop') router.push('/shop-admin');
    else router.push('/food');
    toast.success("Đăng nhập thành công!");
  } catch (error) {
    toast.error(error || "Sai tài khoản hoặc mật khẩu!");
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page { font-family: 'Roboto', sans-serif; background-color: #FEF5E7; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
.container { display: flex; width: 90%; max-width: 1100px; align-items: center; }
.left-side { flex: 1.2; display: flex; justify-content: center; padding: 20px; }
.shipper-img { max-width: 100%; height: auto; border-radius: 20px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1)); }
.right-side { flex: 1; display: flex; justify-content: center; }
.login-card { background: white; padding: 40px; border-radius: 25px; width: 100%; max-width: 450px; box-shadow: 0 15px 35px rgba(0,0,0,0.05); }
.login-header { font-size: 28px; font-weight: 700; margin-bottom: 30px; text-align: center; }
.input-group { margin-bottom: 15px; }
.input-group input { width: 100%; padding: 12px; border: 1px solid #eee; border-radius: 10px; background: #F8F9FA; outline: none; box-sizing: border-box; }
.input-group input:focus { border-color: #FF9900; background: #fff; }
.btn { width: 100%; padding: 12px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.3s; }
.btn-login { background: #FF9900; color: white; margin-top: 10px; }
.btn-register { background: #6c757d; color: white; }
.divider { margin: 20px 0; position: relative; text-align: center; }
.divider::before { content: ""; position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: #eee; }
.divider span { background: white; padding: 0 10px; color: #999; font-size: 13px; position: relative; }
.social-login-container { display: flex; justify-content: center; margin-bottom: 10px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(5px); }
.modal-content { background: white; padding: 25px; border-radius: 20px; width: 90%; max-width: 400px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #999; }
.btn-text { background: none; border: none; color: #FF9900; font-weight: 600; cursor: pointer; margin-top: 10px; width: 100%; }
@media (max-width: 850px) { .container { flex-direction: column; } .left-side { display: none; } }
</style>