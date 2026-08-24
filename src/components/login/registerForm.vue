<template>
    <el-form class="register-form" ref="registerRef" :model="registerParams" :rules="registerRules">
        <h1>注册</h1>
        <el-form-item prop="username">
            <el-input placeholder="请输入用户名" :prefix-icon="User" v-model="registerParams.username"
                size="large"></el-input>
        </el-form-item>
        <el-form-item prop="password">
            <el-input placeholder="请输入密码" show-password :prefix-icon="Lock" v-model="registerParams.password"
                size="large"></el-input>
        </el-form-item>
        <el-form-item prop="email">
            <el-input placeholder="请输入邮箱" :prefix-icon="Message" v-model="registerParams.email" size="large"></el-input>
        </el-form-item>
        <el-form-item>
            <el-button type="primary" @click="submit_register" size="large">注册</el-button>
        </el-form-item>
        <div class="form-switch">
            <span>已有账号？</span>
            <el-button link type="primary" @click="emit('switch-to-login')">返回登录</el-button>
        </div>
    </el-form>
</template>

<script lang="ts" setup>
import { User, Lock, Message } from '@element-plus/icons-vue';
import { useRegisterAuthStore } from "@/store/register/RegisterAuthStore";
import { useRegisterStore } from "@/store/register/registerStore";
const registerStore = useRegisterStore();
const registerAuthStore = useRegisterAuthStore();
const emit = defineEmits<{ (event: 'switch-to-login'): void }>();

const { registerParams, registerRules, registerRef } = registerStore;

const submit_register = async () => {
    await registerAuthStore.submit_register(registerParams);
}
</script>


<style scoped>
.register-form {
    padding: 1% 25%;
    grid-column: 1;
    grid-row: 1;
    /* display: none; */
    opacity: 0;
    transition: all 0.8s;
    pointer-events: none;
    transition-delay: 0.2s;


}

.register-form.sign-up-model {
    /* display: block; */
    opacity: 1;
    transition: all 0.8s;
    pointer-events: all;
    transition-delay: 0.2s;


}

.register-form :deep(.el-button--primary) {
    width: 100%;
}

.form-switch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 14px;
}

.form-switch .el-button {
    width: auto;
    font-size: 14px;
}
</style>
