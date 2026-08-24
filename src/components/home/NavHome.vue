<template>
  <div class="sidebar-container">
    <el-menu default-active="1-1" class="el-menu-vertical-demo" @open="handleOpen" @close="handleClose"
      text-color="#e0e0e0" active-text-color="#ffffff" router>
      <!-- Logo区域 -->
      <div class="logo-area">
        <span class="logo-text">智 能 仓 储</span>
        <div class="logo-subtitle">Smart Warehouse System</div>
      </div>

      <!-- 菜单栏标题 -->
      <div class="menu-header">
        <el-icon>
          <Menu />
        </el-icon>
        <span>菜单栏</span>
      </div>

      <!-- 页面选择 -->
      <el-sub-menu index="1" class="custom-sub-menu">
        <template #title>
          <div class="menu-item-content">
            <el-icon class="menu-icon">
              <DataAnalysis />
            </el-icon>
            <span>数据管理</span>
          </div>
        </template>
        <el-menu-item index="/home/data2" class="sub-menu-item">
          <el-icon>
            <TrendCharts />
          </el-icon>
          <span>实时数据展示</span>
        </el-menu-item>
        <el-menu-item index="/home/Data" class="sub-menu-item">
          <el-icon>
            <Setting />
          </el-icon>
          <span>仓库空调控制</span>
        </el-menu-item>
        <el-menu-item index="/home/Chart" class="sub-menu-item">
          <el-icon>
            <Histogram />
          </el-icon>
          <span>历史数据分析</span>
        </el-menu-item>
      </el-sub-menu>

      <!-- 出入库操作 -->
      <el-menu-item index="/home/warehouse" class="menu-item">
        <div class="menu-item-content">
          <el-icon class="menu-icon">
            <Box />
          </el-icon>
          <span>出入库操作</span>
        </div>
      </el-menu-item>

      <!-- 搜索 -->
      <el-menu-item index="/home/search" class="menu-item">
        <div class="menu-item-content">
          <el-icon class="menu-icon">
            <Search />
          </el-icon>
          <span>智能搜索</span>
        </div>
      </el-menu-item>

      <el-menu-item index="/home/monitoring" class="menu-item">
        <div class="menu-item-content">
          <el-icon class="menu-icon">
            <VideoCamera /> <!-- 监控相关图标 -->
          </el-icon>
          <span>仓储监控</span>
        </div>
      </el-menu-item>

      <!-- 系统设置 -->
      <el-menu-item index="/home/ai-assistant" class="menu-item">
        <div class="menu-item-content">
          <el-icon class="menu-icon">
            <MagicStick /> <!-- 或使用 <Promotion /> 图标 -->
          </el-icon>
          <span>AI助手</span>
          <span class="ai-badge">NEW</span>
        </div>
      </el-menu-item>
    </el-menu>

    <!-- 用户信息 -->
    <div class="user-info">
      <div class="user-avatar">
        <el-avatar :size="40" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png" />
      </div>
      <div class="user-details">
        <div class="user-name">管理员</div>
        <div class="user-role">系统管理员</div>
      </div>
      <el-icon class="logout-icon">
        <SwitchButton />
      </el-icon>
    </div>
  </div>
</template>

<script lang='ts' setup name='NavHome'>
import {
  Menu,
  DataAnalysis,
  Setting,
  Histogram,
  Box,
  Search,
  Tools,
  SwitchButton,
  TrendCharts,
  MagicStick, 
  VideoCamera,
  Promotion
} from '@element-plus/icons-vue'

const handleOpen = (key: string, keyPath: string[]) => {
  console.log('Open:', key, keyPath)
}

const handleClose = (key: string, keyPath: string[]) => {
  console.log('Close:', key, keyPath)
}
</script>

<style scoped>
/* 修复子菜单背景色问题 */
.el-menu-vertical-demo :deep(.el-sub-menu__title) {
  color: #e0e0e0 !important;
  background: transparent !important;
}

.el-menu-vertical-demo :deep(.el-sub-menu__title:hover) {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.1) !important;
}

/* 子菜单弹出层样式 */
.el-menu-vertical-demo :deep(.el-sub-menu .el-menu) {
  background: #2d2d2d !important;
  /* border-radius: 8px; */
  /* box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); */
  /* border: 1px solid rgba(255, 255, 255, 0.1); */
  margin-top: 4px;
  margin-left: 8px;
}

.el-menu-vertical-demo :deep(.el-sub-menu .el-menu .el-menu-item) {
  background: #2d2d2d !important;
  color: #e0e0e0 !important;
  margin: 0 !important;
  border-radius: 4px;
}

.el-menu-vertical-demo :deep(.el-sub-menu .el-menu .el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
}

.el-menu-vertical-demo :deep(.el-sub-menu .el-menu .el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.2), rgba(64, 158, 255, 0.1)) !important;
  color: #409EFF !important;
}

/* 子菜单箭头图标颜色 */
.el-menu-vertical-demo :deep(.el-sub-menu__icon-arrow) {
  color: #909399 !important;
}

.el-menu-vertical-demo :deep(.el-sub-menu__title:hover .el-sub-menu__icon-arrow) {
  color: #ffffff !important;
}

.el-menu-vertical-demo :deep(.el-sub-menu.is-opened .el-sub-menu__icon-arrow) {
  color: #409EFF !important;
  transform: rotate(180deg);
}

/* 子菜单项的图标样式 */
.el-menu-vertical-demo :deep(.sub-menu-item .el-icon) {
  color: #909399;
  font-size: 14px;
  margin-right: 8px;
}

.el-menu-vertical-demo :deep(.sub-menu-item:hover .el-icon) {
  color: #ffffff;
}

.el-menu-vertical-demo :deep(.sub-menu-item.is-active .el-icon) {
  color: #409EFF;
}

/* 确保展开的子菜单标题有正确样式 */
.el-menu-vertical-demo :deep(.el-sub-menu.is-opened > .el-sub-menu__title) {
  background: rgba(64, 158, 255, 0.1) !important;
  color: #409EFF !important;
}

.el-menu-vertical-demo :deep(.el-sub-menu.is-opened .menu-icon) {
  color: #409EFF !important;
}

.sidebar-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #292727 0%, #2d2d2d 100%);
  box-shadow: 4px 0 20px rgba(0, 0, 0, 0.3);
}

/* Logo区域 */
.logo-area {
  padding: 24px 16px;
  text-align: center;
  background: rgba(45, 42, 42, 0.2);
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-text {
  font-family: 'Microsoft YaHei UI', 'SimHei', sans-serif;
  font-size: 24px;
  font-weight: bold;
  background: linear-gradient(45deg, #409EFF, #67C23A);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 3px;
  display: block;
  margin-bottom: 4px;
}

.logo-subtitle {
  font-size: 12px;
  color: #888;
  letter-spacing: 1px;
  font-weight: 300;
}

/* 菜单栏标题 */
.menu-header {
  padding: 16px 24px 8px;
  color: #888;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-header .el-icon {
  font-size: 14px;
}

/* 菜单样式 */
.el-menu-vertical-demo {
  flex: 1;
  background: transparent !important;
  border-right: none !important;
}

.el-menu-vertical-demo :deep(.el-sub-menu__title),
.el-menu-vertical-demo :deep(.el-menu-item) {
  height: 48px;
  line-height: 48px;
  margin: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: transparent !important;
}

.el-menu-vertical-demo :deep(.el-sub-menu__title:hover),
.el-menu-vertical-demo :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.1) !important;
  transform: translateX(4px);
}

.el-menu-vertical-demo :deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(64, 158, 255, 0.2), rgba(64, 158, 255, 0.1)) !important;
  color: #409EFF !important;
  border-left: 3px solid #409EFF;
}

/* 菜单项内容 */
.menu-item-content {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.menu-icon {
  font-size: 18px;
  color: #909399;
  transition: all 0.3s ease;
}

.el-menu-vertical-demo :deep(.el-menu-item.is-active) .menu-icon {
  color: #409EFF;
}

/* 子菜单项 */
.sub-menu-item {
  padding-left: 48px !important;
  margin: 2px 8px !important;
}

.sub-menu-item .el-icon {
  font-size: 14px;
  margin-right: 8px;
}

/* 用户信息 */
.user-info {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(39, 37, 37, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.05);
}

.user-avatar :deep(.el-avatar) {
  border: 2px solid rgba(64, 158, 255, 0.3);
}

.user-details {
  flex: 1;
}

.user-name {
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.user-role {
  color: #888;
  font-size: 12px;
  margin-top: 2px;
}

.logout-icon {
  color: #888;
  font-size: 16px;
  transition: color 0.3s ease;
}

.logout-icon:hover {
  color: #409EFF;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.el-menu-item,
.el-sub-menu {
  animation: fadeIn 0.5s ease-out forwards;
  opacity: 0;
}

.el-menu-item:nth-child(1) {
  animation-delay: 0.1s;
}

.el-menu-item:nth-child(2) {
  animation-delay: 0.2s;
}

.el-menu-item:nth-child(3) {
  animation-delay: 0.3s;
}

.el-sub-menu {
  animation-delay: 0.4s;
}

/* 滚动条样式 */
.sidebar-container ::-webkit-scrollbar {
  width: 4px;
}

.sidebar-container ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.sidebar-container ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.sidebar-container ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .logo-text {
    font-size: 20px;
  }

  .logo-subtitle {
    font-size: 10px;
  }

  .menu-header {
    padding: 12px 16px 6px;
  }

  .user-info {
    padding: 12px;
  }
}
</style>