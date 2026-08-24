<template>
    <el-form class="login-form" ref="loginRef" :model="loginParams" :rules="loginRules"
        @keyup.enter.native="handleLogin">
        <h1 class="login-title">登录</h1>
        <ElFormItem prop="username">
            <el-input placeholder="请输入用户名" :prefix-icon="User" v-model="loginParams.username" size="large"></el-input>
        </ElFormItem>
        <ElFormItem prop="password">
            <el-input placeholder="请输入密码" show-password :prefix-icon="Lock" v-model="loginParams.password"
                size="large"></el-input>
        </ElFormItem>
        <ElFormItem>
            <el-button type="primary" class="login-btn" size="large" @click="handleLogin" :loading="loading">
                {{ loading ? '登录中...' : '登录' }}
            </el-button>
        </ElFormItem>
    </el-form>
</template>

<script lang='ts' setup>
import { User, Lock } from '@element-plus/icons-vue';
import { useLoginAuthStore } from "@/store/login/loginAuthStore";
import { useLoginStore } from "@/store/login/LoginStore";
import { UseAuth } from '@/utils/auth';
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

const loginAuthStore = useLoginAuthStore();
const loginStore = useLoginStore();
const { loginParams, loginRules } = loginStore;
const loginRef = ref();
const authStore = UseAuth();
const loading = ref(false);

// 修复：使用 computed 确保响应式
const isallow = computed(() => authStore.isallow);

const handleLogin = async () => {
    console.log("isallow value:", isallow.value);

    // if (!isallow.value) {
    //     ElMessage.warning('当前不允许登录，请检查权限设置');
    //     return;
    // }

    await submit();
};

const submit = async () => {
    if (!loginRef.value) return;

    try {
        const valid = await loginRef.value.validate();
        if (valid) {
            loading.value = true;
            console.log('🔄 开始登录流程...');
            console.log('📤 发送登录数据:', {
                username: loginParams.username,
                password: '***'
            });

            await loginAuthStore.login(loginParams.username, loginParams.password);
        } else {
            ElMessage.warning('请正确填写表单');
        }
    } catch (error) {
        console.log('登录过程出错:', error);
    } finally {
        loading.value = false;
    }
}

const resetForm = () => {
    loginRef.value?.resetFields();
}

defineExpose({ resetForm });
</script>

<style scoped>
.login-form {
    padding: 1% 25%;
    grid-column: 1;
    grid-row: 1;
    opacity: 1;
    transition: all 0.8s;
    transition-delay: 0.2s;
    z-index: 1;
}

.login-form.sign-up-model {
    opacity: 0;
    transition: all 0.8s;
    transition-delay: 0.2s;
    z-index: 0;
}

.login-title {
    text-align: center;
    color: #FFFFFF;
    /* 设置为白色以在蓝色背景上突出显示 */
    font-family: 'Arial', sans-serif;
    /* 更改字体 */
    font-size: 32px;
    /* 增大字体大小 */
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
    /* 加深文字阴影以增强对比 */
    animation: titleAnimation 1.5s ease-in-out infinite;
    /* 添加动画效果 */
}

.login-btn {
    width: 100%;
    font-size: 18px;
}

@keyframes titleAnimation {

    0%,
    100% {
        color: #FFFFFF;
    }

    50% {
        color: #B0E0E6;
    }

    /* 动画中颜色变化为亮银色，与蓝色背景形成高对比 */
}
</style>
