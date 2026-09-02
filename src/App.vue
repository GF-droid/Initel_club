<template>
    <RouterView></RouterView>
</template>


<script lang='ts' setup name="App">
import { RouterView } from 'vue-router';
import { onBeforeUnmount } from 'vue';
import { useLoginAuthStore } from '@/store/login/loginAuthStore';

const authStore = useLoginAuthStore();
const username = "admin"
window.addEventListener('beforeunload', async (event) => {
    await authStore.logout(username);
    // 标准的浏览器关闭前确认对话框
    event.preventDefault();
    event.returnValue = '';
});

onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', async (event) => {
        await authStore.logout(username);
    });
});

</script>


<style scoped></style>
