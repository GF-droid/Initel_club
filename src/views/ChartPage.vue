<template>
  <div class="chart-container">
    <nav class="chart-nav">
      <button class="nav-btn" @click="setCurrentChart(Chart1)">101、102房间</button>
      <button class="nav-btn" @click="setCurrentChart(Chart2)">108、110房间</button>
      <button class="nav-btn" @click="setCurrentChart(Chart3)">113、115房间</button>
      <button class="nav-btn" @click="setCurrentChart(Chart4)">116、117房间</button>
      <button class="nav-btn" @click="setCurrentChart(Chart5)">118、119房间</button>
    </nav>
    <div class="chart-display">
      <!-- 使用动态组件 -->
      <component :is="currentChart"></component>
      <!-- 这里放置图表组件 -->
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Chart1 from "@/components/Charts/Chart1.vue"
import Chart2 from "@/components/Charts/Chart2.vue"
import Chart3 from "@/components/Charts/Chart3.vue"
import Chart4 from "@/components/Charts/Chart4.vue"
import Chart5 from "@/components/Charts/Chart5.vue"



const currentChart = ref(Chart1); // 默认加载 Chart101

function setCurrentChart(chartName) {
  currentChart.value = chartName;

}
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
  position: relative;
  overflow: hidden;
}

.chart-container::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 20px 20px;
  animation: moveStars 100s linear infinite;
}

@keyframes moveStars {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.chart-nav {
  padding: 20px;
  display: flex;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-btn {
  margin: 0 10px;
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: rgba(0, 150, 255, 0.2);
  color: #00ffff;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 0 5px #00ffff;
}

.nav-btn:hover {
  background: rgba(0, 150, 255, 0.4);
  transform: translateY(-2px);
  box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
}

.chart-display {
  flex: 1;
  margin: 20px;
  background: rgba(0, 50, 100, 0.3);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 100, 255, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(0, 150, 255, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
