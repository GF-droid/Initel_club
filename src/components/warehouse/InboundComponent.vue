<template>
  <section class="operation-form inbound-component">
    <div class="form-heading">
      <div>
        <h2>入库登记</h2>
        <p>填写物资与存放位置，确认后更新库存；也可用 Excel 批量导入。</p>
      </div>
      <el-button class="import-trigger" :icon="UploadFilled" @click="openImportDialog">Excel 快速入库</el-button>
    </div>

    <el-form :model="form" label-position="top" class="inventory-form">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12">
          <el-form-item label="房间编号">
            <el-select v-model="form.home" filterable allow-create default-first-option placeholder="选择或输入房间编号" popper-class="warehouse-select-popper">
              <el-option v-for="room in rooms" :key="room.value" :label="room.label" :value="room.value" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12"><el-form-item label="物品名称"><el-input v-model="form.name" placeholder="输入物品名称" /></el-form-item></el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :xs="24" :sm="8"><el-form-item label="数量"><el-input-number v-model="form.number" :min="1" controls-position="right" /></el-form-item></el-col>
        <el-col :xs="24" :sm="8"><el-form-item label="单价"><el-input-number v-model="form.price" :min="0" :precision="2" controls-position="right" /></el-form-item></el-col>
        <el-col :xs="24" :sm="8"><el-form-item label="单位"><el-input v-model="form.unity" placeholder="例如：件、箱、瓶" /></el-form-item></el-col>
      </el-row>
      <el-form-item label="备注"><el-input v-model="form.content" type="textarea" :rows="3" placeholder="填写补充说明（选填）" resize="none" /></el-form-item>
      <div class="form-actions">
        <el-button type="primary" @click="onSubmit" :loading="submitting">确认入库</el-button>
        <el-button @click="onReset">重置</el-button>
      </div>
    </el-form>

    <el-dialog
      v-model="importVisible"
      title="Excel 批量入库"
      width="900px"
      class="inbound-import-dialog"
      :close-on-click-modal="false"
      @closed="closeImportDialog"
    >
      <div class="import-toolbar">
        <div class="import-toolbar__actions">
          <el-upload ref="uploadRef" :auto-upload="false" :show-file-list="false" accept=".xlsx,.xls" :on-change="onFileChange">
            <el-button type="primary" :icon="UploadFilled" :loading="parsing">选择 Excel 文件</el-button>
          </el-upload>
          <el-button :icon="Download" @click="downloadTemplate">下载模板</el-button>
        </div>
        <p class="import-hint">
          第一行必须是表头，支持列：房间编号、物品名称、数量、单价、单位、备注。房间编号留空时，使用表单中已选的房间。
        </p>
      </div>

      <el-alert v-if="importError" :title="importError" type="warning" show-icon :closable="false" class="import-alert" />

      <template v-if="importRows.length">
        <div class="import-summary">
          <span class="import-file">{{ importFileName }}</span>
          <span>共 {{ importRows.length }} 行</span>
          <span class="import-count--ok">可入库 {{ validImportRows.length }} 行</span>
          <span v-if="invalidImportRows.length" class="import-count--bad">异常 {{ invalidImportRows.length }} 行</span>
        </div>

        <el-table :data="importRows" class="import-table" max-height="340" size="small" :row-class-name="rowClassName">
          <el-table-column prop="index" label="行号" width="64" align="center" />
          <el-table-column prop="home" label="房间" width="76" />
          <el-table-column prop="name" label="物品名称" min-width="130" show-overflow-tooltip />
          <el-table-column label="数量" width="78" align="right">
            <template #default="{ row }">{{ row.number ?? '-' }}</template>
          </el-table-column>
          <el-table-column label="单价" width="88" align="right">
            <template #default="{ row }">{{ row.price }}</template>
          </el-table-column>
          <el-table-column prop="unity" label="单位" width="68" show-overflow-tooltip />
          <el-table-column prop="content" label="备注" min-width="110" show-overflow-tooltip />
          <el-table-column label="校验" min-width="180">
            <template #default="{ row }">
              <span v-if="!row.errors.length" class="row-ok">通过</span>
              <span v-else class="row-bad">{{ row.errors.join('；') }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" align="center">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click="removeImportRow(row.index)">移除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>

      <el-empty v-else-if="!importError" description="尚未选择文件，可先下载模板按格式填写" :image-size="70" />

      <template #footer>
        <el-button @click="closeImportDialog">取消</el-button>
        <el-button type="primary" :loading="importing" :disabled="!validImportRows.length" @click="submitImport">
          {{ validImportRows.length ? `确认导入 ${validImportRows.length} 条` : '确认导入' }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Download, UploadFilled } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import { useInboundStore } from '@/store/warehouse/inboundStore'
import type { ImportRow } from '@/store/warehouse/inboundStore'

const inboundStore = useInboundStore()
const {
  form, rooms, submitting,
  importVisible, importFileName, importRows, importError, parsing, importing,
  validImportRows, invalidImportRows
} = storeToRefs(inboundStore)
const {
  onSubmit, onReset, openImportDialog, closeImportDialog,
  parseImportFile, downloadTemplate, removeImportRow, submitImport
} = inboundStore

const uploadRef = ref<UploadInstance>()

const onFileChange = (uploadFile: UploadFile) => {
  void parseImportFile(uploadFile.raw)
  // Let the user re-select the same file after fixing a parse error.
  uploadRef.value?.clearFiles()
}

const rowClassName = ({ row }: { row: ImportRow }) => (row.errors.length ? 'import-row--invalid' : '')
</script>

<style scoped>
.operation-form { max-width: 960px; margin: 0 auto; }
.form-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #414b55; }
h2 { margin: 0; color: #edf3f8; font-size: 20px; font-weight: 600; }
.form-heading p { margin: 7px 0 0; color: #aebbc6; font-size: 13px; }
.import-trigger { flex: 0 0 auto; }
.inventory-form :deep(.el-form-item) { margin-bottom: 20px; }
.inventory-form :deep(.el-form-item__label) { padding-bottom: 7px; color: #c6d0d9; font-size: 13px; line-height: 1.2; }
.inventory-form :deep(.el-input), .inventory-form :deep(.el-select), .inventory-form :deep(.el-input-number) { width: 100%; }
.inventory-form :deep(.el-input__wrapper), .inventory-form :deep(.el-textarea__inner) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }
.inventory-form :deep(.el-select__wrapper) { background: #252a2f; box-shadow: 0 0 0 1px #4a5661 inset; }
.inventory-form :deep(.el-input__inner), .inventory-form :deep(.el-textarea__inner) { color: #edf3f8; }
.inventory-form :deep(.el-select__selected-item), .inventory-form :deep(.el-select__placeholder) { color: #edf3f8; }
.inventory-form :deep(.el-input__wrapper.is-focus), .inventory-form :deep(.el-textarea__inner:focus) { box-shadow: 0 0 0 1px #409eff inset; }
.inventory-form :deep(.el-select__wrapper.is-focused) { box-shadow: 0 0 0 1px #409eff inset; }
.inventory-form :deep(.el-input-number__increase), .inventory-form :deep(.el-input-number__decrease) { background: #3a444d; color: #c6d0d9; border-left-color: #4a5661; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #414b55; }
.form-actions .el-button { min-width: 92px; }
:global(.warehouse-select-popper) { --el-bg-color-overlay: #30373e; --el-border-color-light: #4a5661; border: 1px solid #4a5661 !important; background: #30373e !important; }
:global(.warehouse-select-popper .el-select-dropdown__wrap) { background: #30373e; }
:global(.warehouse-select-popper .el-select-dropdown__item) { color: #c6d0d9; }
:global(.warehouse-select-popper .el-select-dropdown__item:hover), :global(.warehouse-select-popper .el-select-dropdown__item.is-hovering) { background: #3a444d; }
:global(.warehouse-select-popper .el-select-dropdown__item.is-selected) { color: #78b8eb; font-weight: 600; }
:global(.warehouse-select-popper .el-popper__arrow::before) { background: #30373e !important; border-color: #4a5661 !important; }

/* 导入弹窗：el-dialog 会被传送到 body，因此必须用 :global 覆盖暗色主题 */
:global(.inbound-import-dialog.el-dialog) { --el-dialog-bg-color: #30373e; background: #30373e !important; border: 1px solid #4a5661 !important; }
:global(.inbound-import-dialog .el-dialog__title) { color: #edf3f8; }
:global(.inbound-import-dialog .el-dialog__header), :global(.inbound-import-dialog .el-dialog__footer) { border-color: #414b55; }
:global(.inbound-import-dialog .el-dialog__body) { color: #c6d0d9; }
:global(.inbound-import-dialog .el-alert--warning) { background: #3a3320; }
:global(.inbound-import-dialog .el-alert__title) { color: #e8c98a; }
:global(.inbound-import-dialog .el-empty__description p) { color: #8e9ca8; }
.import-toolbar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.import-toolbar__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.import-toolbar__actions :deep(.el-upload) { display: inline-block; }
.import-hint { margin: 0; color: #8e9ca8; font-size: 12px; line-height: 1.7; }
.import-alert { margin-bottom: 12px; }
.import-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-bottom: 10px; color: #aebbc6; font-size: 12px; }
.import-file { color: #83c3ef; }
.import-count--ok { color: #67c23a; }
.import-count--bad { color: #f0a0a0; }
.import-table { --el-table-bg-color: #30373e; --el-table-tr-bg-color: #30373e; --el-table-row-hover-bg-color: #3a444d; --el-table-header-bg-color: #292f35; --el-table-border-color: #414b55; --el-table-text-color: #c6d0d9; --el-table-header-text-color: #aebbc6; }
.import-table :deep(.el-table__body tr), .import-table :deep(.el-table__body tr.el-table__row--striped), .import-table :deep(.el-table__body tr.el-table__row--striped > td.el-table__cell), .import-table :deep(.el-table__body td.el-table__cell) { background: #30373e !important; }
.import-table :deep(.el-table__body tr:hover > td.el-table__cell) { background: #3a444d !important; }
.import-table :deep(.import-row--invalid > td.el-table__cell) { background: #3a2f33 !important; }
.row-ok { color: #67c23a; }
.row-bad { color: #f0a0a0; }
@media (max-width: 960px) { :global(.inbound-import-dialog.el-dialog) { width: calc(100vw - 24px) !important; } }
@media (max-width: 768px) { .form-heading { flex-direction: column; } .form-actions { justify-content: stretch; } .form-actions .el-button { flex: 1; } }
</style>
