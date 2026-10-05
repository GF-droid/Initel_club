<template>
  <main class="ledger-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">INVENTORY LEDGER</p>
        <h1>库存流水</h1>
        <p>只追加的出入库台账，可追溯到每一笔变动的操作人与变动前后余量。</p>
      </div>
      <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
    </header>

    <section class="filter-panel">
      <el-form :model="filters" label-position="top" class="filter-form" @submit.prevent="onSearch">
        <el-form-item label="房间">
          <el-select v-model="filters.roomId" clearable placeholder="全部房间" popper-class="ledger-select-popper">
            <el-option v-for="room in rooms" :key="room.value" :label="room.label" :value="room.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="变动类型">
          <el-select v-model="filters.operation" clearable placeholder="全部类型" popper-class="ledger-select-popper">
            <el-option label="入库" value="inbound" />
            <el-option label="出库" value="outbound" />
            <el-option label="调整" value="adjust" />
          </el-select>
        </el-form-item>
        <el-form-item label="物资名称">
          <el-input v-model="filters.keyword" placeholder="名称关键词" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="物资编码">
          <el-input v-model="filters.skuCode" placeholder="如 SKU-000001" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="时间范围" class="filter-range">
          <el-date-picker
            v-model="timeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            :default-time="defaultTime"
          />
        </el-form-item>
        <div class="filter-actions">
          <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="resetFilters">重置</el-button>
          <el-button :icon="Download" :disabled="!rows.length" @click="exportRows">导出</el-button>
        </div>
      </el-form>
    </section>

    <section class="results-panel">
      <div class="results-header">
        <div>
          <h2>流水记录</h2>
          <span class="result-meta">共 {{ total }} 条<span v-if="hasFilters"> · 已应用筛选</span></span>
        </div>
        <span class="result-meta">按时间倒序</span>
      </div>

      <el-table
        v-loading="loading"
        :data="rows"
        class="ledger-table"
        stripe
        height="calc(100% - 126px)"
        empty-text="暂无流水记录"
      >
        <el-table-column prop="createdAt" label="时间" width="168" />
        <el-table-column prop="orderNo" label="单据号" width="188" show-overflow-tooltip>
          <template #default="{ row }">{{ row.orderNo || '-' }}</template>
        </el-table-column>
        <el-table-column prop="roomId" label="房间" width="74" align="center" />
        <el-table-column prop="skuCode" label="物资编码" width="124">
          <template #default="{ row }">{{ row.skuCode || '-' }}</template>
        </el-table-column>
        <el-table-column prop="skuName" label="物资名称" min-width="140" show-overflow-tooltip />
        <el-table-column label="类型" width="82" align="center">
          <template #default="{ row }">
            <el-tag :type="operationTagType(row.operation)" effect="dark" size="small">
              {{ operationLabel(row.operation) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变动" width="92" align="right">
          <template #default="{ row }">
            <span :class="row.operation === 'outbound' ? 'qty-out' : 'qty-in'">
              {{ row.operation === 'outbound' ? '-' : '+' }}{{ row.quantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="quantityBefore" label="变动前" width="88" align="right" />
        <el-table-column prop="quantityAfter" label="变动后" width="88" align="right" />
        <el-table-column label="单价" width="88" align="right">
          <template #default="{ row }">{{ row.unitPrice === null ? '-' : row.unitPrice }}</template>
        </el-table-column>
        <el-table-column label="金额" width="98" align="right">
          <template #default="{ row }">{{ row.amount === null ? '-' : row.amount }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="88">
          <template #default="{ row }">{{ row.operator || '-' }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="140" show-overflow-tooltip />
      </el-table>

      <div class="pagination-row">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="onSizeChange"
        />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Refresh, RefreshLeft, Search } from '@element-plus/icons-vue'
import axios from '@/store/SetAxios'
import * as XLSX from 'xlsx'

interface LedgerRow {
  id: number
  roomId: string
  skuCode: string | null
  skuName: string
  operation: string
  quantity: number
  quantityBefore: number
  quantityAfter: number
  unitPrice: number | null
  amount: number | null
  orderNo: string | null
  operator: string | null
  remark: string | null
  createdAt: string
}

const rooms = [
  { value: '101', label: '101 房间' }, { value: '102', label: '102 房间' },
  { value: '108', label: '108 房间' }, { value: '109', label: '109 房间' },
  { value: '113', label: '113 房间' }, { value: '115', label: '115 房间' },
  { value: '116', label: '116 房间' }, { value: '117', label: '117 房间' },
  { value: '118', label: '118 房间' }, { value: '119', label: '119 房间' },
]

const rows = ref<LedgerRow[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const timeRange = ref<[string, string] | null>(null)
const filters = reactive({ roomId: '', operation: '', keyword: '', skuCode: '' })
const defaultTime: [Date, Date] = [new Date(2000, 0, 1, 0, 0, 0), new Date(2000, 0, 1, 23, 59, 59)]

const hasFilters = computed(
  () => Boolean(filters.roomId || filters.operation || filters.keyword.trim() || filters.skuCode.trim() || timeRange.value),
)

const serverMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (Array.isArray(message)) return message.join('；')
  if (typeof message === 'string' && message) return message
  return fallback
}

const load = async () => {
  loading.value = true
  try {
    const [startTime, endTime] = timeRange.value ?? []
    const response = await axios.get<{ success: boolean; data: LedgerRow[]; total: number }>('/inventory/ledger', {
      params: {
        ...(filters.roomId ? { roomId: filters.roomId } : {}),
        ...(filters.operation ? { operation: filters.operation } : {}),
        ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
        ...(filters.skuCode.trim() ? { skuCode: filters.skuCode.trim() } : {}),
        // 后端要求 startTime / endTime 成对出现，所以两个都有才带上
        ...(startTime && endTime ? { startTime, endTime } : {}),
        limit: pageSize.value,
        offset: (page.value - 1) * pageSize.value,
      },
    })
    rows.value = Array.isArray(response.data?.data) ? response.data.data : []
    total.value = Number(response.data?.total ?? 0)
  } catch (error: unknown) {
    rows.value = []
    total.value = 0
    ElMessage.error(serverMessage(error, '流水加载失败'))
  } finally {
    loading.value = false
  }
}

const onSearch = () => {
  page.value = 1
  void load()
}

const onSizeChange = () => {
  page.value = 1
  void load()
}

const resetFilters = () => {
  filters.roomId = ''
  filters.operation = ''
  filters.keyword = ''
  filters.skuCode = ''
  timeRange.value = null
  onSearch()
}

const operationLabel = (operation: string) =>
  ({ inbound: '入库', outbound: '出库', adjust: '调整' } as Record<string, string>)[operation] ?? operation

const operationTagType = (operation: string) =>
  operation === 'outbound' ? 'danger' : operation === 'adjust' ? 'warning' : 'success'

const exportRows = () => {
  const data = rows.value.map((row) => ({
    时间: row.createdAt,
    单据号: row.orderNo ?? '',
    房间: row.roomId,
    物资编码: row.skuCode ?? '',
    物资名称: row.skuName,
    类型: operationLabel(row.operation),
    变动: row.quantity,
    变动前: row.quantityBefore,
    变动后: row.quantityAfter,
    单价: row.unitPrice ?? '',
    金额: row.amount ?? '',
    操作人: row.operator ?? '',
    备注: row.remark ?? '',
  }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), '库存流水')
  XLSX.writeFile(workbook, `库存流水_${new Date().toISOString().slice(0, 10)}.xlsx`)
  ElMessage.success(`已导出当前页 ${data.length} 条`)
}

onMounted(load)
</script>

<style scoped>
.ledger-page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 22px clamp(16px, 2.5vw, 36px);
  overflow: hidden;
  background: #252a2f;
  color: #edf3f8;
}

.page-header, .filter-panel, .results-panel { width: min(1420px, 100%); margin-left: auto; margin-right: auto; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.eyebrow { margin: 0 0 6px; color: #83c3ef; font-size: 12px; font-weight: 600; }
h1 { margin: 0; font-size: 28px; font-weight: 600; }
.page-header p:last-child { margin: 8px 0 0; color: #aebbc6; font-size: 14px; }
.page-header :deep(.el-button) { border-color: #4a5661; background: #30373e; color: #aebbc6; }
.page-header :deep(.el-button:hover) { border-color: #659bc2; color: #edf3f8; }

.filter-panel, .results-panel { border: 1px solid #414b55; border-radius: 8px; background: #30373e; }
.filter-panel { flex: 0 0 auto; margin-bottom: 14px; padding: 16px 18px 4px; }
.filter-form { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: end; gap: 16px; }
.filter-form :deep(.el-form-item) { min-width: 0; margin-bottom: 12px; }
.filter-form :deep(.el-form-item__label) { padding-bottom: 6px; color: #c6d0d9; font-size: 12px; }
.filter-form :deep(.el-input), .filter-form :deep(.el-select), .filter-form :deep(.el-date-editor) { width: 100%; min-width: 0; }
.filter-form :deep(.el-input__wrapper), .filter-form :deep(.el-select__wrapper) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }
.filter-form :deep(.el-input__inner), .filter-form :deep(.el-select__selected-item) { color: #edf3f8; }
.filter-form :deep(.el-range-input) { color: #edf3f8; }
.filter-form :deep(.el-range-separator) { color: #8e9ca8; }
.filter-range { grid-column: span 2; }
.filter-actions { display: flex; flex-wrap: nowrap; gap: 8px; margin-bottom: 12px; }
.filter-actions .el-button { margin: 0; white-space: nowrap; }

.results-panel { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow: hidden; }
.results-header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #414b55; }
.results-header h2 { margin: 0 0 4px; font-size: 16px; }
.result-meta { color: #8e9ca8; font-size: 12px; }

.ledger-table {
  flex: 1;
  min-height: 0;
  --el-table-bg-color: #30373e;
  --el-table-tr-bg-color: #30373e;
  --el-table-row-hover-bg-color: #3a444d;
  --el-table-header-bg-color: #292f35;
  --el-table-border-color: #414b55;
  --el-table-text-color: #c6d0d9;
  --el-table-header-text-color: #aebbc6;
}
.ledger-table :deep(.el-table__inner-wrapper::before) { background: #414b55; }
.ledger-table :deep(.el-table__body tr),
.ledger-table :deep(.el-table__body tr.el-table__row--striped),
.ledger-table :deep(.el-table__body tr.el-table__row--striped > td.el-table__cell) { background: #30373e !important; }
.ledger-table :deep(.el-table__body tr:hover > td.el-table__cell) { background: #3a444d !important; }
.ledger-table :deep(td.el-table__cell), .ledger-table :deep(th.el-table__cell) { border-bottom-color: #414b55; }
.ledger-table :deep(.el-loading-mask) { background: rgba(37, 42, 47, 0.88); }
.ledger-table :deep(.el-loading-spinner .circular) { stroke: #83c3ef; }
.ledger-table :deep(.el-loading-spinner .el-loading-text) { color: #aebbc6; }

.qty-in { color: #67c23a; font-weight: 600; }
.qty-out { color: #f0a0a0; font-weight: 600; }

.pagination-row { flex: 0 0 auto; display: flex; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid #414b55; background: #292f35; border-radius: 0 0 8px 8px; }
.pagination-row :deep(.el-pagination) {
  --el-pagination-bg-color: #252a2f;
  --el-pagination-text-color: #aebbc6;
  --el-pagination-button-color: #c6d0d9;
  --el-pagination-button-bg-color: #252a2f;
  --el-pagination-hover-color: #83c3ef;
}
.pagination-row :deep(.el-pagination .el-select__wrapper),
.pagination-row :deep(.el-pagination .el-input__wrapper) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }
.pagination-row :deep(.el-pagination button), .pagination-row :deep(.el-pagination .el-pager li) { color: #aebbc6; background: #252a2f; }
.pagination-row :deep(.el-pagination .el-pager li.is-active) { color: #fff; background: #1f4058; }

/* 下拉与日期弹层挂在 body 上，必须用 :global 覆盖暗色主题 */
:global(.ledger-select-popper) { border: 1px solid #4a5661 !important; background: #30373e !important; }
:global(.ledger-select-popper .el-select-dropdown__item) { color: #c6d0d9; }
:global(.ledger-select-popper .el-select-dropdown__item.is-hovering) { background: #3a444d; }
:global(.ledger-select-popper .el-select-dropdown__item.is-selected) { color: #78b8eb; font-weight: 600; }
:global(.ledger-select-popper .el-popper__arrow::before) { background: #30373e !important; border-color: #4a5661 !important; }

@media (max-width: 1180px) { .filter-form { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 900px) {
  .ledger-page { padding: 16px 12px; overflow: auto; }
  .filter-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .filter-range { grid-column: 1 / -1; }
  .results-panel { height: 620px; }
}
@media (max-width: 600px) {
  h1 { font-size: 24px; }
  .filter-form { grid-template-columns: 1fr; gap: 4px; }
  .filter-range { grid-column: auto; }
  .filter-actions { width: 100%; }
  .filter-actions .el-button { flex: 1; }
  .pagination-row { justify-content: center; padding: 10px 6px; overflow-x: auto; }
  .pagination-row :deep(.el-pagination) { white-space: nowrap; }
  .pagination-row :deep(.el-pagination .el-pagination__sizes) { display: none; }
}
</style>
