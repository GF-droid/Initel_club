<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import flvjs from 'flv.js'

// 第1处修改：添加 Props 定义
const props = defineProps({
  streamPath: {
    type: String,
    default: '/stream4'
  }
})

// 配置常量
const CONFIG = {
  SERVER_URL: 'ws://111.230.197.156:1554',
  HEARTBEAT_INTERVAL: 2000,
  RECONNECT_DELAY: 3000,
  HIGH_LATENCY_THRESHOLD: 200,
  MAX_RETRY_COUNT: 5,
  STREAM_PATH: props.streamPath
}

// Refs
const videoRef = ref(null)
const delayMs = ref(0)
const connectionStatus = ref('disconnected')
const retryCount = ref(0)
const isPageVisible = ref(true)
const isFullscreen = ref(false)
const wasPausedBeforeFullscreen = ref(false)

// 实例变量
let player = null
let heartbeatTimer = null
let retryTimer = null
let ws = null
let lastPingTime = 0

// 初始化播放器
function initPlayer() {
  // 如果页面不可见，则不初始化播放器
  if (!isPageVisible.value) return

  destroyPlayer()

  try {
    if (!flvjs.isSupported()) {
      throw new Error('FLV playback not supported in this browser')
    }

    player = flvjs.createPlayer(
      {
        type: 'flv',
        isLive: true,
        url: `${CONFIG.SERVER_URL}${CONFIG.STREAM_PATH}`,
        hasAudio: false
      },
      {
        enableStashBuffer: false,
        stashInitialSize: 0,
        lazyLoad: false,
        autoCleanupSourceBuffer: true
      }
    )

    player.attachMediaElement(videoRef.value)
    player.load()

    player.on(flvjs.Events.METADATA_ARRIVED, () => {
      connectionStatus.value = 'connected'
      retryCount.value = 0
      // 跳转到最新帧
      jumpToLatestFrame()
    })

    player.on(flvjs.Events.ERROR, (errType, errDetail) => {
      console.error('Player error:', errType, errDetail)
      handleError()
    })

    player.play().catch(err => {
      console.error('Play failed:', err)
      handleError()
    })

  } catch (error) {
    console.error('Player initialization failed:', error)
    handleError()
  }
}

// 跳转到最新帧
function jumpToLatestFrame() {
  if (player && videoRef.value.buffered.length > 0) {
    try {
      videoRef.value.currentTime = videoRef.value.buffered.end(0) - 0.1
      // 确保视频在播放状态
      if (videoRef.value.paused) {
        videoRef.value.play().catch(console.error)
      }
    } catch (e) {
      console.error('Jump to latest frame failed:', e)
    }
  }
}

// 销毁播放器
function destroyPlayer() {
  if (player) {
    try {
      player.pause()
      player.unload()
      player.detachMediaElement()
      player.destroy()
    } catch (e) {
      console.error('Error destroying player:', e)
    }
    player = null
  }
}

// 初始化WebSocket连接
function initWebSocket() {
  cleanupWebSocket()

  try {
    ws = new WebSocket(`${CONFIG.SERVER_URL}/heartbeat`)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      connectionStatus.value = 'connecting'
      startHeartbeat()
      // 只在页面可见时初始化播放器
      if (isPageVisible.value) {
        initPlayer()
      }
    }

    ws.onmessage = (e) => {
      if (e.data === 'pong') {
        const rtt = Date.now() - lastPingTime
        delayMs.value = rtt

        if (rtt > CONFIG.HIGH_LATENCY_THRESHOLD && isPageVisible.value) {
          optimizeStream()
        }
      }
    }

    ws.onclose = () => {
      connectionStatus.value = 'disconnected'
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.error('WebSocket error:', err)
      connectionStatus.value = 'error'
      scheduleReconnect()
    }

  } catch (error) {
    console.error('WebSocket initialization failed:', error)
    scheduleReconnect()
  }
}

// 优化流媒体播放
function optimizeStream() {
  if (player && videoRef.value.buffered.length > 0) {
    try {
      jumpToLatestFrame()
      // 降低缓冲区
      player._config.stashInitialSize = 0
    } catch (e) {
      console.error('Stream optimization failed:', e)
    }
  }
}

function toggleFullscreen() {
  if (!isFullscreen.value) {
    // 进入全屏前记录暂停状态
    wasPausedBeforeFullscreen.value = videoRef.value?.paused || false
    const el = videoRef.value
    el.requestFullscreen?.() || el.webkitRequestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

// 发送心跳
function startHeartbeat() {
  stopHeartbeat()
  lastPingTime = Date.now()
  ws.send('ping')
  heartbeatTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      lastPingTime = Date.now()
      ws.send('ping')
    }
  }, CONFIG.HEARTBEAT_INTERVAL)
}

// 停止心跳
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

// 安排重连
function scheduleReconnect() {
  clearTimeout(retryTimer)

  if (retryCount.value >= CONFIG.MAX_RETRY_COUNT) {
    console.error('Max retry count reached')
    return
  }

  retryCount.value++
  retryTimer = setTimeout(() => {
    connectionStatus.value = 'reconnecting'
    initWebSocket()
  }, CONFIG.RECONNECT_DELAY)
}

// 清理WebSocket
function cleanupWebSocket() {
  stopHeartbeat()
  if (ws) {
    ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null
    ws.close()
    ws = null
  }
}

// 处理错误
function handleError() {
  connectionStatus.value = 'error'
  destroyPlayer()
  scheduleReconnect()
}

// 处理页面可见性变化
function handleVisibilityChange() {
  isPageVisible.value = document.visibilityState === 'visible'

  if (isPageVisible.value) {
    // 页面变为可见时重新初始化播放器
    console.log('页面变为可见，重新初始化播放器')
    initPlayer()
  } else {
    // 页面变为隐藏时完全卸载播放器
    console.log('页面变为隐藏，卸载播放器')
    destroyPlayer()
  }
}

// 处理全屏变化
function handleFullscreenChange() {
  const newFullscreenState = !!document.fullscreenElement
  if (isFullscreen.value && !newFullscreenState) {
    // 退出全屏时跳转到最新帧并播放
    console.log('退出全屏，跳转到最新帧')
    jumpToLatestFrame()
  }
  isFullscreen.value = newFullscreenState
}

// 生命周期钩子
onMounted(() => {
  // 初始化页面可见状态
  isPageVisible.value = document.visibilityState === 'visible'

  // 初始化WebSocket连接
  initWebSocket()

  // 添加事件监听
  document.addEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('fullscreenchange', handleFullscreenChange)
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.addEventListener('MSFullscreenChange', handleFullscreenChange)
})

onUnmounted(() => {
  // 清理事件监听和定时器
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
  clearInterval(heartbeatTimer)
  clearTimeout(retryTimer)
  destroyPlayer()
  cleanupWebSocket()
})
</script>

<template>
  <main>
    <video ref="videoRef" autoplay muted playsinline @dblclick="toggleFullscreen"></video>
  </main>
</template>

<style scoped>
video {
  width: 100%;
  max-width: 800px;
  border-radius: 6px;
}
</style>