<template>
  <section class="operation-form inbound-component">
    <div class="form-heading">
      <div>
        <h2>入库登记</h2>
        <p>填写物资与存放位置，确认后更新库存。</p>
      </div>
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
  </section>
</template>

<script lang="ts" setup>
import { useInboundStore } from '@/store/warehouse/inboundStore'
import { storeToRefs } from 'pinia'

const inboundStore = useInboundStore()
const { form, rooms, submitting } = storeToRefs(inboundStore)
const { onSubmit, onReset } = inboundStore
</script>

<style scoped>
.operation-form { max-width: 960px; margin: 0 auto; }
.form-heading { margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #414b55; }
h2 { margin: 0; color: #edf3f8; font-size: 20px; font-weight: 600; }
.form-heading p { margin: 7px 0 0; color: #aebbc6; font-size: 13px; }
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
@media (max-width: 768px) { .form-actions { justify-content: stretch; } .form-actions .el-button { flex: 1; } }
</style>
