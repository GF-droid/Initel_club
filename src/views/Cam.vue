<template>
  <div class="monitoring-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>
        <span class="header-icon">📹</span>
        仓储监控系统
        <span class="status-badge" :class="currentStatusClass">
          {{ currentStatus }}
        </span>
      </h1>
      <p class="sub-title">请选择要查看的监控区域</p>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧：监控区域选择 -->
      <div class="left-panel">
        <div class="panel-title">
          <span class="panel-icon">📍</span>
          监控区域
        </div>
        <div class="area-list">
          <div v-for="area in areas" :key="area.id" class="area-card" :class="{
            'active': activeArea === area.id,
            'online': area.status === 'online',
            'offline': area.status === 'offline'
          }" @click="selectArea(area)">
            <div class="area-icon">{{ area.icon }}</div>
            <div class="area-info">
              <h3>{{ area.name }}</h3>
              <p>{{ area.location }}</p>
              <div class="area-status">
                <span class="status-dot" :class="area.status"></span>
                {{ area.status === 'online' ? '在线' : '离线' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 中间：监控画面 -->
      <div class="center-panel">
        <div class="monitoring-view">
          <div class="view-header">
            <h2>
              <span class="view-icon">📺</span>
              {{ currentAreaName }} - 实时监控
            </h2>
            <div class="view-actions">
              <button @click="refreshStream" class="action-btn" title="刷新">
                🔄
              </button>
              <button @click="toggleFullscreen" class="action-btn" title="全屏">
                ⛶
              </button>
              <button @click="captureScreenshot" class="action-btn" title="截图">
                📸
              </button>
            </div>
          </div>

          <div class="video-wrapper" ref="videoContainer">
            <VideoPlayer :key="currentStream" :stream-path="currentStream" ref="videoPlayerRef" />
          </div>

          <div class="stream-info">
            <div class="info-item">
              <span class="info-label">流地址：</span>
              <span class="info-value">{{ currentStream }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">延迟：</span>
              <span class="info-value latency" :class="getLatencyClass">{{ latency }}ms</span>
            </div>
            <div class="info-item">
              <span class="info-label">帧率：</span>
              <span class="info-value">{{ fps }} FPS</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：摄像头列表 -->
      <div class="right-panel">
        <div class="panel-title">
          <span class="panel-icon">📷</span>
          摄像头列表
          <span class="count-badge">{{ currentCameras.length }}</span>
        </div>
        <div class="camera-list">
          <div v-for="camera in currentCameras" :key="camera.id" class="camera-item" :class="{
            'active': currentStream === camera.stream,
            'online': camera.status === 'online',
            'offline': camera.status === 'offline'
          }" @click="switchCamera(camera)">
            <div class="camera-icon">📷</div>
            <div class="camera-details">
              <div class="camera-name">{{ camera.name }}</div>
              <div class="camera-status">
                <span class="status-indicator" :class="camera.status"></span>
                {{ camera.status === 'online' ? '在线' : '离线' }}
              </div>
              <div class="camera-stream">{{ camera.stream }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="footer-bar">
      <div class="system-status">
        <div class="status-item">
          <span class="status-label">系统状态：</span>
          <span class="status-value" :class="systemStatusClass">
            {{ systemStatus }}
          </span>
        </div>
        <div class="status-item">
          <span class="status-label">在线摄像头：</span>
          <span class="status-value">{{ onlineCamerasCount }} / {{ totalCamerasCount }}</span>
        </div>
        <div class="status-item">
          <span class="status-label">更新时间：</span>
          <span class="status-value">{{ currentTime }}</span>
        </div>
      </div>
      <div class="system-actions">
        <button @click="refreshAll" class="system-btn">
          <span class="btn-icon">🔄</span>
          刷新全部
        </button>
        <button @click="showSettings" class="system-btn">
          <span class="btn-icon">⚙️</span>
          设置
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import VideoPlayer from "@/components/VideoPlayer/VideoPlayer.vue"

// 状态管理
const activeArea = ref('entrance')
const currentStream = ref('/stream1')
const videoPlayerRef = ref(null)
const videoContainer = ref(null)
const latency = ref(45)
const fps = ref(25)
const currentTime = ref('')

// 监控区域数据
const areas = ref([
  {
    id: 'entrance',
    name: '仓库入口',
    location: 'A区大门',
    icon: '🚪',
    status: 'online',
    stream: '/stream1',
    cameras: [
      { id: 'entrance-1', name: '入口主摄像头', stream: '/stream1', status: 'online' },
      { id: 'entrance-2', name: '车牌识别摄像头', stream: '/stream1b', status: 'online' }
    ]
  },
  {
    id: 'storage',
    name: '货架区域',
    location: 'B区仓库',
    icon: '🏭',
    status: 'online',
    stream: '/stream2',
    cameras: [
      { id: 'storage-1', name: '存储区全景', stream: '/stream2', status: 'online' },
      { id: 'storage-2', name: 'A排货架监控', stream: '/stream2a', status: 'online' }
    ]
  },
  {
    id: 'sorting',
    name: '分拣区域',
    location: 'C区分拣台',
    icon: '📦',
    status: 'online',
    stream: '/stream3',
    cameras: [
      { id: 'sorting-1', name: '分拣线全景', stream: '/stream3', status: 'online' },
      { id: 'sorting-2', name: '机器人作业区', stream: '/stream3a', status: 'online' }
    ]
  },
  {
    id: 'loading',
    name: '装卸区域',
    location: 'D区装卸台',
    icon: '🚚',
    status: 'online',
    stream: '/stream4',
    cameras: [
      { id: 'loading-1', name: '装卸台1号', stream: '/stream4', status: 'online' },
      { id: 'loading-2', name: '装卸台2号', stream: '/stream4a', status: 'online' }
    ]
  },
  {
    id: 'security',
    name: '安防区域',
    location: 'E区通道',
    icon: '🔒',
    status: 'offline',
    stream: '/stream5',
    cameras: [
      { id: 'security-1', name: '消防通道监控', stream: '/stream5', status: 'offline' }
    ]
  },
  {
    id: 'office',
    name: '办公区域',
    location: 'F区办公室',
    icon: '🏢',
    status: 'online',
    stream: '/stream6',
    cameras: [
      { id: 'office-1', name: '办公楼入口', stream: '/stream6', status: 'online' }
    ]
  }
])

// 计算属性
const currentAreaName = computed(() => {
  const area = areas.value.find(a => a.id === activeArea.value)
  return area ? area.name : ''
})

const currentCameras = computed(() => {
  const area = areas.value.find(a => a.id === activeArea.value)
  return area ? area.cameras : []
})

const currentStatus = computed(() => {
  const area = areas.value.find(a => a.id === activeArea.value)
  return area ? (area.status === 'online' ? '在线' : '离线') : '未知'
})

const currentStatusClass = computed(() => {
  return currentStatus.value === '在线' ? 'online' : 'offline'
})

const systemStatus = computed(() => {
  const onlineCount = areas.value.filter(a => a.status === 'online').length
  return onlineCount === areas.value.length ? '正常运行' :
    onlineCount > areas.value.length / 2 ? '部分异常' : '系统异常'
})

const systemStatusClass = computed(() => {
  const status = systemStatus.value
  return status === '正常运行' ? 'normal' :
    status === '部分异常' ? 'warning' : 'error'
})

const onlineCamerasCount = computed(() => {
  let count = 0
  areas.value.forEach(area => {
    area.cameras.forEach(camera => {
      if (camera.status === 'online') count++
    })
  })
  return count
})

const totalCamerasCount = computed(() => {
  let count = 0
  areas.value.forEach(area => {
    count += area.cameras.length
  })
  return count
})

const getLatencyClass = computed(() => {
  if (latency.value < 50) return 'good'
  if (latency.value < 100) return 'normal'
  return 'poor'
})

// 方法
function selectArea(area) {
  activeArea.value = area.id
  currentStream.value = area.stream
  updateStatus()
}

function switchCamera(camera) {
  if (camera.status === 'online') {
    currentStream.value = camera.stream
  } else {
    alert(`${camera.name} 当前离线，无法切换`)
  }
}

function refreshStream() {
  if (videoPlayerRef.value && videoPlayerRef.value.refresh) {
    videoPlayerRef.value.refresh()
    latency.value = Math.floor(Math.random() * 80) + 20
    ElMessage.success('视频流已刷新')
  }
}

function toggleFullscreen() {
  if (videoPlayerRef.value && videoPlayerRef.value.toggleFullscreen) {
    videoPlayerRef.value.toggleFullscreen()
  } else if (videoContainer.value) {
    if (!document.fullscreenElement) {
      videoContainer.value.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }
}

function captureScreenshot() {
  if (videoPlayerRef.value && videoPlayerRef.value.captureScreenshot) {
    videoPlayerRef.value.captureScreenshot()
  } else {
    ElMessage.info('截图功能暂不可用')
  }
}

function refreshAll() {
  refreshStream()
  updateStatus()
  ElMessage.success('系统状态已刷新')
}

function showSettings() {
  ElMessage.info('设置功能开发中')
}

function updateStatus() {
  // 模拟更新状态
  latency.value = Math.floor(Math.random() * 80) + 20
  fps.value = Math.floor(Math.random() * 10) + 20
}

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 初始化
onMounted(() => {
  // 设置默认区域
  if (areas.value.length > 0) {
    selectArea(areas.value[0])
  }

  // 更新时间
  updateTime()
  const timeInterval = setInterval(updateTime, 1000)

  // 模拟状态更新
  const statusInterval = setInterval(() => {
    if (Math.random() > 0.7) {
      updateStatus()
    }
  }, 3000)

  onUnmounted(() => {
    clearInterval(timeInterval)
    clearInterval(statusInterval)
  })
})
</script>

<style scoped>
.monitoring-container {
  height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
}

.page-header {
  background: rgba(30, 30, 46, 0.8);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid rgba(64, 158, 255, 0.2);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.page-header h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-icon {
  font-size: 32px;
}

.status-badge {
  margin-left: auto;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.online {
  background: rgba(103, 194, 58, 0.2);
  color: #67c23a;
  border: 1px solid rgba(103, 194, 58, 0.4);
}

.status-badge.offline {
  background: rgba(245, 108, 108, 0.2);
  color: #f56c6c;
  border: 1px solid rgba(245, 108, 108, 0.4);
}

.sub-title {
  margin: 0;
  color: #a0a0a0;
  font-size: 14px;
}

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  gap: 20px;
  margin-bottom: 20px;
  min-height: 0;
}

.left-panel,
.center-panel,
.right-panel {
  display: flex;
  flex-direction: column;
  background: rgba(30, 30, 46, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(64, 158, 255, 0.1);
  overflow: hidden;
}

.panel-title {
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(64, 158, 255, 0.1);
  border-bottom: 1px solid rgba(64, 158, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel-icon {
  font-size: 18px;
}

.count-badge {
  margin-left: auto;
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

/* 左侧区域列表 */
.area-list {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.area-card {
  background: rgba(40, 40, 60, 0.6);
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.area-card:hover {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
  transform: translateX(4px);
}

.area-card.active {
  background: rgba(64, 158, 255, 0.15);
  border-color: #409eff;
  box-shadow: 0 0 15px rgba(64, 158, 255, 0.2);
}

.area-card.online {
  border-left: 4px solid #67c23a;
}

.area-card.offline {
  border-left: 4px solid #909399;
}

.area-icon {
  font-size: 28px;
  margin-bottom: 12px;
}

.area-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #ffffff;
}

.area-info p {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: #a0a0a0;
}

.area-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #67c23a;
  box-shadow: 0 0 8px #67c23a;
}

.status-dot.offline {
  background: #909399;
}

/* 中间监控区域 */
.monitoring-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.view-header h2 {
  margin: 0;
  font-size: 20px;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-icon {
  font-size: 24px;
}

.view-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: #409eff;
  color: white;
  transform: scale(1.1);
}

.video-wrapper {
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  min-height: 400px;
  margin-bottom: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stream-info {
  display: flex;
  justify-content: space-between;
  background: rgba(40, 40, 60, 0.8);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid rgba(64, 158, 255, 0.1);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 12px;
  color: #a0a0a0;
}

.info-value {
  font-size: 14px;
  color: #ffffff;
  font-family: 'Consolas', monospace;
}

.latency.good {
  color: #67c23a;
}

.latency.normal {
  color: #e6a23c;
}

.latency.poor {
  color: #f56c6c;
}

/* 右侧摄像头列表 */
.camera-list {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.camera-item {
  background: rgba(40, 40, 60, 0.6);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.camera-item:hover {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.3);
}

.camera-item.active {
  background: rgba(64, 158, 255, 0.15);
  border-color: #409eff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.2);
}

.camera-item.online {
  border-left: 4px solid #67c23a;
}

.camera-item.offline {
  border-left: 4px solid #909399;
}

.camera-icon {
  font-size: 24px;
}

.camera-details {
  flex: 1;
}

.camera-name {
  font-size: 14px;
  color: #ffffff;
  margin-bottom: 4px;
  font-weight: 500;
}

.camera-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 4px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-indicator.online {
  background: #67c23a;
  box-shadow: 0 0 6px #67c23a;
}

.status-indicator.offline {
  background: #909399;
}

.camera-stream {
  font-size: 11px;
  color: #a0a0a0;
  font-family: 'Consolas', monospace;
}

/* 底部状态栏 */
.footer-bar {
  background: rgba(30, 30, 46, 0.8);
  border-radius: 12px;
  padding: 15px 20px;
  border: 1px solid rgba(64, 158, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.system-status {
  display: flex;
  gap: 30px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-label {
  font-size: 14px;
  color: #a0a0a0;
}

.status-value {
  font-size: 14px;
  font-weight: 600;
}

.status-value.normal {
  color: #67c23a;
}

.status-value.warning {
  color: #e6a23c;
}

.status-value.error {
  color: #f56c6c;
}

.system-actions {
  display: flex;
  gap: 12px;
}

.system-btn {
  padding: 8px 16px;
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  border: 1px solid rgba(64, 158, 255, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.system-btn:hover {
  background: #409eff;
  color: white;
  transform: translateY(-2px);
}

.btn-icon {
  font-size: 16px;
}

/* 滚动条样式 */
.area-list::-webkit-scrollbar,
.camera-list::-webkit-scrollbar {
  width: 6px;
}

.area-list::-webkit-scrollbar-track,
.camera-list::-webkit-scrollbar-track {
  background: rgba(40, 40, 60, 0.5);
  border-radius: 3px;
}

.area-list::-webkit-scrollbar-thumb,
.camera-list::-webkit-scrollbar-thumb {
  background: rgba(64, 158, 255, 0.3);
  border-radius: 3px;
}

.area-list::-webkit-scrollbar-thumb:hover,
.camera-list::-webkit-scrollbar-thumb:hover {
  background: rgba(64, 158, 255, 0.5);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 250px 1fr 250px;
  }
}

@media (max-width: 992px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
    gap: 15px;
  }

  .left-panel,
  .right-panel {
    height: 200px;
  }

  .system-status {
    flex-direction: column;
    gap: 10px;
  }

  .footer-bar {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .system-actions {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .monitoring-container {
    padding: 10px;
  }

  .page-header h1 {
    font-size: 22px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .status-badge {
    margin-left: 0;
    align-self: flex-start;
  }

  .view-actions {
    flex-wrap: wrap;
  }
}
</style>