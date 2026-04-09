<template>
  <div class="not-found-container">
    <div class="content">
      <h1 class="error-code">404</h1>
      <div class="icon-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#00b14f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      </div>
      <h2 class="title">Không tìm thấy trang</h2>
      <p class="description">Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
      <button class="home-btn" @click="$router.push('/')">Về trang chủ</button>
    </div>
  </div>
</template>

<script setup>
// No extra logic needed
</script>

<style scoped>
.not-found-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f9fbf9;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  text-align: center;
  padding: 20px;
}

.content {
  max-width: 500px;
  background: white;
  padding: 50px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.05);
}

.error-code {
  font-size: 80px;
  font-weight: 900;
  color: #00b14f;
  margin-bottom: 0;
  line-height: 1;
}

.icon-box {
  margin: 20px 0;
}

.title {
  font-size: 24px;
  color: #333;
  margin-bottom: 15px;
}

.description {
  color: #666;
  margin-bottom: 30px;
  line-height: 1.6;
}

.home-btn {
  background-color: #00b14f;
  color: white;
  border: none;
  padding: 15px 40px;
  font-size: 16px;
  font-weight: bold;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 177, 79, 0.3);
}

.home-btn:hover {
  background-color: #008f3e;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 177, 79, 0.4);
}

.home-btn:active {
  transform: translateY(0);
}
</style>
