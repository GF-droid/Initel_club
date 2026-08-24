// stores/loginAuthStore.ts
import { defineStore } from 'pinia';
import axios from "@/store/SetAxios";
import { ElNotification } from 'element-plus';
import router from '@/router';

export const useLoginAuthStore = defineStore('loginAuth', {
    state: () => ({
        isLoggedIn: false,
        user: null as any
    }),

    actions: {
        async login(username: string, password: string) {
            try {
                console.log('🔄 正在连接到服务器...');

                const response = await axios.post('/auth/login', {
                    username,
                    password
                });

                if (response.status !== 200 || !response.data?.success || !response.data?.data?.user) {
                    throw new Error('服务器返回了无效的登录响应');
                }

                // 登录成功
                this.isLoggedIn = true;
                this.user = response.data.data.user;

                // 存储用户信息和令牌，供刷新页面或后续接口鉴权使用。
                localStorage.setItem('user', JSON.stringify(this.user));
                localStorage.setItem('accessToken', response.data.data.accessToken);

                ElNotification.success({
                    title: '登录成功',
                    message: `欢迎您: ${username}`,
                    duration: 1500
                });

                await router.push('/home');

                return true;

            } catch (error: any) {
                this.isLoggedIn = false;

                // 显示错误信息
                let errorMessage = '登录失败，请重试';

                if (error.response) {
                    const serverMessage = error.response.data?.message;
                    console.log('❌ 服务器返回错误:', error.response.status, serverMessage);
                    if (Array.isArray(serverMessage)) {
                        errorMessage = serverMessage.join('；');
                    } else if (typeof serverMessage === 'string' && serverMessage) {
                        errorMessage = serverMessage === 'Invalid username or password'
                            ? '用户名或密码错误，请确认后重试'
                            : serverMessage;
                    }
                } else if (error.request) {
                    console.log('🌐 网络连接失败: 无法连接到服务器');
                    errorMessage = '无法连接到服务器';
                } else {
                    console.log('⚠️ 其他错误:', error.message);
                }

                ElNotification.error({
                    title: '登录失败',
                    message: errorMessage,
                    duration: 3000
                });

                return false;
            }
        },

        clearAuth() {
            console.log('🧹 正在清除认证信息...');
            this.isLoggedIn = false;
            this.user = null;
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            console.log('✅ 认证信息清除完成');
        },

        async logout(_username?: string) {
            this.clearAuth();
            return true;
        }
    },

    getters: {
        isAuthenticated: (state) => state.isLoggedIn,
        currentUser: (state) => state.user
    }
});
