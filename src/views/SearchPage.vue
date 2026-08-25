<template>
  <main class="search-page">
    <header class="page-header"><div><p class="eyebrow">INVENTORY SEARCH</p><h1>智能搜索</h1><p>按物品、房间或关键词快速定位库存记录。</p></div></header>

    <section class="filter-panel">
      <el-form :model="searchForm" label-position="top" class="filter-form" @submit.prevent="onSearch">
        <el-form-item label="物品名称"><el-input v-model="searchForm.name" placeholder="输入物品名称" clearable /></el-form-item>
        <el-form-item label="房间编号"><el-input v-model="searchForm.roomNumber" placeholder="如 101" clearable /></el-form-item>
        <el-form-item label="关键词"><el-input v-model="searchForm.keyword" placeholder="名称或备注" clearable @keyup.enter="onSearch" /></el-form-item>
        <div class="filter-actions"><el-button type="primary" :icon="Search" @click="onSearch">查询</el-button><el-button :icon="Refresh" @click="resetSearch">重置</el-button></div>
      </el-form>
    </section>

    <section class="results-panel">
      <div class="results-header"><div><h2>搜索结果</h2><span class="result-meta">共 {{ filteredData.length }} 条记录<span v-if="hasFilters"> · 已应用筛选</span></span></div><div class="result-actions"><el-button text :icon="Document" :disabled="!tableData.length" @click="exportCurrentPage">导出当前结果</el-button><el-button text :icon="Files" :disabled="!allData.length" @click="exportAllData">导出全部</el-button></div></div>
      <el-table v-loading="loading" :data="pagedData" class="inventory-table" stripe height="calc(100% - 126px)" empty-text="暂无匹配的库存记录">
        <el-table-column prop="roomName" label="房间" min-width="110" />
        <el-table-column prop="name" label="物品名称" min-width="150" />
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column prop="quantity" label="数量" width="90" align="right" />
        <el-table-column prop="unitPrice" label="单价" width="110" align="right"><template #default="{ row }">{{ formatPrice(row.unitPrice) }}</template></el-table-column>
        <el-table-column label="总金额" width="120" align="right"><template #default="{ row }">{{ formatPrice(calculateTotal(row)) }}</template></el-table-column>
        <el-table-column prop="notes" label="备注" min-width="160" show-overflow-tooltip />
        <el-table-column prop="updateTime" label="更新时间" width="170" align="center"><template #default="{ row }">{{ row.updateTime || '暂无' }}</template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button text type="primary" size="small" @click="viewDetails(row)">详情</el-button></template></el-table-column>
      </el-table>
      <div class="pagination-row"><el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" :total="filteredData.length" layout="total, sizes, prev, pager, next" background /></div>
    </section>

    <el-dialog v-model="exportDialogVisible" title="导出设置" width="420px" class="search-dialog">
      <el-form label-position="top"><el-form-item label="文件名"><el-input v-model="exportFileName"><template #append>.xlsx</template></el-input></el-form-item><el-form-item label="导出范围"><el-radio-group v-model="exportRange"><el-radio label="current">当前结果</el-radio><el-radio label="all">全部数据</el-radio></el-radio-group></el-form-item><el-form-item label="包含字段"><el-checkbox-group v-model="exportFields"><el-checkbox v-for="field in exportFieldOptions" :key="field.value" :label="field.value">{{ field.label }}</el-checkbox></el-checkbox-group></el-form-item></el-form>
      <template #footer><el-button @click="exportDialogVisible = false">取消</el-button><el-button type="primary" @click="confirmExport">确认导出</el-button></template>
    </el-dialog>
    <el-dialog v-model="dialogVisible" title="物品详情" width="560px" class="search-dialog"><el-descriptions :column="2" border><el-descriptions-item v-for="(value, key) in currentItem" :key="key" :label="getLabel(key)">{{ formatDetailValue(key, value) }}</el-descriptions-item></el-descriptions></el-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Document, Files } from '@element-plus/icons-vue'
import axios from '@/store/SetAxios'
import * as XLSX from 'xlsx'

interface Item { [key: string]: any; name?: string; home?: string; roomName?: string; quantity?: number; unitPrice?: number; notes?: string; updateTime?: string }
const searchForm = reactive({ name: '', roomNumber: '', keyword: '' })
const allData = ref<Item[]>([]); const tableData = ref<Item[]>([]); const loading = ref(false)
const currentPage = ref(1); const pageSize = ref(10)
const exportDialogVisible = ref(false); const dialogVisible = ref(false); const currentItem = ref<Item>({})
const exportFileName = ref('库存物品'); const exportRange = ref('current'); const exportFields = ref(['roomName', 'name', 'unit', 'quantity', 'unitPrice', 'totalAmount', 'notes', 'updateTime'])
const exportFieldOptions = [{ value: 'roomName', label: '房间' }, { value: 'name', label: '物品名称' }, { value: 'unit', label: '单位' }, { value: 'quantity', label: '数量' }, { value: 'unitPrice', label: '单价' }, { value: 'totalAmount', label: '总金额' }, { value: 'notes', label: '备注' }, { value: 'updateTime', label: '更新时间' }]
const hasFilters = computed(() => Boolean(searchForm.name || searchForm.roomNumber || searchForm.keyword))
const filteredData = computed(() => tableData.value)
const pagedData = computed(() => filteredData.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
watch([() => searchForm.name, () => searchForm.roomNumber, () => searchForm.keyword], () => { currentPage.value = 1 })

const fetchItems = async () => { loading.value = true; try { const response = await axios.get('/inventory/items'); allData.value = Array.isArray(response.data) ? response.data : []; tableData.value = [...allData.value] } catch { ElMessage.error('库存数据加载失败，请稍后重试') } finally { loading.value = false } }
const onSearch = () => { const name = searchForm.name.toLowerCase(); const room = searchForm.roomNumber.toLowerCase(); const keyword = searchForm.keyword.toLowerCase(); tableData.value = allData.value.filter((item) => (!name || String(item.name || '').toLowerCase().includes(name)) && (!room || String(item.home || item.roomName || '').toLowerCase().includes(room)) && (!keyword || `${item.name || ''} ${item.notes || ''}`.toLowerCase().includes(keyword))); currentPage.value = 1 }
const resetSearch = () => { Object.assign(searchForm, { name: '', roomNumber: '', keyword: '' }); tableData.value = [...allData.value]; currentPage.value = 1 }
const calculateTotal = (row: Item) => Number(row.quantity || 0) * Number(row.unitPrice || 0)
const formatPrice = (price: any) => `¥${Number(price || 0).toFixed(2)}`
const viewDetails = (row: Item) => { currentItem.value = row; dialogVisible.value = true }
const getLabel = (key: string | number) => ({ roomName: '房间', home: '房间编号', name: '物品名称', unit: '单位', quantity: '数量', unitPrice: '单价', totalAmount: '总金额', notes: '备注', updateTime: '更新时间' }[String(key)] || String(key))
const formatDetailValue = (key: string | number, value: any) => String(key) === 'unitPrice' || String(key) === 'totalAmount' ? formatPrice(value) : value ?? '-'
const exportCurrentPage = () => { exportRange.value = 'current'; exportDialogVisible.value = true }; const exportAllData = () => { exportRange.value = 'all'; exportDialogVisible.value = true }
const confirmExport = () => { const source = exportRange.value === 'all' ? allData.value : tableData.value; const rows = source.map((item) => Object.fromEntries(exportFields.value.map((field) => [getLabel(String(field)), field === 'totalAmount' ? formatPrice(calculateTotal(item)) : field === 'unitPrice' ? formatPrice(item.unitPrice) : item[String(field)] ?? '-']))); const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), '库存物品'); XLSX.writeFile(workbook, `${exportFileName.value || '库存物品'}.xlsx`); exportDialogVisible.value = false; ElMessage.success(`已导出 ${rows.length} 条记录`) }
onMounted(fetchItems)
</script>

<style scoped>
.search-page { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 0; padding: 22px clamp(16px, 2.5vw, 36px); overflow: hidden; background: #252a2f; color: #edf3f8; }
.page-header, .filter-panel, .results-panel { box-sizing: border-box; width: min(1420px, 100%); margin: 0 auto; }
.page-header { margin-bottom: 18px; }.eyebrow { margin: 0 0 6px; color: #83c3ef; font-size: 12px; font-weight: 600; } h1 { margin: 0; font-size: 28px; font-weight: 600; }.page-header p:last-child { margin: 8px 0 0; color: #aebbc6; font-size: 14px; }
.filter-panel, .results-panel { border: 1px solid #414b55; border-radius: 8px; background: #30373e; }.filter-panel { margin-bottom: 14px; padding: 16px 18px 4px; }.filter-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; align-items: end; gap: 16px; }.filter-form :deep(.el-form-item) { min-width: 0; margin-bottom: 12px; }.filter-form :deep(.el-form-item__label) { padding-bottom: 6px; color: #c6d0d9; font-size: 12px; }.filter-form :deep(.el-input) { width: 100%; min-width: 0; }.filter-form :deep(.el-input__wrapper) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }.filter-form :deep(.el-input__inner) { color: #edf3f8; }.filter-actions { display: flex; flex-wrap: nowrap; gap: 8px; margin-bottom: 12px; }.filter-actions .el-button { margin: 0; white-space: nowrap; }
.results-panel { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow: hidden; }.results-header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #414b55; }.results-header h2 { margin: 0 0 4px; font-size: 16px; }.result-meta { color: #8e9ca8; font-size: 12px; }.result-actions { display: flex; gap: 6px; }.result-actions :deep(.el-button) { color: #9fb4c5; }.result-actions :deep(.el-button:hover) { color: #83c3ef; background: #3a444d; }.inventory-table { flex: 1; min-height: 0; --el-table-bg-color: #30373e; --el-table-tr-bg-color: #30373e; --el-table-row-hover-bg-color: #3a444d; --el-table-header-bg-color: #292f35; --el-table-border-color: #414b55; --el-table-text-color: #c6d0d9; --el-table-header-text-color: #aebbc6; }.inventory-table :deep(.el-table__inner-wrapper::before) { background: #414b55; }.inventory-table :deep(.el-table__body tr), .inventory-table :deep(.el-table__body tr.el-table__row--striped), .inventory-table :deep(.el-table__body tr.el-table__row--striped > td.el-table__cell) { background: #30373e !important; }.inventory-table :deep(.el-table__body tr:hover > td.el-table__cell) { background: #3a444d !important; }.inventory-table :deep(td.el-table__cell), .inventory-table :deep(th.el-table__cell) { border-bottom-color: #414b55; }.pagination-row { flex: 0 0 auto; display: flex; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid #414b55; }.pagination-row :deep(.el-pagination) { --el-pagination-bg-color: #252a2f; --el-pagination-text-color: #aebbc6; --el-pagination-button-color: #c6d0d9; --el-pagination-button-bg-color: #252a2f; --el-pagination-hover-color: #83c3ef; }.pagination-row :deep(.el-pagination .el-select__wrapper), .pagination-row :deep(.el-pagination .el-input__wrapper) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }.pagination-row :deep(.el-pagination button), .pagination-row :deep(.el-pagination .el-pager li) { color: #aebbc6; background: #252a2f; }.pagination-row :deep(.el-pagination .el-pager li.is-active) { color: #fff; background: #1f4058; }.search-dialog :deep(.el-dialog) { background: #30373e; border: 1px solid #4a5661; }.search-dialog :deep(.el-dialog__title), .search-dialog :deep(.el-form-item__label), .search-dialog :deep(.el-descriptions__label) { color: #edf3f8; }.search-dialog :deep(.el-dialog__body), .search-dialog :deep(.el-descriptions__content) { color: #c6d0d9; }.search-dialog :deep(.el-dialog__footer) { border-top: 1px solid #414b55; }.search-dialog :deep(.el-input__wrapper) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }.search-dialog :deep(.el-checkbox) { color: #c6d0d9; margin-right: 14px; }.search-dialog :global(.el-dialog__headerbtn .el-dialog__close) { color: #aebbc6; }
:global(.search-dialog.el-dialog) { --el-dialog-bg-color: #30373e; background: #30373e !important; border: 1px solid #4a5661 !important; }.search-dialog :deep(.el-descriptions) { --el-descriptions-table-border: #4a5661; }.search-dialog :deep(.el-descriptions__cell) { background: #30373e !important; border-color: #4a5661 !important; }.search-dialog :deep(.el-descriptions__label) { background: #292f35 !important; }
@media (max-width: 1050px) { .filter-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }.filter-actions { grid-column: 1 / -1; } }
@media (max-width: 800px) { .search-page { padding: 16px 12px; overflow: auto; }.filter-form { grid-template-columns: 1fr; gap: 4px; }.filter-form :deep(.el-form-item) { width: 100%; }.filter-actions { grid-column: auto; width: 100%; }.filter-actions .el-button { flex: 1; }.results-panel { height: 600px; }.result-actions { display: none; } }
/* Keep the table loading state consistent with the dark workspace theme. */
.inventory-table :deep(.el-loading-mask) { background: rgba(37, 42, 47, 0.88); }
.inventory-table :deep(.el-loading-spinner .circular) { stroke: #83c3ef; }
.inventory-table :deep(.el-loading-spinner .el-loading-text) { color: #aebbc6; }
</style>
