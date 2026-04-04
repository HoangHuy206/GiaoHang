import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useConfirmStore = defineStore('confirm', () => {
  const isVisible = ref(false);
  const message = ref('');
  const title = ref('Xác nhận');
  const resolvePromise = ref(null);

  const ask = (msg, customTitle = 'Xác nhận') => {
    message.value = msg;
    title.value = customTitle;
    isVisible.value = true;
    
    return new Promise((resolve) => {
      resolvePromise.value = resolve;
    });
  };

  const confirm = () => {
    isVisible.value = false;
    if (resolvePromise.value) resolvePromise.value(true);
  };

  const cancel = () => {
    isVisible.value = false;
    if (resolvePromise.value) resolvePromise.value(false);
  };

  return { isVisible, message, title, ask, confirm, cancel };
});
