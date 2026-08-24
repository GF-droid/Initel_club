<template>
  <div class="title-nav">
    <!-- 左侧用户信息 -->
    <div class="user-info">
      <el-avatar class="avatar" :size="40" src="https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png">
        <span class="avatar-text">AD</span>
      </el-avatar>
      <div class="user-detail">
        <div class="user-name">
          <span class="name-text">ADMIN</span>
          <el-icon class="verified-icon">
            <Check />
          </el-icon>
        </div>
        <span class="user-role">系统管理员</span>
      </div>
    </div>

    <!-- 标题区域 -->
    <div class="nav-center">
      <h1 class="nav-title">智能仓储管理系统</h1>
      <div class="nav-subtitle">Intelligent Warehouse Management System</div>
    </div>

    <!-- 右侧操作按钮 -->
    <div class="nav-actions">
      <el-button type="primary" round class="logout-btn" @click="handleLogout">
        <template #icon>
          <el-icon>
            <SwitchButton />
          </el-icon>
        </template>
        <span class="btn-text">退出登录</span>
      </el-button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { SwitchButton, Check } from '@element-plus/icons-vue'

const router = useRouter()

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出系统吗？退出后需要重新登录',
      '确认退出',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'confirm-logout-btn',
        cancelButtonClass: 'cancel-logout-btn',
      }
    )

    console.log('正在跳转到登录页...')

    // 添加淡出动画效果
    document.body.style.opacity = '0.8'
    setTimeout(() => {
      router.push('/login')
    }, 300)

  } catch (error) {
    if (error === 'cancel') {
      console.log('用户取消退出')
      return
    }
    console.error('退出失败:', error)
    const message = error instanceof Error ? error.message : '未知错误'
    ElMessage.error('退出失败: ' + message)
  }
}
</script>

<style scoped>
.title-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 64px;
  min-height: 64px;
  background: linear-gradient(135deg, #252525 0%, #37353a 100%);
  box-shadow: 0 2px 10px rgba(24, 24, 24, 0.3);
  color: rgb(255, 255, 255);
  position: relative;
  z-index: 100;
  flex-wrap: nowrap;
  overflow: hidden;
  gap: 10px;
}

/* 左侧用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
  flex-shrink: 0;
}

.avatar {
  background: linear-gradient(45deg, #409EFF, #67C23A);
  border: 2px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.avatar:hover {
  transform: scale(1.1);
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
}

.avatar-text {
  font-weight: bold;
  font-size: 14px;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 100px;
  overflow: hidden;
}

.user-name {
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  overflow: hidden;
}

.name-text {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.verified-icon {
  color: #67C23A;
  font-size: 14px;
  background: white;
  border-radius: 50%;
  padding: 1px;
  flex-shrink: 0;
}

.user-role {
  font-size: 12px;
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 中间标题区域 */
.nav-center {
  flex: 1;
  text-align: center;
  min-width: 200px;
  max-width: 600px;
  margin: 0 10px;
  overflow: hidden;
}

.nav-title {
  margin: 0;
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 700;
  letter-spacing: 1px;
  background: linear-gradient(45deg, #fff, #e3f2fd);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-subtitle {
  font-size: clamp(10px, 1vw, 12px);
  opacity: 0.8;
  margin-top: 2px;
  letter-spacing: 0.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧操作按钮 */
.nav-actions {
  display: flex;
  justify-content: flex-end;
  min-width: 120px;
  flex-shrink: 0;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  font-weight: 500;
  padding: 8px clamp(12px, 2vw, 20px);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  white-space: nowrap;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
}

.logout-btn:active {
  transform: translateY(0);
}

.btn-text {
  display: inline-block;
}

/* 退出确认对话框样式 */
:deep(.confirm-logout-btn) {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff4757 100%) !important;
  border: none !important;
}

:deep(.cancel-logout-btn) {
  background: #f0f2f5 !important;
  color: #606266 !important;
  border: 1px solid #dcdfe6 !important;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .title-nav {
    padding: 0 15px;
    gap: 8px;
  }

  .user-info {
    min-width: 160px;
  }

  .nav-title {
    font-size: 18px;
  }

  .nav-subtitle {
    font-size: 11px;
  }
}

@media (max-width: 768px) {
  .title-nav {
    padding: 0 12px;
    gap: 5px;
    height: 56px;
  }

  .user-info {
    min-width: 140px;
    gap: 8px;
  }

  .avatar {
    width: 32px !important;
    height: 32px !important;
  }

  .name-text {
    font-size: 14px;
  }

  .nav-center {
    margin: 0 5px;
  }

  .nav-title {
    font-size: 16px;
    letter-spacing: 0.5px;
  }

  .nav-subtitle {
    font-size: 10px;
    margin-top: 1px;
  }

  .user-role {
    font-size: 10px;
    padding: 1px 6px;
  }

  .logout-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn-text {
    font-size: 12px;
  }
}

@media (max-width: 576px) {
  .title-nav {
    padding: 0 8px;
  }

  .user-info {
    min-width: auto;
    max-width: 120px;
  }

  .user-detail {
    min-width: 80px;
  }

  .name-text {
    font-size: 13px;
  }

  .nav-title {
    font-size: 14px;
    letter-spacing: 0.3px;
  }

  .nav-subtitle {
    display: none;
  }

  .logout-btn {
    padding: 4px 8px;
  }

  .btn-text {
    display: none;
  }

  .logout-btn .el-icon {
    margin-right: 0 !important;
  }
}

@media (max-width: 400px) {
  .title-nav {
    padding: 0 5px;
  }

  .user-info {
    max-width: 100px;
  }

  .user-detail {
    min-width: 60px;
  }

  .name-text {
    font-size: 12px;
  }

  .user-role {
    display: none;
  }

  .nav-center {
    min-width: 120px;
  }

  .nav-title {
    font-size: 13px;
  }
}
</style>
