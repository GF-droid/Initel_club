<template>
  <main class="chart-page">
    <header class="page-header"><div><p class="eyebrow">DATA ANALYTICS</p><h1>历史数据分析</h1><p>每个房间独立设置查询条件，查看温度与湿度的历史变化趋势。</p></div></header>
    <nav class="chart-nav" aria-label="房间组选择"><button v-for="group in groups" :key="group.label" class="nav-btn" :class="{ active: activeGroup.label === group.label }" @click="selectGroup(group)">{{ group.label }}</button></nav>
    <section class="room-grid">
      <article v-for="room in roomPanels" :key="room.id" class="room-panel">
        <div class="room-heading"><div><h2>{{ room.id }} 房间</h2><p>温湿度历史趋势</p></div><el-tag :type="room.loading ? 'warning' : room.error ? 'danger' : 'success'" effect="plain">{{ room.loading ? '加载中' : room.error ? '加载失败' : `${room.readings.length} 条数据` }}</el-tag></div>
        <el-form label-position="top" class="query-form" @submit.prevent="loadRoom(room)"><el-form-item label="时间范围"><el-date-picker v-model="room.timeRange" type="datetimerange" start-placeholder="开始时间" end-placeholder="结束时间" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm:ss" clearable /></el-form-item><el-form-item label="数据条数"><el-input-number v-model="room.limit" :min="10" :max="500" :step="10" controls-position="right" /></el-form-item><el-button type="primary" :icon="Search" :loading="room.loading" native-type="submit">查询</el-button></el-form>
        <div class="chart-area"><div v-if="room.loading" class="chart-state">正在加载 {{ room.id }} 房间数据...</div><div v-else-if="room.error" class="chart-state error">{{ room.error }}</div><div v-else-if="!room.readings.length" class="chart-state">暂无历史数据</div><v-chart v-else class="chart" :option="getChartOption(room)" autoresize /></div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search } from '@element-plus/icons-vue'
import axios from '@/store/SetAxios'

interface Reading { wendu: number; shidu: number; time: string }
interface Group { label: string; rooms: string[] }
interface RoomPanel { id: string; limit: number; timeRange: [string, string] | null; readings: Reading[]; loading: boolean; error: string }
const groups: Group[] = [{ label: '101 / 102 房间', rooms: ['101', '102'] }, { label: '108 / 109 房间', rooms: ['108', '109'] }, { label: '113 / 115 房间', rooms: ['113', '115'] }, { label: '116 / 117 房间', rooms: ['116', '117'] }, { label: '118 / 119 房间', rooms: ['118', '119'] }]
const activeGroup = ref(groups[0]); const roomPanels = ref<RoomPanel[]>([])
const createPanel = (id: string): RoomPanel => ({ id, limit: 50, timeRange: null, readings: [], loading: false, error: '' })
const loadRoom = async (room: RoomPanel) => { room.loading = true; room.error = ''; try { const [startTime, endTime] = room.timeRange ?? []; const response = await axios.get<{ data: Reading[] }>(`/telemetry/rooms/${room.id}/history`, { params: { limit: room.limit, ...(startTime && endTime ? { startTime, endTime } : {}) } }); room.readings = Array.isArray(response.data?.data) ? response.data.data : [] } catch { room.readings = []; room.error = '数据加载失败，请检查服务连接或查询时间范围' } finally { room.loading = false } }
const selectGroup = (group: Group) => { activeGroup.value = group; roomPanels.value = group.rooms.map(createPanel); roomPanels.value.forEach((room) => void loadRoom(room)) }
const getChartOption = (room: RoomPanel) => ({ backgroundColor: 'transparent', tooltip: { trigger: 'axis' }, legend: { top: 4, data: ['温度', '湿度'], textStyle: { color: '#c6d0d9' } }, grid: { left: 46, right: 46, top: 40, bottom: 34, containLabel: true }, xAxis: { type: 'category', data: room.readings.map((item) => item.time), axisLabel: { color: '#aebbc6', hideOverlap: true }, axisLine: { lineStyle: { color: '#53606b' } } }, yAxis: [{ type: 'value', name: '温度 C', nameTextStyle: { color: '#aebbc6' }, axisLabel: { color: '#aebbc6' }, splitLine: { lineStyle: { color: '#414b55' } } }, { type: 'value', name: '湿度 %', nameTextStyle: { color: '#aebbc6' }, axisLabel: { color: '#aebbc6' }, splitLine: { show: false } }], series: [{ name: '温度', type: 'line', smooth: true, showSymbol: false, data: room.readings.map((item) => item.wendu), itemStyle: { color: '#ff8a65' } }, { name: '湿度', type: 'line', yAxisIndex: 1, smooth: true, showSymbol: false, data: room.readings.map((item) => item.shidu), itemStyle: { color: '#65aef2' } }] })
selectGroup(groups[0])
</script>

<style scoped>
.chart-page { box-sizing: border-box; width: 100%; height: 100%; min-height: 0; padding: 22px clamp(16px, 2.5vw, 36px); overflow: auto; background: #252a2f; color: #edf3f8; }.page-header, .chart-nav, .room-grid { width: min(1420px, 100%); margin: 0 auto; }.page-header { margin-bottom: 18px; }.eyebrow { margin: 0 0 6px; color: #83c3ef; font-size: 12px; font-weight: 600; }h1 { margin: 0; font-size: 28px; font-weight: 600; }.page-header p:last-child { margin: 8px 0 0; color: #aebbc6; font-size: 14px; }.chart-nav { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; padding: 6px; border: 1px solid #414b55; border-radius: 8px; background: #30373e; }.nav-btn { flex: 1 1 150px; padding: 10px 14px; border: 0; border-radius: 5px; background: transparent; color: #aebbc6; font: inherit; font-size: 13px; cursor: pointer; }.nav-btn:hover { background: #3a444d; color: #edf3f8; }.nav-btn.active { background: #1f4058; color: #9fd4f5; font-weight: 600; }.room-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }.room-panel { min-width: 0; border: 1px solid #414b55; border-radius: 8px; background: #30373e; overflow: hidden; }.room-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 16px 18px 12px; }.room-heading h2 { margin: 0; font-size: 17px; }.room-heading p { margin: 5px 0 0; color: #8e9ca8; font-size: 12px; }.query-form { display: grid; grid-template-columns: minmax(0, 1fr) 112px auto; align-items: end; gap: 10px; padding: 0 18px 14px; border-bottom: 1px solid #414b55; }.query-form :deep(.el-form-item) { min-width: 0; margin-bottom: 0; }.query-form :deep(.el-form-item__label) { padding-bottom: 5px; color: #c6d0d9; font-size: 12px; }.query-form :deep(.el-date-editor), .query-form :deep(.el-input-number) { width: 100%; }.query-form :deep(.el-input__wrapper), .query-form :deep(.el-date-editor .el-range-input), .query-form :deep(.el-input-number) { background: #252a2f; color: #edf3f8; }.query-form :deep(.el-input__wrapper), .query-form :deep(.el-input-number) { box-shadow: 0 0 0 1px #4a5661 inset; }.query-form :deep(.el-range-input), .query-form :deep(.el-range-separator), .query-form :deep(.el-input__inner) { color: #c6d0d9; }.chart-area { height: 330px; padding: 12px; }.chart { width: 100%; height: 100%; }.chart-state { display: grid; height: 100%; place-items: center; color: #aebbc6; font-size: 13px; }.chart-state.error { color: #f59b9b; }@media (max-width: 980px) { .room-grid { grid-template-columns: 1fr; } }.query-form { grid-template-columns: minmax(0, 1fr) 112px auto; }@media (max-width: 600px) { .chart-page { padding: 16px 12px; }.query-form { grid-template-columns: 1fr; }.query-form .el-button { width: 100%; }.chart-area { height: 280px; } }
@media (max-width: 560px) {
  .chart-page { padding: 12px 8px; }
  h1 { font-size: 24px; }
  .page-header p:last-child { font-size: 12px; }
  .chart-nav { flex-wrap: nowrap; overflow-x: auto; }
  .nav-btn { flex: 0 0 auto; min-width: 126px; padding: 9px 10px; font-size: 12px; }
  .room-heading { padding: 14px 12px 10px; }
  .room-heading h2 { font-size: 15px; }
  .query-form { padding: 0 12px 12px; }
  .chart-area { height: 250px; padding: 8px; }
}
</style>
