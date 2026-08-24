// stores/loginAuthStore.ts
import { defineStore } from 'pinia';
import axios from "@/store/SetAxios";
import { useRouter } from 'vue-router';
import { ElNotification } from 'element-plus';

export const useLoginAuthStore = defineStore('loginAuth', {
    state: () => ({
        isLoggedIn: false,
        user: null as any,
        router: useRouter()
    }),

    actions: {
        async login(username: string, password: string) {
            try {
                console.log('🔄 正在连接到服务器...');

                const response = await axios.post('/auth/login', {
                    username,
                    password
                });

                console.log('✅ 服务器连接成功！');
                console.log('📊 响应状态:', response.status);
                console.log('👤 用户数据:', response.data.data.user);

                // 登录成功
                if (response.status === 200) {
                    this.isLoggedIn = true;
                    this.user = response.data.data.user;

                    // 存储用户信息
                    localStorage.setItem('user', JSON.stringify(this.user));
                    console.log('💾 用户信息已保存到本地存储');

                    ElNotification.success({
                        title: '登录成功',
                        message: `欢迎您: ${username}`,
                        duration: 2000
                    });

                    console.log('🔄 准备跳转到首页...');
                    // 跳转到首页
                    setTimeout(() => {
                        console.log('📍 正在跳转到首页');
                        this.router.push('/home');
                    }, 1000);

                    return true;
                }

            } catch (error: any) {
                this.isLoggedIn = false;

                // 显示错误信息
                let errorMessage = '登录失败，请重试';

                if (error.response) {
                    console.log('❌ 服务器返回错误:', error.response.status, error.response.data.message);
                    errorMessage = error.response.data.message || errorMessage;
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
