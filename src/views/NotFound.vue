<template>
 <el-result icon="warning" title="Warning Tip" sub-title="抱歉，您访问的页面不存在">
        <template #extra>
          <el-button type="primary" @click="$router.push('/home')"> 返回首页</el-button>
          <!-- $router.push('/home')来代替函数也可以实现跳转到首页 -->
        </template>
      </el-result>
</template>


<script lang='ts' setup>
import { useRouter } from 'vue-router'
const router = useRouter()

function goHome() {
  router.push('/home')
}

</script>


<style scoped>

</style>