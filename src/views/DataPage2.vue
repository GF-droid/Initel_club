<template>
  <div class="area-wrapper">
    <div class="data-page">
      <!-- 背景画布 -->
      <canvas ref="particleCanvas" class="particle-canvas"></canvas>

      <!-- 内容区域 -->
      <div class="content-wrapper">
        <!-- 数据卡片区域 -->
        <div class="data-card-section">
          <DataCard />
        </div>

        <!-- 底部信息 -->
        <div class="footer-section">
          <div class="stats-info">
            <div class="stat-item">
              <el-icon>
                <Clock />
              </el-icon>
              <span>最后更新: {{ updateTime }}</span>
            </div>
            <div class="stat-item">
              <el-icon>
                <View />
              </el-icon>
              <span>数据刷新频率: 5秒</span>
            </div>
          </div>
          <div class="control-buttons">
            <el-button type="primary" size="small" @click="refreshData">
              <el-icon>
                <Refresh />
              </el-icon>
              刷新数据
            </el-button>
            <el-button type="info" size="small" @click="toggleParticles">
              <el-icon>
                <VideoPlay v-if="showParticles" />
                <VideoPause v-else />
              </el-icon>
              {{ showParticles ? '暂停动画' : '恢复动画' }}
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import DataCard from '@/components/DataCard.vue';
import { useDataStore } from '@/store/Data/DataStore';
import {
  DataBoard,
  Clock,
  View,
  Refresh,
  VideoPlay,
  VideoPause
} from '@element-plus/icons-vue';

const particleCanvas = ref(null);
const showParticles = ref(true);
let animationFrameId = null;
let particles = [];
let mouse = { x: 0, y: 0 };

// 更新时间
const formatTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};
const updateTime = ref(formatTime());
const dataStore = useDataStore();
let clockTimer;

function resizeCanvas() {
  const canvas = particleCanvas.value;
  if (canvas) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
}

function createParticle() {
  const canvas = particleCanvas.value;
  if (!canvas) return null;

  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 3 + 0.5,
    speedX: Math.random() * 1.5 - 0.75,
    speedY: Math.random() * 1.5 - 0.75,
    color: `hsla(${200 + Math.random() * 40}, 100%, ${70 + Math.random() * 30}%, 0.7)`
  };
}

function drawParticles() {
  if (!showParticles.value || !particleCanvas.value) return;

  const canvas = particleCanvas.value;
  const ctx = canvas.getContext('2d');

  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 创建渐变背景
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
  );
  gradient.addColorStop(0, 'rgba(4, 30, 66, 0.1)');
  gradient.addColorStop(0.5, 'rgba(0, 64, 128, 0.05)');
  gradient.addColorStop(1, 'rgba(0, 32, 96, 0.02)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 更新和绘制粒子
  particles.forEach((particle) => {
    if (!particle) return;

    let dx = mouse.x - particle.x;
    let dy = mouse.y - particle.y;
    let distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 80) {
      particle.x += dx * 0.02;
      particle.y += dy * 0.02;
    } else {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      // 边界反弹
      if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -0.9;
      if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -0.9;
    }

    // 绘制粒子
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();

    // 发光效果
    ctx.shadowBlur = 10;
    ctx.shadowColor = particle.color;
  });

  // 绘制连线
  ctx.shadowBlur = 0;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 100) {
        ctx.beginPath();
        const opacity = 0.2 - distance / 500;
        ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
        ctx.lineWidth = 0.6;
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  }

  if (showParticles.value) {
    animationFrameId = requestAnimationFrame(drawParticles);
  }
}

function handleMouseMove(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

function toggleParticles() {
  showParticles.value = !showParticles.value;
  if (showParticles.value && !animationFrameId) {
    drawParticles();
  }
}

async function refreshData() {
  await Promise.all([dataStore.getalldata(), dataStore.getSmokeStatuses()]);
  updateTime.value = formatTime();
}

function initParticles() {
  resizeCanvas();
  particles = [];
  const particleCount = Math.min(50, Math.floor((window.innerWidth * window.innerHeight) / 20000));
  for (let i = 0; i < particleCount; i++) {
    const particle = createParticle();
    if (particle) particles.push(particle);
  }
}

onMounted(() => {
  initParticles();
  window.addEventListener('resize', resizeCanvas);
  clockTimer = window.setInterval(() => {
    updateTime.value = formatTime();
  }, 1000);

  if (showParticles.value) {
    drawParticles();
  }
});

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', resizeCanvas);
  window.clearInterval(clockTimer);
  particles = [];
});
</script>

<style scoped>
.area-wrapper {
  width: 100%;
  /* 只显示50%宽度 */
  height: 100vh;
  overflow: hidden;
  position: fixed;
  /* 固定在左侧 */
  /* left: 0;
  top: 0; */
}

.data-page {
  position: relative;
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #041E42 0%, #004080 50%, #0080FF 100%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.particle-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  position: relative;
  z-index: 2;
}

/* 头部区域 */
.header-section {
  margin-bottom: 30px;
  width: 80%;
  padding: 25px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.title-container {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 12px;
}

.title-icon {
  font-size: 36px;
  color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
  padding: 10px;
  border-radius: 12px;
}

.main-title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  background: linear-gradient(45deg, #fff, #a0c8ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.subtitle-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  font-weight: 300;
  letter-spacing: 0.5px;
}

.status-tag {
  font-weight: 500;
  letter-spacing: 1px;
  padding: 6px 15px;
  border-radius: 20px;
}

/* 数据卡片区域 */
.data-card-section {
  flex: 1;
  margin-bottom: 20px;
}

/* 底部区域 */
.footer-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 15px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 16px;
  margin-top: auto;
  /* 关键：推到最底部 */
  margin-bottom: 48px;
  /* 与底部的距离 */
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stats-info {
  display: flex;
  gap: 30px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.stat-item .el-icon {
  color: #409EFF;
}

.control-buttons {
  display: flex;
  gap: 12px;
}

/* 动画效果 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-section,
.data-card-section,
.footer-section {
  animation: fadeIn 0.6s ease-out forwards;
}

.header-section {
  animation-delay: 0.1s;
}

.data-card-section {
  animation-delay: 0.2s;
}

.footer-section {
  animation-delay: 0.3s;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 15px;
  }

  .header-section {
    padding: 20px;
  }

  .main-title {
    font-size: 24px;
  }

  .subtitle-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .footer-section {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .stats-info {
    flex-direction: column;
    gap: 10px;
  }

  .control-buttons {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (max-width: 480px) {
  .title-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .main-title {
    font-size: 20px;
  }

  .subtitle {
    font-size: 14px;
  }
}

/* 统一为宽屏工作台布局，避免内容挤在左上角 */
.area-wrapper {
  position: relative;
  width: 100%;
  height: auto;
  min-height: 100%;
  overflow: visible;
}

.data-page {
  min-height: 100%;
  height: auto;
  background: #252a2f;
  color: #edf3f8;
  overflow: visible;
}

.particle-canvas {
  opacity: 0.08;
}

.content-wrapper {
  width: min(1480px, 100%);
  box-sizing: border-box;
  margin: 0 auto;
  padding: clamp(22px, 3vw, 36px) clamp(18px, 3vw, 40px) 64px;
}

.header-section {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 18px;
  padding: 22px 24px;
  border: 1px solid rgba(207, 222, 237, 0.9);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12px 30px rgba(38, 74, 111, 0.1);
}

.title-icon {
  color: #2774b7;
  background: #eaf3fb;
}

.main-title {
  color: #173f67;
  background: none;
  -webkit-text-fill-color: initial;
  font-size: clamp(24px, 3vw, 34px);
}

.subtitle {
  color: #6b7c93;
}

.data-card-section {
  min-height: 0;
  overflow: visible;
  padding: 20px;
  border: 1px solid #414b55;
  border-radius: 18px;
  background: #30373e;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.2);
}

.footer-section {
  margin: 18px 0 0;
  padding: 14px 18px;
  border: 1px solid rgba(207, 222, 237, 0.9);
  border-radius: 14px;
  background: #30373e;
  border-color: #414b55;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
}

.area-wrapper,
.data-page {
  height: 100%;
  min-height: 0;
}

.content-wrapper {
  height: 100%;
  min-height: 0;
  padding-bottom: 20px;
}

.stat-item {
  color: #b4c0cb;
}

.stat-item .el-icon {
  color: #2774b7;
}

@media (max-width: 768px) {
  .content-wrapper {
    padding: 16px 12px 24px;
  }

  .header-section,
  .data-card-section {
    padding: 16px;
  }
}
</style>
