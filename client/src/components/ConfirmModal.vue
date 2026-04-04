<template>
  <Transition name="fade">
    <div v-if="confirmStore.isVisible" class="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-pop">
        <div class="p-6 text-center">
          <div class="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-xl font-bold text-gray-900 mb-2">{{ confirmStore.title }}</h3>
          <p class="text-gray-600 leading-relaxed">{{ confirmStore.message }}</p>
        </div>
        <div class="flex border-t border-gray-100">
          <button 
            @click="confirmStore.cancel" 
            class="flex-1 px-4 py-4 text-gray-500 font-bold hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            Hủy bỏ
          </button>
          <button 
            @click="confirmStore.confirm" 
            class="flex-1 px-4 py-4 text-green-600 font-bold hover:bg-green-50 transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { useConfirmStore } from '../stores/confirm';
const confirmStore = useConfirmStore();
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.animate-pop {
  animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes pop {
  0% { transform: scale(0.9); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
</style>
