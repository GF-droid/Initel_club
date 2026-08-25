<template>
  <aside class="sidebar-container">
    <div class="brand-area">
      <div class="brand-mark"><el-icon><Box /></el-icon></div>
      <div>
        <div class="brand-name">智能仓储</div>
        <div class="brand-subtitle">WAREHOUSE CONSOLE</div>
      </div>
    </div>

    <div class="menu-caption">工作台</div>
    <el-menu :default-active="route.path" class="navigation-menu" router :default-openeds="['data']">
      <el-sub-menu index="data">
        <template #title>
          <el-icon><DataAnalysis /></el-icon>
          <span>数据管理</span>
        </template>
        <el-menu-item index="/home/data2"><el-icon><TrendCharts /></el-icon><span>实时数据展示</span></el-menu-item>
        <el-menu-item index="/home/air-conditioning"><el-icon><Setting /></el-icon><span>空调智能控制</span></el-menu-item>
        <el-menu-item index="/home/Chart"><el-icon><Histogram /></el-icon><span>历史数据分析</span></el-menu-item>
      </el-sub-menu>

      <el-menu-item index="/home/warehouse"><el-icon><Box /></el-icon><span>出入库操作</span></el-menu-item>
      <el-menu-item index="/home/search"><el-icon><Search /></el-icon><span>智能搜索</span></el-menu-item>
      <el-menu-item index="/home/monitoring"><el-icon><VideoCamera /></el-icon><span>仓储监控</span></el-menu-item>

      <div class="menu-caption menu-caption--secondary">辅助工具</div>
      <el-menu-item index="/home/ai-assistant">
        <el-icon><MagicStick /></el-icon><span>AI 助手</span><span class="menu-badge">NEW</span>
      </el-menu-item>
    </el-menu>

    <div class="sidebar-footer">
      <el-avatar :size="34" class="user-avatar">AD</el-avatar>
      <div class="user-details"><span class="user-name">管理员</span><span class="user-role">系统管理员</span></div>
      <el-icon class="status-icon" title="当前在线"><CircleCheckFilled /></el-icon>
    </div>
  </aside>
</template>

<script lang="ts" setup name="NavHome">
import { useRoute } from 'vue-router'
import { Box, CircleCheckFilled, DataAnalysis, Histogram, MagicStick, Search, Setting, TrendCharts, VideoCamera } from '@element-plus/icons-vue'

const route = useRoute()
</script>

<style scoped>
.sidebar-container { --sidebar-bg: #252a2f; --sidebar-surface: #30373e; --sidebar-border: #414b55; --text-primary: #edf3f8; --text-secondary: #aebbc6; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; background: var(--sidebar-bg); border-right: 1px solid var(--sidebar-border); }
.brand-area { display: flex; align-items: center; gap: 11px; min-height: 72px; padding: 0 18px; border-bottom: 1px solid var(--sidebar-border); }
.brand-mark { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid #527493; border-radius: 6px; background: #213a50; color: #83c3ef; font-size: 18px; }
.brand-name { color: var(--text-primary); font-size: 17px; font-weight: 650; line-height: 1.2; }
.brand-subtitle { margin-top: 3px; color: #82919f; font-size: 10px; letter-spacing: 0; }
.menu-caption { padding: 20px 20px 7px; color: #82919f; font-size: 11px; font-weight: 600; }
.menu-caption--secondary { padding-top: 18px; }
.navigation-menu { flex: 1; min-height: 0; overflow-y: auto; border-right: 0 !important; background: transparent !important; }
.navigation-menu :deep(.el-sub-menu__title), .navigation-menu :deep(.el-menu-item) { height: 44px; margin: 2px 10px; padding: 0 10px !important; border-radius: 5px; color: var(--text-secondary) !important; line-height: 44px; transition: background-color 160ms ease, color 160ms ease; }
.navigation-menu :deep(.el-sub-menu__title:hover), .navigation-menu :deep(.el-menu-item:hover) { background: #3a444d !important; color: var(--text-primary) !important; }
.navigation-menu :deep(.el-sub-menu__title .el-icon), .navigation-menu :deep(.el-menu-item .el-icon) { width: 18px; margin-right: 10px; color: #9aabb9; font-size: 17px; }
.navigation-menu :deep(.el-sub-menu__title:hover .el-icon), .navigation-menu :deep(.el-menu-item:hover .el-icon) { color: #c7d9e8; }
.navigation-menu :deep(.el-sub-menu .el-menu) { background: transparent !important; }
.navigation-menu :deep(.el-sub-menu .el-menu-item) { min-width: 0; margin: 1px 10px 1px 22px; padding-left: 18px !important; font-size: 13px; }
.navigation-menu :deep(.el-sub-menu .el-menu-item .el-icon) { font-size: 15px; }
.navigation-menu :deep(.el-menu-item.is-active) { background: #1f4058 !important; color: #9fd4f5 !important; font-weight: 600; }
.navigation-menu :deep(.el-menu-item.is-active::before) { position: absolute; left: 0; width: 3px; height: 22px; border-radius: 0 2px 2px 0; background: #58a9dc; content: ''; }
.navigation-menu :deep(.el-menu-item.is-active .el-icon), .navigation-menu :deep(.el-sub-menu.is-opened > .el-sub-menu__title .el-icon) { color: #83c3ef; }
.navigation-menu :deep(.el-sub-menu.is-opened > .el-sub-menu__title) { color: var(--text-primary) !important; }
.navigation-menu :deep(.el-sub-menu__icon-arrow) { color: #82919f; }
.menu-badge { margin-left: auto; padding: 1px 5px; border: 1px solid #527493; border-radius: 3px; color: #83c3ef; font-size: 10px; line-height: 16px; }
.sidebar-footer { display: flex; align-items: center; gap: 10px; min-height: 68px; padding: 0 16px; border-top: 1px solid var(--sidebar-border); background: #292f35; }
.user-avatar { flex: 0 0 auto; border: 1px solid #527493; background: #213a50; color: #bfe1f7; font-size: 12px; font-weight: 700; }
.user-details { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.user-name { overflow: hidden; color: var(--text-primary); font-size: 13px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.user-role { margin-top: 2px; color: #8e9ca8; font-size: 11px; }
.status-icon { color: #67c23a; font-size: 15px; }
.navigation-menu::-webkit-scrollbar { width: 4px; }
.navigation-menu::-webkit-scrollbar-thumb { border-radius: 4px; background: #4a5661; }
@media (max-width: 820px) {
  .brand-area { min-height: 64px; justify-content: center; padding: 0; }
  .brand-area > div:last-child, .menu-caption, .sidebar-footer .user-details, .status-icon, .navigation-menu :deep(.el-sub-menu__icon-arrow), .navigation-menu :deep(.el-menu-item span), .navigation-menu :deep(.el-sub-menu__title span) { display: none; }
  .navigation-menu :deep(.el-sub-menu__title), .navigation-menu :deep(.el-menu-item) { display: flex; justify-content: center; margin: 4px 8px; padding: 0 !important; }
  .navigation-menu :deep(.el-sub-menu__title .el-icon), .navigation-menu :deep(.el-menu-item .el-icon) { margin: 0; }
  .navigation-menu :deep(.el-sub-menu .el-menu-item) { margin: 2px 8px; padding: 0 !important; }
  .sidebar-footer { justify-content: center; padding: 0; }
}
</style>
