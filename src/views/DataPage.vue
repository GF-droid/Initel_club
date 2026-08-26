<template><main class="log-page"><header class="page-header"><div><p class="eyebrow">OPERATION AUDIT</p><h1>操作日志</h1><p>记录空调控制及智能策略的每一次操作与执行结果。</p></div><el-button type="primary" :icon="Refresh" :loading="loading" @click="loadLogs">刷新日志</el-button></header><section class="log-panel"><div class="panel-toolbar"><div><h2>空调操作记录</h2><span class="meta">共 {{ filteredLogs.length }} 条记录</span></div><div class="filters"><el-select v-model="roomFilter" clearable popper-class="operation-log-select" placeholder="全部房间"><el-option v-for="room in rooms" :key="room.id" :label="room.label" :value="room.id" /></el-select><el-select v-model="resultFilter" clearable popper-class="operation-log-select" placeholder="全部结果"><el-option label="成功" value="success" /><el-option label="失败" value="failed" /></el-select></div></div><el-table v-loading="loading" :data="filteredLogs" class="logs-table" stripe height="calc(100% - 82px)" empty-text="暂无操作记录"><el-table-column prop="createdAt" label="操作时间" width="180" /><el-table-column prop="roomId" label="房间" width="100"><template #default="{ row }">{{ row.roomId || '-' }}</template></el-table-column><el-table-column prop="action" label="操作内容" min-width="180" /><el-table-column label="执行结果" width="110" align="center"><template #default="{ row }"><el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? '成功' : '失败' }}</el-tag></template></el-table-column><el-table-column prop="message" label="结果说明" min-width="180" show-overflow-tooltip /><el-table-column label="详情" min-width="200" show-overflow-tooltip><template #default="{ row }">{{ formatDetails(row.details) }}</template></el-table-column></el-table></section></main></template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from '@/store/SetAxios'
import { useAirConditioningStore } from '@/store/airConditioningStore'
interface OperationLog { id:number; operationType:string; roomId?:string; action:string; details?:unknown; success:boolean; message?:string; createdAt:string }
const airStore=useAirConditioningStore(); const rooms=airStore.rooms; const logs=ref<OperationLog[]>([]); const loading=ref(false); const roomFilter=ref(''); const resultFilter=ref('')
const filteredLogs=computed(()=>logs.value.filter(log=>(!roomFilter.value||log.roomId===roomFilter.value)&&(!resultFilter.value||(resultFilter.value==='success'?log.success:!log.success))))
const formatDetails=(details:unknown)=>details?(typeof details==='string'?details:JSON.stringify(details)):'-'
const loadLogs=async()=>{loading.value=true;try{const response=await axios.get<OperationLog[]>('/operation-logs',{params:{limit:300}});logs.value=Array.isArray(response.data)?response.data:[]}catch{ElMessage.error('操作日志加载失败，请稍后重试')}finally{loading.value=false}}
onMounted(loadLogs)
</script>
<style>
.log-page{box-sizing:border-box;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;padding:22px clamp(16px,2.5vw,36px);overflow:hidden;background:#252a2f;color:#edf3f8}.page-header,.log-panel{box-sizing:border-box;width:min(1420px,100%);margin:0 auto}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:18px}.eyebrow{margin:0 0 6px;color:#83c3ef;font-size:12px;font-weight:600}h1{margin:0;font-size:28px;font-weight:600}.page-header p:last-child{margin:8px 0 0;color:#aebbc6;font-size:14px}.log-panel{display:flex;flex:1;flex-direction:column;min-height:0;overflow:hidden;border:1px solid #414b55;border-radius:8px;background:#30373e}.panel-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 18px;border-bottom:1px solid #414b55}.panel-toolbar h2{margin:0 0 4px;font-size:16px}.meta{color:#8e9ca8;font-size:12px}.filters{display:flex;gap:8px}.filters :deep(.el-select){width:150px}.filters :deep(.el-select__wrapper){background:#252a2f;box-shadow:0 0 0 1px #4a5661 inset}.filters :deep(.el-select__selected-item),.filters :deep(.el-select__placeholder){color:#c6d0d9}.logs-table{flex:1;min-height:0;--el-table-bg-color:#30373e;--el-table-tr-bg-color:#30373e;--el-table-row-hover-bg-color:#3a444d;--el-table-header-bg-color:#292f35;--el-table-border-color:#414b55;--el-table-text-color:#c6d0d9;--el-table-header-text-color:#aebbc6}.logs-table :deep(.el-table__body tr),.logs-table :deep(.el-table__body tr.el-table__row--striped){background:#30373e!important}.logs-table :deep(.el-table__body tr:hover>td.el-table__cell){background:#3a444d!important}.logs-table :deep(.el-loading-mask){background:rgba(37,42,47,.88)}.logs-table :deep(.el-loading-spinner .circular){stroke:#83c3ef}@media(max-width:700px){.log-page{padding:16px 12px;overflow:auto}.page-header{flex-direction:column}.panel-toolbar{align-items:stretch;flex-direction:column}.filters{width:100%}.filters :deep(.el-select){flex:1;width:auto}.log-panel{min-height:520px}}
.filters .el-select { width: 150px; }
.filters .el-select .el-select__wrapper { min-height: 36px; background: #252a2f !important; border: 1px solid #4a5661; border-radius: 6px; box-shadow: none !important; }
.filters .el-select .el-select__wrapper:hover, .filters .el-select.is-focused .el-select__wrapper { border-color: #83c3ef; box-shadow: 0 0 0 1px #83c3ef inset !important; }
.filters .el-select .el-select__selected-item, .filters .el-select .el-select__placeholder { color: #c6d0d9 !important; }
.filters .el-select .el-select__caret, .filters .el-select .el-select__clear { color: #8e9ca8; }
.operation-log-select { border: 1px solid #4a5661 !important; background: #30373e !important; box-shadow: 0 10px 24px rgba(0, 0, 0, .35) !important; }
.operation-log-select .el-select-dropdown__item { height: 34px; color: #c6d0d9; }
.operation-log-select .el-select-dropdown__item:hover, .operation-log-select .el-select-dropdown__item.hover { background: #3a444d; color: #edf3f8; }
.operation-log-select .el-select-dropdown__item.is-selected { background: #1f4058; color: #9fd4f5; }
.logs-table .el-loading-mask { background: rgba(37, 42, 47, .88) !important; }
.logs-table .el-loading-spinner .circular { stroke: #83c3ef; }
.logs-table .el-loading-spinner .el-loading-text { color: #aebbc6; }
.logs-table .el-table__body tr,
.logs-table .el-table__body tr.el-table__row--striped,
.logs-table .el-table__body tr.el-table__row--striped > td.el-table__cell,
.logs-table .el-table__body td.el-table__cell { background: #30373e !important; }
.logs-table .el-table__body tr:hover > td.el-table__cell { background: #3a444d !important; }
</style>
