<template>
  <div class="register-page">
    <div class="design-container">
      <!-- Removed invalid CSS router-link -->
      <img src="../assets/img/anh.logo/anhchophandangkytaixe.jpg" alt="Background" class="bg-image">

      <div class="form-card">
        <div class="header-nav">
          <router-link to="/" class="back-link">
            <span class="back-icon">‹</span> Quay lại
          </router-link>
      <p style="text-align: center; margin-top: 15px;">
        Đăng ký người dùng? 
        <router-link to="/dangkynguoidung" class="switch-link" style="text-decoration: none; color: #2c7a3f; font-size: 14px; font-weight: 600;">
          Tại đây
        </router-link>
      </p>
        </div>

        <h3 class="form-title">Đăng Ký Dành Cho Tài Xế</h3>
        
        <form @submit.prevent="handleRegister" class="main-form">
          
          <div class="form-row">
            <label class="form-label">Tên đăng nhập:</label>
            <input 
              type="text" 
              v-model="username" 
              class="form-input"
              required
              placeholder="VD: taixe123"
            />
          </div>

          <div class="form-row">
            <label class="form-label">Mật khẩu:</label>
            <input 
              type="password" 
              v-model="password" 
              class="form-input"
              required
              placeholder="Nhập mật khẩu"
            />
          </div>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 10px 0;">

          <div class="form-row">
            <label class="form-label">Họ và tên:</label>
            <input 
              type="text" 
              v-model="fullName" 
              class="form-input"
              required
              placeholder="VD: Nguyễn Văn A"
            />
          </div>

          <div class="form-row">
            <label class="form-label">Email:</label>
            <input 
              type="email" 
              v-model="email" 
              class="form-input"
              required
              placeholder="Nhập email để nhận thông báo"
            />
          </div>
          
          <div class="form-row">
            <label class="form-label">Số điện thoại:</label>
            <input 
              id="phone" 
              type="text" 
              v-model="phone" 
              class="form-input"
              @input="restrictInputToNumbers"
              required
              maxlength="10"
            />
          </div>
          
          <div class="form-row">
            <label class="form-label">CCCD:</label>
            <input 
              id="cccd"
              type="text" 
              v-model="cccd" 
              class="form-input"
              @input="restrictInputToNumbers"
              required
              maxlength="12"
            />
          </div>

          <div class="form-row">
            <label class="form-label">Giới tính:</label>
            <div class="gender-container">
              <label class="radio-label">
                <input type="radio" value="Nam" v-model="gender">
                <span class="radio-checkmark"></span> Nam
              </label>
              <label class="radio-label">
                <input type="radio" value="Nữ" v-model="gender">
                <span class="radio-checkmark"></span> Nữ
              </label>
            </div>
          </div>

          <div class="form-row">
            <label class="form-label">Nơi ở:</label>
            <input 
              type="text" 
              v-model="address" 
              class="form-input"
              required
            />
          </div>

          <div class="form-row">
            <label class="form-label">Phương tiện:</label>
            <input 
              type="text" 
              v-model="vehicle" 
              class="form-input"
              required
              placeholder="VD: Honda Wave Alpha"
            />
          </div>

          <div class="btn-container">
            <button type="submit" class="submit-btn" :disabled="isLoading">
              {{ isLoading ? 'Đang xử lý...' : 'Đăng Ký' }}
            </button>
          </div>

        </form>

        <div class="footer-link">
          <router-link to="/login" class="login-link">Đã có TK? Đăng Nhập</router-link>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
// import emailjs from '@emailjs/browser'; // Uncomment if installed

const router = useRouter();
// ... (rest)
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Lỗi đăng ký');
    }

    // --- gửi email sau khi đăng ký OK (Optional) ---
    // if (window.emailjs) { ... } or if installed. 
    // Commented out to avoid errors if pkg missing, but you can enable it.
    /*
    const templateParams = {
      to_name: n,
      to_email: em,
      message: `Tài khoản mới: ${u} - Role: Tài xế - Xe: ${ve}`,
      user_role: 'Tài xế'
    };
    // emailjs.send(...) 
    */

    alert('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
    router.push('/login');
  } catch (error) {
    console.error('Lỗi quy trình đăng ký:', error);
    alert('Đăng ký thất bại: ' + error.message);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* CSS Giữ nguyên như cũ */
/* REMOVED :global(body) rule to prevent affecting other pages */
/* :global(body) { margin: 0; padding: 0; overflow: hidden; } */

.register-page {
  background-color: #e8dbc8;
  width: 100vw; height: 100vh;
  display: flex; justify-content: center; align-items: center;
  /* Use fixed positioning to cover screen but ensure z-index is high */
  position: fixed; top: 0; left: 0; z-index: 1000;
  overflow: hidden;
}

.design-container { position: relative; width: 100%; height: 100%; }

.bg-image {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
  mix-blend-mode: multiply;
}

.form-card {
  position: absolute; top: 50%; right: 15%; 
  transform: translateY(-50%);
  width: 450px; max-width: 90%;
  background-color: #fff;
  border-radius: 20px;
  padding: 20px 30px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  display: flex; flex-direction: column;
}

.header-nav { width: 100%; margin-bottom: 5px; }

.back-link {
  text-decoration: none; color: #ff6b6b;
  font-size: 14px; font-weight: 500;
  display: flex; align-items: center;
}

.back-icon { font-size: 20px; margin-right: 5px; line-height: 1; }

.form-title {
  text-align: center; font-size: 20px; font-weight: bold;
  color: #2c7a3f; margin: 10px 0 20px 0;
}

.main-form { display: flex; flex-direction: column; gap: 15px; }

.form-row { display: flex; align-items: center; justify-content: space-between; }

.form-label { width: 35%; font-size: 14px; font-weight: 600; color: #333; }

.form-input {
  width: 60%; background-color: #e6e6e6;
  border: 2px solid transparent; border-radius: 4px;
  padding: 8px 12px; font-size: 14px; outline: none;
  height: 35px; transition: all 0.3s ease; 
}
.form-input:focus { border-color: #2c7a3f; background-color: #fff; }

.gender-container { width: 60%; display: flex; gap: 20px; align-items: center; height: 35px; }

.radio-label {
  font-size: 14px; display: flex; align-items: center; gap: 8px;
  cursor: pointer; position: relative;
}
.radio-label input[type="radio"] { position: absolute; opacity: 0; cursor: pointer; }

.radio-checkmark {
  position: relative; height: 18px; width: 18px;
  background-color: #e6e6e6; border: 2px solid transparent;
  border-radius: 50%; transition: all 0.3s ease;
}
.radio-label:hover input ~ .radio-checkmark { background-color: #ccc; }
.radio-label input:checked ~ .radio-checkmark { background-color: #fff; border-color: #2c7a3f; }
.radio-checkmark:after { content: ""; position: absolute; display: none; }
.radio-label input:checked ~ .radio-checkmark:after { display: block; }
.radio-label .radio-checkmark:after {
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 8px; height: 8px; border-radius: 50%; background: #2c7a3f;
}

.btn-container { margin-top: 20px; display: flex; justify-content: center; }

.submit-btn {
  color: #fff; font-weight: bold; font-size: 16px;
  border: none; border-radius: 8px; padding: 10px 40px;
  cursor: pointer; transform: scale(0.95);
  background-color: #2c7a3f; width: 100%;
}
.submit-btn:hover { background-color: #246332; }
.submit-btn:disabled { background-color: #ccc; cursor: not-allowed; }

.footer-link { text-align: center; margin-top: 15px; }
.login-link { font-size: 13px; color: #2c7a3f; text-decoration: none; font-weight: 500; }

@media (max-width: 768px) {
  .form-card { right: auto; left: 50%; transform: translate(-50%, -50%); width: 95%; }
}
</style>