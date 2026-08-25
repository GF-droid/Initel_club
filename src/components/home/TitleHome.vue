<template>
  <header class="title-nav">
    <div class="page-context">
      <span class="context-label">工作台</span>
      <el-icon><ArrowRight /></el-icon>
      <h1>{{ pageTitle }}</h1>
    </div>

    <div class="nav-actions">
      <span class="online-status"><i></i>系统运行中</span>
      <el-button class="logout-btn" circle title="退出登录" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
      </el-button>
    </div>
  </header>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const pageTitles: Record<string, string> = {
  '/home/data2': '实时数据展示',
  '/home/Data': '仓库空调控制',
  '/home/Chart': '历史数据分析',
  '/home/warehouse': '出入库管理',
  '/home/search': '智能搜索',
  '/home/monitoring': '仓储监控',
  '/home/ai-assistant': 'AI 助手'
}

const pageTitle = computed(() => pageTitles[route.path] ?? '智能仓储管理系统')

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出系统吗？退出后需要重新登录。', '确认退出', {
      confirmButtonText: '确认退出',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await router.push('/login')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error('退出失败，请稍后重试')
    }
  }
}
</script>

<style scoped>
.title-nav { box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; width: 100%; height: 60px; padding: 0 22px; border-bottom: 1px solid #414b55; background: #252a2f; color: #edf3f8; }
.page-context, .nav-actions { display: flex; align-items: center; }
.page-context { min-width: 0; gap: 9px; }
.context-label { color: #8e9ca8; font-size: 13px; }
.page-context .el-icon { flex: 0 0 auto; color: #697987; font-size: 14px; }
h1 { overflow: hidden; margin: 0; color: #edf3f8; font-size: 16px; font-weight: 600; line-height: 1.2; text-overflow: ellipsis; white-space: nowrap; }
.nav-actions { gap: 16px; }
.online-status { display: inline-flex; align-items: center; gap: 7px; color: #aebbc6; font-size: 12px; white-space: nowrap; }
.online-status i { width: 7px; height: 7px; border-radius: 50%; background: #67c23a; box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.12); }
.logout-btn { width: 32px; height: 32px; border-color: #4a5661; background: #30373e; color: #aebbc6; }
.logout-btn:hover { border-color: #659bc2; background: #3a444d; color: #edf3f8; }
@media (max-width: 576px) { .title-nav { padding: 0 14px; } .context-label, .online-status { display: none; } }
</style>
