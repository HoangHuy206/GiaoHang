import { defineStore } from 'pinia';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/api`;

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
  }),
  actions: {
    async login(username, password) {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, { username, password });
        if (response.data.success) {
          this.user = response.data.user;
          this.token = response.data.token;
          localStorage.setItem('user', JSON.stringify(this.user));
          localStorage.setItem('token', this.token);
          
          // Cấu hình axios gửi token cho các request sau
          axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
          
          return true;
        }
      } catch (error) {
        throw error.response?.data?.error || 'Đăng nhập thất bại';
      }
    },
    async register(userData) {
      try {
        await axios.post(`${API_URL}/auth/register`, userData);
        return true;
      } catch (error) {
        throw error.response?.data?.error || 'Đăng ký thất bại';
      }
    },
    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    }
  }
});

// Khôi phục token cho axios khi reload trang
const savedToken = localStorage.getItem('token');
if (savedToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}
