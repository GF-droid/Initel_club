<template>
  <main class="sku-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">ITEM MASTER DATA</p>
        <h1>物资档案</h1>
        <p>统一的物资主数据。出入库时按名称自动匹配，缺失则自动建档。</p>
      </div>
      <div class="header-actions">
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <el-button :icon="Connection" :loading="syncing" @click="onSync">同步库存物资</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建物资</el-button>
      </div>
    </header>

    <section class="filter-panel">
      <el-form label-position="top" class="filter-form" @submit.prevent="onSearch">
        <el-form-item label="关键词">
          <el-input v-model="keyword" placeholder="名称 / 编码 / 条码 / 规格" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="category" placeholder="精确匹配分类" clearable @keyup.enter="onSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="includeInactive" active-text="含已停用" inline-prompt @change="onSearch" />
        </el-form-item>
        <div class="filter-actions">
          <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="resetFilters">重置</el-button>
        </div>
      </el-form>
    </section>

    <section class="results-panel">
      <div class="results-header">
        <div>
          <h2>物资列表</h2>
          <span class="result-meta">共 {{ total }} 个物资</span>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="rows"
        class="sku-table"
        stripe
        height="calc(100% - 126px)"
        empty-text="还没有物资档案，点右上角「新建物资」或「同步库存物资」"
      >
        <el-table-column prop="skuCode" label="物资编码" width="126">
          <template #default="{ row }">{{ row.skuCode || '-' }}</template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
        <el-table-column prop="spec" label="规格" min-width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row.spec || '-' }}</template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="110" show-overflow-tooltip>
          <template #default="{ row }">{{ row.category || '-' }}</template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="74" align="center">
          <template #default="{ row }">{{ row.unit || '-' }}</template>
        </el-table-column>
        <el-table-column prop="barcode" label="条码" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.barcode || '-' }}</template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">{{ row.supplier || '-' }}</template>
        </el-table-column>
        <el-table-column prop="safetyStock" label="安全库存" width="96" align="right" />
        <el-table-column prop="price" label="参考单价" width="100" align="right" />
        <el-table-column label="状态" width="86" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" effect="dark" size="small">
              {{ row.status === 1 ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right" align="center">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="editRow(row)">编辑</el-button>
            <el-button v-if="row.status === 1" text type="danger" size="small" @click="removeRow(row)">停用</el-button>
          </template>
        </el-table-column>
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

    <el-dialog
      v-model="dialogVisible"
      :title="editingCode ? `编辑物资 ${editingCode}` : '新建物资'"
      width="720px"
      class="sku-dialog"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-position="top" class="sku-form">
        <el-row :gutter="18">
          <el-col :xs="24" :sm="14">
            <el-form-item label="物资名称" required>
              <el-input v-model="form.name" placeholder="例如：打印纸" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="10">
            <el-form-item label="规格型号">
              <el-input v-model="form.spec" placeholder="例如：A4 80g（无规格留空）" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="18">
          <el-col :xs="24" :sm="8"><el-form-item label="分类"><el-input v-model="form.category" placeholder="例如：办公用品" /></el-form-item></el-col>
          <el-col :xs="24" :sm="8"><el-form-item label="计量单位"><el-input v-model="form.unit" placeholder="例如：箱" /></el-form-item></el-col>
          <el-col :xs="24" :sm="8"><el-form-item label="条码"><el-input v-model="form.barcode" placeholder="选填" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="18">
          <el-col :xs="24" :sm="8"><el-form-item label="供应商"><el-input v-model="form.supplier" placeholder="选填" /></el-form-item></el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="安全库存下限">
              <el-input-number v-model="form.safetyStock" :min="0" controls-position="right" />
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="8">
            <el-form-item label="参考单价">
              <el-input-number v-model="form.price" :min="0" :precision="2" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="2" resize="none" placeholder="选填" /></el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessageBox } from 'element-plus'
import { Connection, Plus, Refresh, RefreshLeft, Search } from '@element-plus/icons-vue'
import { useSkuStore } from '@/store/skuStore'
import type { Sku } from '@/store/skuStore'

const skuStore = useSkuStore()
const { rows, total, loading, saving, syncing, keyword, category, includeInactive, page, pageSize, dialogVisible, editingCode, form } =
  storeToRefs(skuStore)
const { load, onSearch, onSizeChange, resetFilters, openCreate, openEdit, submit, deactivate, syncFromInventory } = skuStore

// el-table 的行插槽给出的是宽松的 DefaultRow，这里显式收回到 Sku
const editRow = (row: unknown) => openEdit(row as Sku)
const removeRow = (row: unknown) => void deactivate(row as Sku)

const onSync = async () => {
  try {
    await ElMessageBox.confirm(
      '将扫描各房间的库存表，把出现过的物资批量录入主数据，并回填库存行的物资编码。该操作可重复执行，不会修改库存数量。',
      '同步库存物资',
      { confirmButtonText: '开始同步', cancelButtonText: '取消', type: 'info' },
    )
  } catch {
    return
  }
  await syncFromInventory()
}

onMounted(load)
</script>

<style scoped>
.sku-page {
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
.header-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.header-actions :deep(.el-button:not(.el-button--primary)) { border-color: #4a5661; background: #30373e; color: #aebbc6; }
.header-actions :deep(.el-button:not(.el-button--primary):hover) { border-color: #659bc2; color: #edf3f8; }

.filter-panel, .results-panel { border: 1px solid #414b55; border-radius: 8px; background: #30373e; }
.filter-panel { flex: 0 0 auto; margin-bottom: 14px; padding: 16px 18px 4px; }
.filter-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) auto auto; align-items: end; gap: 16px; }
.filter-form :deep(.el-form-item) { min-width: 0; margin-bottom: 12px; }
.filter-form :deep(.el-form-item__label) { padding-bottom: 6px; color: #c6d0d9; font-size: 12px; }
.filter-form :deep(.el-input) { width: 100%; min-width: 0; }
.filter-form :deep(.el-input__wrapper) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }
.filter-form :deep(.el-input__inner) { color: #edf3f8; }
.filter-form :deep(.el-switch) { height: 32px; --el-switch-on-color: #409eff; }
.filter-form :deep(.el-switch__label) { color: #aebbc6; font-size: 12px; }
.filter-actions { display: flex; flex-wrap: nowrap; gap: 8px; margin-bottom: 12px; }
.filter-actions .el-button { margin: 0; white-space: nowrap; }

.results-panel { display: flex; flex: 1 1 auto; flex-direction: column; min-height: 0; overflow: hidden; }
.results-header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #414b55; }
.results-header h2 { margin: 0 0 4px; font-size: 16px; }
.result-meta { color: #8e9ca8; font-size: 12px; }

.sku-table {
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
.sku-table :deep(.el-table__inner-wrapper::before) { background: #414b55; }
.sku-table :deep(.el-table__body tr),
.sku-table :deep(.el-table__body tr.el-table__row--striped),
.sku-table :deep(.el-table__body tr.el-table__row--striped > td.el-table__cell) { background: #30373e !important; }
.sku-table :deep(.el-table__body tr:hover > td.el-table__cell) { background: #3a444d !important; }
.sku-table :deep(td.el-table__cell), .sku-table :deep(th.el-table__cell) { border-bottom-color: #414b55; }
.sku-table :deep(.el-loading-mask) { background: rgba(37, 42, 47, 0.88); }
.sku-table :deep(.el-loading-spinner .circular) { stroke: #83c3ef; }

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

/* 弹窗被传送到 body，必须用 :global 覆盖暗色主题 */
:global(.sku-dialog.el-dialog) { --el-dialog-bg-color: #30373e; background: #30373e !important; border: 1px solid #4a5661 !important; }
:global(.sku-dialog .el-dialog__title) { color: #edf3f8; }
:global(.sku-dialog .el-dialog__header), :global(.sku-dialog .el-dialog__footer) { border-color: #414b55; }
.sku-form :deep(.el-form-item) { margin-bottom: 16px; }
.sku-form :deep(.el-form-item__label) { padding-bottom: 6px; color: #c6d0d9; font-size: 12px; }
.sku-form :deep(.el-input), .sku-form :deep(.el-input-number), .sku-form :deep(.el-textarea) { width: 100%; }
.sku-form :deep(.el-input__wrapper), .sku-form :deep(.el-textarea__inner) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }
.sku-form :deep(.el-input__inner), .sku-form :deep(.el-textarea__inner) { color: #edf3f8; }
.sku-form :deep(.el-input-number__increase), .sku-form :deep(.el-input-number__decrease) { background: #3a444d; color: #c6d0d9; border-left-color: #4a5661; }

@media (max-width: 1100px) { .filter-form { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filter-actions { grid-column: 1 / -1; } }
@media (max-width: 820px) {
  .sku-page { padding: 16px 12px; overflow: auto; }
  .page-header { flex-direction: column; }
  .filter-form { grid-template-columns: 1fr; gap: 4px; }
  .filter-actions { grid-column: auto; width: 100%; }
  .filter-actions .el-button { flex: 1; }
  .results-panel { height: 620px; }
}
@media (max-width: 600px) {
  h1 { font-size: 24px; }
  .pagination-row { justify-content: center; padding: 10px 6px; overflow-x: auto; }
  .pagination-row :deep(.el-pagination) { white-space: nowrap; }
  .pagination-row :deep(.el-pagination .el-pagination__sizes) { display: none; }
  :global(.sku-dialog.el-dialog) { width: calc(100vw - 24px) !important; max-width: 720px; margin-top: 6vh !important; }
  :global(.sku-dialog .el-dialog__body) { max-height: 70vh; overflow-y: auto; }
}
</style>
