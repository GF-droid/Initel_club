import axios from 'axios';
import { clearAuthStorage, readToken } from './authStorage';

// 创建一个函数来返回配置好的 axios 实例
export function getAxiosInstance() {
    const instance = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
        timeout: 30000,
        withCredentials: false // 改为 false 解决 CORS 问题
    });

    // 添加请求拦截器用于调试
    instance.interceptors.request.use(
        (config) => {
            // 后端已启用全局 JwtAuthGuard，缺少这个请求头会直接返回 401。
            const token = readToken();
            if (token) config.headers.Authorization = `Bearer ${token}`;
            console.log(`🚀 发送请求: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
            return config;
        },
        (error) => {
            console.error('❌ 请求配置错误:', error);
            return Promise.reject(error);
        }
    );

    // 添加响应拦截器用于调试
    instance.interceptors.response.use(
        (response) => {
            console.log(`✅ 请求成功: ${response.status} ${response.config.url}`);
            return response;
        },
        (error) => {
            const status = error.response?.status;

            // token 缺失或已过期：清掉本地会话并回到登录页。
            // 这里刻意用整页跳转而不是 router.push —— 本文件若 import router
            // 会与 loginAuthStore 形成循环依赖。
            if (status === 401) {
                clearAuthStorage();
                if (!window.location.pathname.startsWith('/login')) {
                    window.location.replace('/login');
                }
            }

            // `data` carries the server's own error payload (NestJS returns
            // { statusCode, message, path }). Without it a failure only shows a
            // bare status code and the real cause stays invisible.
            console.error('❌ 请求失败:', {
                url: error.config?.url,
                status,
                statusText: error.response?.statusText,
                message: error.message,
                data: error.response?.data
            });
            return Promise.reject(error);
        }
    );

    return instance;
}

// 默认导出配置好的 axios 实例
export default getAxiosInstance();
