<template>
  <main class="chart-page">
    <header class="page-header">
      <div><p class="eyebrow">DATA ANALYTICS</p><h1>历史数据分析</h1><p>选择房间组，查看温度与湿度的历史变化趋势。</p></div>
      <el-tag type="success" effect="dark">实时更新</el-tag>
    </header>

    <nav class="chart-nav" aria-label="房间组选择">
      <button v-for="group in groups" :key="group.label" class="nav-btn" :class="{ active: activeGroup.label === group.label }" @click="selectGroup(group)">{{ group.label }}</button>
    </nav>

    <section class="chart-panel">
      <div v-if="loading" class="chart-state">正在加载历史数据...</div>
      <div v-else-if="error" class="chart-state error">{{ error }}</div>
      <v-chart v-else class="chart" :option="chartOption" autoresize />
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import axios from '@/store/SetAxios'

interface Reading { wendu: number; shidu: number; time: string }
interface Group { label: string; rooms: string[] }

const groups: Group[] = [
  { label: '101 / 102 房间', rooms: ['101', '102'] },
  { label: '108 / 109 房间', rooms: ['108', '109'] },
  { label: '113 / 115 房间', rooms: ['113', '115'] },
  { label: '116 / 117 房间', rooms: ['116', '117'] },
  { label: '118 / 119 房间', rooms: ['118', '119'] }
]

const activeGroup = ref(groups[0])
const readings = ref<[Reading[], Reading[]]>([[], []])
const loading = ref(false)
const error = ref('')

const loadGroup = async (group: Group) => {
  loading.value = true
  error.value = ''
  try {
    const responses = await Promise.all(group.rooms.map((room) => axios.get<Reading[]>(`/telemetry/rooms/${room}`, { params: { limit: 20 } })))
    readings.value = responses.map((response) => Array.isArray(response.data) ? response.data : []) as [Reading[], Reading[]]
  } catch {
    error.value = '历史数据加载失败，请检查后端服务连接。'
    readings.value = [[], []]
  } finally {
    loading.value = false
  }
}

const selectGroup = (group: Group) => { activeGroup.value = group; void loadGroup(group) }
const labels = computed(() => readings.value[0].map((item) => item.time))
const chartOption = computed(() => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis' },
  legend: { top: 6, textStyle: { color: '#c6d0d9' } },
  grid: { left: 48, right: 48, top: 52, bottom: 34, containLabel: true },
  xAxis: { type: 'category', data: labels.value, axisLabel: { color: '#aebbc6' }, axisLine: { lineStyle: { color: '#53606b' } } },
  yAxis: [
    { type: 'value', name: '温度 deg C', nameTextStyle: { color: '#aebbc6' }, axisLabel: { color: '#aebbc6' }, splitLine: { lineStyle: { color: '#414b55' } } },
    { type: 'value', name: '湿度 %', nameTextStyle: { color: '#aebbc6' }, axisLabel: { color: '#aebbc6' }, splitLine: { show: false } }
  ],
  series: [
    { name: `${activeGroup.value.rooms[0]} 温度`, type: 'line', smooth: true, data: readings.value[0].map((item) => item.wendu), itemStyle: { color: '#ff8a65' } },
    { name: `${activeGroup.value.rooms[0]} 湿度`, type: 'line', yAxisIndex: 1, smooth: true, data: readings.value[0].map((item) => item.shidu), itemStyle: { color: '#65aef2' } },
    { name: `${activeGroup.value.rooms[1]} 温度`, type: 'line', smooth: true, data: readings.value[1].map((item) => item.wendu), itemStyle: { color: '#f5c451' } },
    { name: `${activeGroup.value.rooms[1]} 湿度`, type: 'line', yAxisIndex: 1, smooth: true, data: readings.value[1].map((item) => item.shidu), itemStyle: { color: '#83c3ef' } }
  ]
}))

onMounted(() => { void loadGroup(activeGroup.value) })
</script>

<style scoped>
.chart-page { box-sizing: border-box; width: 100%; height: 100%; min-height: 0; padding: 22px clamp(16px, 2.5vw, 36px); overflow: auto; background: #252a2f; color: #edf3f8; }
.page-header, .chart-nav, .chart-panel { width: min(1180px, 100%); margin: 0 auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.eyebrow { margin: 0 0 6px; color: #83c3ef; font-size: 12px; font-weight: 600; }
h1 { margin: 0; font-size: 28px; font-weight: 600; }
.page-header p:last-child { margin: 8px 0 0; color: #aebbc6; font-size: 14px; }
.chart-nav { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; padding: 6px; border: 1px solid #414b55; border-radius: 8px; background: #30373e; }
.nav-btn { flex: 1 1 150px; padding: 10px 14px; border: 0; border-radius: 5px; background: transparent; color: #aebbc6; font: inherit; font-size: 13px; cursor: pointer; }
.nav-btn:hover { background: #3a444d; color: #edf3f8; }
.nav-btn.active { background: #1f4058; color: #9fd4f5; font-weight: 600; }
.chart-panel { box-sizing: border-box; height: min(560px, calc(100% - 150px)); min-height: 360px; padding: 16px; border: 1px solid #414b55; border-radius: 8px; background: #30373e; }
.chart { width: 100%; height: 100%; }
.chart-state { display: grid; height: 100%; place-items: center; color: #aebbc6; font-size: 14px; }
.chart-state.error { color: #f59b9b; }
@media (max-width: 600px) { .chart-page { padding: 16px 12px; } .page-header { flex-direction: column; } .chart-panel { min-height: 420px; } }
</style>
