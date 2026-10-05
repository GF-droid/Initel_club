// stores/loginAuthStore.ts
import { defineStore } from 'pinia';
import axios from "@/store/SetAxios";
import { ElNotification } from 'element-plus';
import router from '@/router';
import { clearAuthStorage, readToken, readUser, writeAuthStorage } from '@/store/authStorage';

export const useLoginAuthStore = defineStore('loginAuth', {
    // 从 localStorage 恢复：readToken() 会顺带清掉已过期的令牌，
    // 这样刷新页面不会再被踢回登录页，而过期的会话也不会假装还登录着。
    state: () => ({
        isLoggedIn: Boolean(readToken()),
        user: readUser() as any
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

                // 存储用户信息和令牌，供刷新页面恢复登录态、以及 SetAxios
                // 自动附加 Authorization 请求头使用。
                writeAuthStorage(this.user, response.data.data.accessToken);

                ElNotification.success({
                    title: '登录成功',
                    message: `欢迎您: ${username}`,
                    duration: 1500
                });

                // 路由守卫拦截时会把原目标写进 ?redirect=，登录后回到那里。
                //
                // 跳转单独包一层 catch：目标页面是懒加载的，如果前端产物缺失
                // （典型情况是部署不完整或浏览器缓存了旧 index.html），
                // 动态 import 会失败。那属于"页面加载失败"，不是"登录失败"，
                // 不能让它冒泡到下面的登录错误分支 —— 否则会同时弹出登录成功和
                // 登录失败，并且把 isLoggedIn 置回 false 而留下已存储的令牌，
                // 状态自相矛盾。
                const redirect = router.currentRoute.value.query.redirect;
                const target = typeof redirect === 'string' && redirect ? redirect : '/home';
                try {
                    await router.push(target);
                } catch (navigationError) {
                    console.error('登录成功，但页面跳转失败:', navigationError);
                    ElNotification.warning({
                        title: '页面加载失败',
                        message: '登录已成功，但目标页面未能加载。通常按 Ctrl+Shift+R 强制刷新即可恢复。',
                        duration: 6000
                    });
                }

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
            clearAuthStorage();
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
