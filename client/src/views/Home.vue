<script setup>
import { ref, watch } from 'vue'

const isMenuOpen = ref(false)
const activeTab = ref('nguoidung') // Tab chính: Người dùng / Tài xế
const activeMenuTab = ref('nguoidung') // Tab trong menu: Grab / Người dùng / Đối tác

/* Khóa cuộn trang khi mở menu */
watch(isMenuOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : 'auto'
})
</script>

<template>
  <div id="home-page">
    <header>
      <a href="#" @click.prevent="isMenuOpen = !isMenuOpen" class="menu-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </a>
      
      <router-link to="/">
        <img src="@/assets/img/anh.logo/anhnen.png" alt="Logo" class="header-logo" style="width: 200px; height: 150px;">
      </router-link>

      <div class="header-right">
        <router-link to="" class="support-link">
          <p>Trung Tâm Hỗ Trợ</p>
        </router-link>
        <router-link to="/login">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        </router-link>
      </div>
    </header>

    <div v-if="isMenuOpen" class="mega-menu-container">
      <div class="mega-menu-content">
        <ul class="menu-sidebar">
          <li @mouseenter="activeMenuTab = 'grab'" :class="{ active: activeMenuTab === 'grab'}">Về Giao Hàng</li>
          <li @mouseenter="activeMenuTab = 'nguoidung'" :class="{ active: activeMenuTab === 'nguoidung' }">Người dùng</li>
          <li @mouseenter="activeMenuTab = 'doitac'" :class="{ active: activeMenuTab === 'doitac' }">Đối tác tài xế</li>
        </ul>

        <div class="menu-horizontal-content">
          <template v-if="activeMenuTab === 'grab'">
            <div class="menu-column">
              <h3>Về chúng tôi</h3>
              <ul>
                <li>Câu chuyện của tài xế</li>
                <li>Chúng tôi là ai và sứ mệnh</li>
              </ul>
            </div>
            <div class="menu-column">
              <h3>Tin tưởng & An toàn</h3>
              <ul>
                <li>Các chính sách an toàn</li>
              </ul>
            </div>
          </template>

          <template v-if="activeMenuTab === 'nguoidung'">
            <div class="menu-column">
              <h3>Có gì mới?</h3>
              <ul><li>Sự kiện nổi bật</li><li>Ưu đãi hấp dẫn</li></ul>
            </div>
            <div class="menu-column">
              <h3>Di chuyển</h3>
              <ul><li>Tất cả vì sở thích của bạn</li></ul>
            </div>
            <div class="menu-column">
              <h3>Giao Đồ Ăn</h3>
              <ul><li>Món ngon tại nhà</li><li>Khuyến mãi</li></ul>
            </div>
            <div class="menu-column">
              <h3>Ví điện tử</h3>
              <ul><li>Liên kết thẻ</li><li>Nạp tiền</li></ul>
            </div>
          </template>

          <template v-if="activeMenuTab === 'doitac'">
            <div class="menu-column">
              <h3>Thông tin mới nhất</h3>
              <ul><li>Thông báo cho Tài xế</li></ul>
            </div>
            <div class="menu-column">
              <h3>Di chuyển</h3>
              <ul><li>Làm chủ tài chính</li></ul>
            </div>
            <div class="menu-column">
              <h3>Giao đồ ăn</h3>
              <ul><li>Kiếm thêm thu nhập</li></ul>
            </div>
          </template>
        </div>
      </div>
      <div class="overlay" @click="isMenuOpen = false"></div>
    </div>

    <div class="background-img">
      <img src="@/assets/img/anh.logo/z7435869738899_000_e53e72bd89e38a070e1aa4f3a917f074.jpg" alt="Background">
    </div>

    <div class="content-intro">
      <h2>Từ những dịch vụ thiết yếu đến cơ hội gia tăng thu nhập, tất cả đều có trên 1 nền tảng</h2>
    </div>

    <div class="display-section">
      <div class="tab-navigation">
        <button :class="{ active: activeTab === 'nguoidung' }" @click="activeTab = 'nguoidung'">
          Người tiêu dùng
        </button>
        <button :class="{ active: activeTab === 'taixe' }" @click="activeTab = 'taixe'">
          Đối tác tài xế
        </button>
      </div>

      <div class="tab-content-wrapper">
        <div v-if="activeTab === 'nguoidung'" class="content-layout fadeIn">
          <div class="left-column">
            <h2>Giao hàng</h2>
          </div>
          <div class="right-column">
            <div class="service-item">
              <div class="icon-box"><img src="@/assets/img/anh.logo/icondoan.png" alt="Food"></div>
              <div class="text-box">
                <router-link to="/login" class="no-underline">
                  <h3>Đồ ăn</h3>
                  <p>Giao món ngon tận tay.</p>
                </router-link>
              </div>
            </div>

            <div class="service-item">
              <div class="icon-box"><img src="@/assets/img/anh.logo/tuido.png" alt="Mart"></div>
              <router-link to="/:pathMatch" style="text-decoration: none;">
              <div class="text-box">
                <h3>Đi chợ</h3>
                <p>Tìm kiếm mọi thứ bạn cần, hàng tạp hóa và hơn thế nữa.</p>
              </div>
             </router-link>
            </div>

            <div class="service-item" >
              <div class="icon-box"><img src="@/assets/img/anh.logo/traohang.png" alt="Express"></div>
              <div class="text-box">
                <router-link to="/:pathMatch" style="text-decoration: none;">
                <h3>Giao hàng</h3>
                <p>Giao hàng, gói kiện siêu tốc.</p>
               </router-link>
              </div> 
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'taixe'" class="content-layout fadeIn">
          <div class="left-column"><h2>Thu nhập</h2></div>
          <div class="right-column">
            <div class="service-item">
              <div class="icon-box"><img src="@/assets/img/anh.logo/anhnen.png" alt="Driver"></div>
              <router-link to="/dangkytaixe" style="text-decoration: none;">
              <div class="text-box">
                <h3>Đăng ký lái xe</h3>
                <p>Trở thành đối tác để gia tăng thu nhập ngay hôm nay.</p>
              </div>
            </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h1 style="text-align: center;">Sự đóng góp của chúng tôi về thị trường Việt Nam</h1>
      <div class="card-container">
        <div class="info-card">
          <h3>Thúc đẩy chuyển đổi số</h3>
          <p> Thúc đẩy du lịch địa phương thông qua hợp tác công – tư, điển hình là thỏa thuận hợp tác ba năm với Thành phố Huế. Nhiều sáng kiến và tính năng được triển khai nhằm thúc đẩy chuyển đổi số cho người dân, đối tác địa phương, đồng thời thu hút du khách</p>
        </div>
        <div class="info-card">
          <h3>Tăng tốc chuyển đổi xanh</h3>
          <p style="max-width: 500px; margin: 0 auto;">Đẩy mạnh hợp tác công-tư tại thành phố lớn để giảm phát thải, hướng đến mục tiêu Net Zero. Các sáng kiến gồm kết nối các chuyến xe Grab với nhà ga metro, tạo điều kiện cho đối tác tài xế tiếp cận xe điện, đồng thời tạo điều kiện cho người dùng đóng góp vào các dự án tín chỉ carbon và dự án trồng rừng thông qua Chương trình Vững-Xanh.</p>
        </div>
      </div>
      <div class="button-wrapper" style="text-align: center;">
        <button class="btn-more">Tìm hiểu thêm</button>
      </div>
    </div>

    <div class="footer">
      <div class="footer-container">
        <div class="footer-column branding">
          <img src="@/assets/img/anh.logo/anhnen.png" alt="Logo Footer" class="footer-logo" style="width: 200px; height: 150px;">
          <div class="address-box">
            <h4>ĐỊA CHỈ</h4>
            <div class="map-container">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.296073307177!2d105.7475674103227!3d21.020836187970833!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3134549c574476c3%3A0xd3c6af79105ea6da!2zVHLGsOG7nW5nIENhbyDEkeG6s25nIEPDtG5nIG5naOG7hyBDYW8gSMOgIE7hu5lp!5e0!3m2!1svi!2s!4v1768890509326!5m2!1svi!2s"
                width="100%"
                height="200"
                style="border:0;"
                allowfullscreen
                loading="lazy"
              ></iframe>
            </div>
          </div>
        </div>

        <div class="footer-column">
          <h4>Người dùng</h4>
          <ul>
            <li><router-link to="/login">Có gì mới?</router-link></li>
            <li><router-link to="/food">Món ngon</router-link></li>
            <li><router-link to="/food">Dịch vụ Food</router-link></li>
          </ul>
        </div>

        <div class="footer-column">
          <h4>Đối tác tài xế</h4>
          <ul>
            <li><router-link to="/dangkytaixe">Thông tin mới</router-link></li>
            <li><router-link to="/dangkytaixe">Di chuyển</router-link></li>
            <li><router-link to="/dangkytaixe">Trung tâm tài xế</router-link></li>
          </ul>
        </div>

        <div class="footer-column">
          <h4>Hợp tác</h4>
          <ul>
            <li><router-link to="/">Giao Hàng Tận Nơi</router-link></li>
          </ul>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>Theo dõi chúng tôi @2026 </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- HEADER --- */
header {
  width: 100%;
  height: 88px;
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  padding: 0 20px;
  background-color: #B8FFC3;
  z-index: 1000;
  align-items: center;
  border-bottom: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.menu-toggle {
  font-size: 24px;
  color: #000;
  text-decoration: none;
  margin-right: 15px;
  display: flex;
  align-items: center;
}

/* Sửa lỗi ảnh logo quá to */
.header-logo {
  height: 50px; 
  width: auto;
  object-fit: contain;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-right a {
  text-decoration: none;
  color: #333;
  display: flex;
  align-items: center;
}

.support-link p {
  font-weight: bold;
  margin: 0;
  display: none; /* Ẩn chữ trên mobile */
}

 @media (min-width: 768px) {
  .support-link p { display: block; }
}

/* --- MEGA MENU --- */
.mega-menu-container {
  position: fixed;
  top: 88px;
  left: 0;
  width: 100%;
  height: calc(100vh - 88px);
  z-index: 999;
  display: flex;
  flex-direction: column;
}

.mega-menu-content {
  display: flex;
  background: white;
  width: 100%;
  min-height: 300px;
  max-height: 80vh; 
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
  position: relative;
  z-index: 1000;
  overflow-y: auto;
}

.menu-sidebar {
  width: 250px;
  flex-shrink: 0;
  border-right: 1px solid #eee;
  list-style: none;
  padding: 20px 0;
  margin: 0;
  background: #f9f9f9;
}

.menu-sidebar li {
  padding: 15px 30px;
  cursor: pointer;
  font-weight: bold;
  color: #555;
  transition: 0.2s;
}

.menu-sidebar li.active, .menu-sidebar li:hover {
  background: #fff;
  color: #00b14f;
  border-left: 4px solid #00b14f;
}

.menu-horizontal-content {
  display: flex;
  flex: 1;
  padding: 30px;
  gap: 40px;
  flex-wrap: wrap;
}

.menu-column { min-width: 150px; }
.menu-column h3 {
  font-size: 16px;
  color: #333;
  margin-bottom: 15px;
  border-bottom: 2px solid #00b14f;
  display: inline-block;
  padding-bottom: 5px;
}

.menu-column ul { list-style: none; padding: 0; }
.menu-column ul li { padding: 8px 0; color: #666; cursor: pointer; transition: 0.2s; }
.menu-column ul li:hover { color: #00b14f; padding-left: 5px; }

.overlay {
  flex: 1;
  background: rgba(0,0,0,0.4);
  cursor: pointer;
}

/* --- MAIN CONTENT --- */
.background-img {
  width: 100%;
  margin-top: 88px; 
}

.background-img img {
  width: 100%;
  height: 600px;
  object-fit: cover;
  display: block;
}

.content-intro h2 {
  text-align: center;
  margin: 40px 20px;
  color: #333;
  font-size: 1.8rem;
  line-height: 1.4;
}

.display-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 15px;
  margin-bottom: 40px;
  justify-content: center;
}

.tab-navigation button {
  padding: 12px 30px;
  border: 1px solid #ddd;
  background: transparent;
  color: #555;
  font-size: 16px;
  font-weight: bold;
  border-radius: 50px;
  cursor: pointer;
  transition: 0.3s;
}

.tab-navigation button:hover { background-color: #f5f5f5; }
.tab-navigation button.active {
  background-color: #00b14f; 
  color: #fff;
  border-color: #00b14f;
  box-shadow: 0 4px 10px rgba(0, 177, 79, 0.3);
}

/* Layout 2 cột */
.content-layout {
  display: flex;
  width: 100%;
  align-items: flex-start;
}

.left-column {
  width: 30%;
  padding-right: 20px;
}
.left-column h2 {
  font-size: 32px;
  font-weight: 600;
  color: #00b14f;
}

.right-column {
  width: 70%;
}

/* Mobile Responsive cho phần Content */
 @media (max-width: 768px) {
  .content-layout { flex-direction: column; }
  .left-column { width: 100%; padding: 0; margin-bottom: 20px; }
  .right-column { width: 100%; }
  .menu-sidebar { display: none; }
  .mega-menu-content { flex-direction: column; }
}

.service-item {
  display: flex;
  align-items: flex-start;
  padding: 24px;
  margin-bottom: 15px;
  border: 1px solid #eee;
  border-radius: 12px;
  cursor: pointer;
  transition: 0.3s;
  background: #fff;
}

.service-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
  border-color: #00b14f;
}

.icon-box {
  width: 60px;
  height: 60px;
  margin-right: 20px;
  flex-shrink: 0;
}
.icon-box img { width: 100%; height: 100%; object-fit: contain; }

.text-box h3 {
  font-size: 18px;
  margin: 0 0 8px 0;
  color: #1c1c1c;
  font-weight: bold;
}
.text-box p { font-size: 15px; color: #666; margin: 0; line-height: 1.5; }
.no-underline { text-decoration: none; color: inherit; display: block; }

.fadeIn { animation: fadeIn 0.5s ease-in-out; }
 @keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- INFO SECTION --- */
.info-section {
  max-width: 1200px;
  margin: 80px auto;
  padding: 0 20px;
}
.card-container {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin: 40px 0;
  flex-wrap: wrap;
}
.info-card {
  flex: 1;
  min-width: 300px;
  padding: 40px 30px;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: #fff;
  text-align: center;
  transition: 0.3s;
}
.info-card:hover { border-color: #00b14f; }
.btn-more {
  background-color: #00b14f;
  color: white;
  padding: 12px 40px;
  border: none;
  border-radius: 50px;
  font-weight: bold;
  cursor: pointer;
  font-size: 16px;
  transition: 0.3s;
}
.btn-more:hover { background-color: #008f3e; }

/* --- FOOTER --- */
.footer {
  background-color: #f0fbf4; 
  padding: 60px 0 20px 0;
  margin-top: 50px;
  border-top: 4px solid #00b14f;
}
.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap; 
  justify-content: space-between;
  padding: 0 20px;
  gap: 30px;
}
.footer-column {
  flex: 1;
  min-width: 200px;
}
.footer-logo { height: 40px; margin-bottom: 20px; }
.footer-column h4 { margin-bottom: 20px; font-weight: bold; color: #333; }
.footer-column ul { list-style: none; padding: 0; }
.footer-column ul li { margin-bottom: 10px; }
.footer-column ul li a {
  text-decoration: none;
  color: #555;
  font-size: 14px;
  transition: 0.2s;
}
.footer-column ul li a:hover { color: #00b14f; padding-left: 5px; }

.footer-bottom {
  text-align: center;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 20px;
  margin-top: 40px;
  color: #888;
  font-size: 14px;
}
</style>