import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Login from '../views/Login.vue';
import DangKyTaiXe from '../views/DangKyTaiXe.vue';
import DangKyNguoiDung from '../views/DangKyNguoiDung.vue';
import HoiDangKy from '../views/HoiDangKy.vue';
import Food from '../views/Food.vue';
import Restaurant from '../views/Restaurant.vue';
import GioHang from '../views/GioHang.vue';
import TheoDoiDonHang from '../views/TheoDoiDonHang.vue';
import ThanhToan from '../views/ThanhToan.vue';
import TrangChuTaiXe from '../views/TrangChuTaiXe.vue';
import ShopDashboard from '../views/ShopDashboard.vue';
import ShopStats from '../views/ShopStats.vue';
import Profile from '../views/Profile.vue';
import PageNotFound from '../assets/img/A404/l404.vue';

import hotro from '../views/hotro.vue';

const routes = [
  { path: '/', component: Home ,meta: { title: 'Trang chủ - Giao Hàng' } },
  { path: '/login', component: Login ,meta: { title: 'Đăng nhập ' } },
  { path: '/hoidangky', component: HoiDangKy , meta: { title: 'Hỏi đăng ký' } },
  { path: '/dangkynguoidung', component: DangKyNguoiDung, meta: { title: 'Đăng ký người dùng' } },
  { path: '/dangkytaixe', component: DangKyTaiXe, meta: { title: 'Đăng ký tài xế ' } },
  { path: '/food', component: Food, meta: { title: 'Đồ ăn' }  },
  { path: '/restaurant/:id', component: Restaurant , meta: { title: 'Nhà hàng' }  },
  { path: '/giohang', component: GioHang , meta: { title: 'Giỏ Hàng', requiresAuth: true } },
  { path: '/theodoidonhang', component: TheoDoiDonHang, meta: { title: 'Theo dõi đơn hàng', requiresAuth: true } },
  { path: '/thanhtoan', component: ThanhToan, meta: { title: 'Thanh toán', requiresAuth: true } },
  { path: '/trangchutaixe', component: TrangChuTaiXe, meta: { title: 'Trang chủ tài xế', requiresAuth: true } }, 
  { path: '/shop-admin', component: ShopDashboard, meta: { title: 'Shop', requiresAuth: true } }, 
  { path: '/shop-stats', component: ShopStats, meta: { title: 'Thống kê Shop', requiresAuth: true } },
  { path: '/profile', component: Profile, meta: { title: 'Trang cá nhân', requiresAuth: true } },
 
  { path: '/hotro', component: hotro, meta: { title: 'Trung Tâm Hỗ Trợ' } },
  { path: '/:pathMatch(.*)*', component: PageNotFound, meta: { title: '404 - Không tìm thấy trang' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  document.title = to.meta.title || 'Giao Hàng Tận Nơi';

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Tự động điều hướng tài xế và chủ shop khi vào trang chủ
  if (to.path === '/' && user) {
    if (user.role === 'driver') {
      return next('/trangchutaixe');
    } else if (user.role === 'shop') {
      return next('/shop-admin');
    }
  }

  if (to.meta.requiresAuth && !user) {
    // Nếu trang yêu cầu đăng nhập mà chưa có user -> chuyển về login
    alert("Bạn cần đăng nhập để truy cập trang này!");
    next('/login');
  } else {
    next();
  }
});

export default router;