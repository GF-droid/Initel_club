<template>
  <div class="area">
    <canvas ref="particleCanvas"></canvas>
    <div class="title-area">
      <h1>库房控制</h1>
    </div>
    <div class="content-card">
      <RoomCard />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import RoomCard from '@/components/RoomCard.vue';

const particleCanvas = ref(null);
let animationFrameId = null;
let particles = [];

function resizeCanvas() {
  const canvas = particleCanvas.value;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createParticle() {
  const canvas = particleCanvas.value;
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 4 + 0.5, // 减小粒子大小
    speedX: Math.random() * 1 - 1, // 减小速度范围
    speedY: Math.random() * 1 - 1,
    color: `hsl(${200 + Math.random() * 40}, 100%, ${70 + Math.random() * 30}%)`
  };
}

function drawParticles(ctx) {
  particles.forEach((particle, index) => {
    particle.x += particle.speedX;
    particle.y += particle.speedY;

    if (particle.x < 0 || particle.x > ctx.canvas.width) particle.speedX *= -1;
    if (particle.y < 0 || particle.y > ctx.canvas.height) particle.speedY *= -1;

    // 绘制粒子
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.fill();

    // 添加发光效果
    ctx.shadowBlur = 15;
    ctx.shadowColor = particle.color;

    // 连线效果
    for (let j = index + 1; j < particles.length; j++) {
      const dx = particle.x - particles[j].x;
      const dy = particle.y - particles[j].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 150) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(100, 200, 255, ${0.3 - distance / 500})`;
        ctx.lineWidth = 0.8;
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      }
    }
  });
}

function animate() {
  const canvas = particleCanvas.value;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawParticles(ctx);

  animationFrameId = requestAnimationFrame(animate);
}

onMounted(() => {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  for (let i = 0; i < 75; i++) {
    particles.push(createParticle());
  }

  animate();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCanvas);
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.area {
  position: relative;
  width: 100%;
  height: 100vh;
  background: linear-gradient(to right, #041E42, #004080, #0080FF);
  overflow: hidden;
}

canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.content-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  color: white;
  text-align: center;
  width: 90%;
  max-width: 1400px;
  height: 70%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.content-card h1 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}

.content-card p {
  font-size: 1.2rem;
  line-height: 1.6;
}

.title-area {
  position: absolute;
  top: 0%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
}

.title-area h1 {
  font-size: 3rem;
  color: #00BFFF;
  /* 明亮的蓝色，与背景相协调 */
  text-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
  /* 添加发光效果 */
}

/* 媒体查询，针对不同屏幕尺寸调整样式 */
@media (max-width: 768px) {
  .content-card {
    padding: 2rem;
    height: 90%;
  }

  .content-card h1 {
    font-size: 2rem;
  }

  .content-card p {
    font-size: 1rem;
  }

  .title-area h1 {
    font-size: 2.5rem;
  }
}

@media (max-width: 480px) {
  .content-card {
    width: 100%;
    max-width: none;
    padding: 1rem;
  }

  .content-card h1 {
    font-size: 1.5rem;
  }

  .content-card p {
    font-size: 0.9rem;
  }

  .title-area h1 {
    font-size: 2rem;
  }
}
</style>
