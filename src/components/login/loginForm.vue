<template><el-form ref="loginRef" :model="loginParams" :rules="loginRules" class="auth-form" @keyup.enter="handleLogin"><el-form-item prop="username" label="用户名"><el-input v-model="loginParams.username" :prefix-icon="User" placeholder="请输入用户名" size="large" /></el-form-item><el-form-item prop="password" label="密码"><el-input v-model="loginParams.password" :prefix-icon="Lock" placeholder="请输入密码" show-password size="large" /></el-form-item><el-button type="primary" class="submit-button" :loading="loading" @click="handleLogin">{{ loading ? '正在登录' : '登录' }}</el-button><div class="form-switch"><span>还没有账号？</span><el-button link type="primary" @click="emit('switch-to-register')">立即注册</el-button></div></el-form></template>
<script setup lang="ts">
import { ref } from 'vue'
import { Lock, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useLoginAuthStore } from '@/store/login/loginAuthStore'
import { useLoginStore } from '@/store/login/LoginStore'
const loginAuthStore = useLoginAuthStore(); const loginStore = useLoginStore(); const { loginParams, loginRules } = loginStore; const loginRef = ref(); const loading = ref(false); const emit = defineEmits<{ (event: 'switch-to-register'): void }>()
const handleLogin = async () => { if (!loginRef.value) return; try { const valid = await loginRef.value.validate(); if (!valid) return; loading.value = true; await loginAuthStore.login(loginParams.username, loginParams.password) } catch { ElMessage.warning('请正确填写登录信息') } finally { loading.value = false } }
</script>
<style scoped>
.auth-form { position: absolute; inset: 0; transition: opacity .18s ease; }.auth-form.hidden { pointer-events: none; opacity: 0; }.auth-form :deep(.el-form-item) { margin-bottom: 18px; }.auth-form :deep(.el-form-item__label) { padding-bottom: 6px; color: #c6d0d9; font-size: 13px; }.auth-form :deep(.el-input__wrapper) { min-height: 42px; background: #30373e; box-shadow: 0 0 0 1px #4a5661 inset; }.auth-form :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #83c3ef inset; }.auth-form :deep(.el-input__inner) { color: #edf3f8; }.auth-form :deep(.el-input__prefix-inner), .auth-form :deep(.el-input__suffix-inner) { color: #8e9ca8; }.submit-button { width: 100%; height: 42px; margin-top: 4px; }.form-switch { display: flex; align-items: center; justify-content: center; gap: 3px; margin-top: 18px; color: #aebbc6; font-size: 13px; }.form-switch .el-button { padding: 0; font-size: 13px; }
</style>
