<template>
  <div class="chart-container">
    <header class="page-header">
      <div>
        <p class="eyebrow">DATA ANALYTICS</p>
        <h1>环境趋势分析</h1>
        <span>选择房间组，查看温度与湿度的实时变化</span>
      </div>
      <el-tag type="success" effect="light">实时更新</el-tag>
    </header>
    <nav class="chart-nav" aria-label="房间组选择">
      <button v-for="item in chartGroups" :key="item.label" class="nav-btn" :class="{ active: currentChart === item.component }" @click="setCurrentChart(item.component)">
        {{ item.label }}
      </button>
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



const chartGroups = [
  { label: '101、102 房间', component: Chart1 },
  { label: '108、110 房间', component: Chart2 },
  { label: '113、115 房间', component: Chart3 },
  { label: '116、117 房间', component: Chart4 },
  { label: '118、119 房间', component: Chart5 },
]

const currentChart = ref(Chart1);

function setCurrentChart(chartName) {
  currentChart.value = chartName;

}
</script>

<style scoped>
.chart-container {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: clamp(18px, 3vw, 40px);
  background: linear-gradient(135deg, #edf4fa 0%, #f8fbff 58%, #e8f2fa 100%);
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
  background: radial-gradient(circle, rgba(45, 112, 170, 0.08) 1px, transparent 1px);
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
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 6px;
  border: 1px solid #dce8f3;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(38, 74, 111, 0.08);
}

.nav-btn {
  flex: 1 1 150px;
  padding: 11px 16px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: #5d7188;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  color: #23679f;
  background: #eef6fd;
}

.nav-btn.active {
  color: #ffffff;
  background: #2774b7;
  box-shadow: 0 6px 14px rgba(39, 116, 183, 0.24);
}

.chart-display {
  flex: 1;
  min-height: 520px;
  padding: 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 14px 36px rgba(38, 74, 111, 0.1);
  border: 1px solid #dce8f3;
  display: flex;
  justify-content: center;
  align-items: center;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  color: #173f67;
}

.page-header h1 {
  margin: 4px 0 8px;
  font-size: clamp(26px, 3vw, 36px);
}

.page-header span {
  color: #6b7c93;
  font-size: 14px;
}

.eyebrow {
  margin: 0;
  color: #2774b7;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

@media (max-width: 640px) {
  .chart-container {
    padding: 16px 12px 24px;
  }

  .page-header {
    flex-direction: column;
  }

  .chart-display {
    min-height: 420px;
    padding: 10px;
  }
}

/* 历史分析页与其他数据页统一，禁止页面滚动 */
.chart-container {
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  padding: 18px clamp(14px, 2vw, 28px);
  background: #252a2f;
  overflow: hidden;
}

.chart-container::before {
  opacity: 0.08;
}

.page-header {
  color: #edf3f8;
}

.page-header span {
  color: #aebbc6;
}

.eyebrow {
  color: #65aef2;
}

.chart-nav {
  border-color: #414b55;
  background: #30373e;
  box-shadow: none;
}

.nav-btn {
  color: #b8c4ce;
}

.nav-btn:hover {
  color: #edf3f8;
  background: #46525e;
}

.chart-display {
  min-height: 0;
  overflow: hidden;
  border-color: #414b55;
  background: #30373e;
  box-shadow: none;
}
</style>
