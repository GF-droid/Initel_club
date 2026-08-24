import { defineStore } from 'pinia';
import axios from '@/store/SetAxios';
import { ElNotification, type FormInstance } from 'element-plus';

export const useRegisterAuthStore = defineStore('registerAuth', {
  state: () => ({
    message: '',
    code: 0,
    registerRef: null as FormInstance | null,
  }),
  actions: {
    async submit_register(registerParams: unknown) {
      try {
        const response = await axios.post('/auth/register', registerParams);
        if ((response.status !== 201 && response.status !== 200) || !response.data?.success) {
          throw new Error('服务器返回了无效的注册响应');
        }

        this.message = response.data.message;
        this.code = response.data.code ?? 200;
        this.registerRef?.resetFields();
        ElNotification({
          title: '注册成功',
          type: 'success',
          message: '注册成功，请使用新账号登录',
          duration: 1500,
        });

        setTimeout(() => window.location.reload(), 1000);
        return true;
      } catch (error: any) {
        const serverMessage = error.response?.data?.message;
        let message = '无法连接到服务器，请确认前后端服务均已启动';

        if (Array.isArray(serverMessage)) {
          message = serverMessage.join('；');
        } else if (typeof serverMessage === 'string' && serverMessage) {
          message = serverMessage === 'Username or email already exists'
            ? '用户名或邮箱已存在，请更换后重试'
            : serverMessage;
        } else if (error.message && !error.request) {
          message = error.message;
        }

        ElNotification({
          title: '注册失败',
          type: 'error',
          message,
          duration: 3000,
        });
        return false;
      }
    },
  },
});
