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
          localStorage.setItem('user', JSON.stringify(this.user));
          return true;
        }
      } catch (error) {
        throw error.response?.data?.error || 'Login failed';
      }
    },
    async register(userData) {
      try {
        await axios.post(`${API_URL}/auth/register`, userData);
        return true;
      } catch (error) {
        throw error.response?.data?.error || 'Registration failed';
      }
    },
    logout() {
      this.user = null;
      localStorage.removeItem('user');
    }
  }
});
