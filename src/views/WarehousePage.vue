<template>
  <main class="warehouse-management">
    <header class="page-header">
      <div>
        <p class="eyebrow">INVENTORY OPERATIONS</p>
        <h1>出入库管理</h1>
        <p class="page-description">登记物资入库、办理领用出库，并保持各房间库存数据同步。</p>
      </div>
    </header>

    <section class="workspace" aria-label="出入库操作">
      <el-tabs v-model="activeTab" class="warehouse-tabs">
        <el-tab-pane name="inbound">
          <template #label>
            <span class="tab-label"><el-icon><CirclePlus /></el-icon>入库登记</span>
          </template>
          <InboundComponent v-if="activeTab === 'inbound'" />
        </el-tab-pane>
        <el-tab-pane name="outbound">
          <template #label>
            <span class="tab-label"><el-icon><Remove /></el-icon>出库登记</span>
          </template>
          <OutboundComponent v-if="activeTab === 'outbound'" />
        </el-tab-pane>
      </el-tabs>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CirclePlus, Remove } from '@element-plus/icons-vue'
import InboundComponent from '@/components/warehouse/InboundComponent.vue'
import OutboundComponent from '@/components/warehouse/OutboundComponent.vue'

const activeTab = ref('inbound')
</script>

<style scoped>
.warehouse-management { box-sizing: border-box; width: 100%; height: 100%; min-height: 0; padding: 22px clamp(16px, 2.5vw, 36px) 28px; overflow: auto; background: #252a2f; color: #edf3f8; }
.page-header, .workspace { width: min(1180px, 100%); margin: 0 auto; }
.page-header { margin-bottom: 18px; }
.eyebrow { margin: 0 0 6px; color: #7fb4df; font-size: 12px; font-weight: 600; letter-spacing: 0; }
h1 { margin: 0; color: #edf3f8; font-size: 28px; font-weight: 600; line-height: 1.3; }
.page-description { margin: 8px 0 0; color: #aebbc6; font-size: 14px; line-height: 1.6; }
.workspace { box-sizing: border-box; min-height: 460px; padding: 0 22px 22px; border: 1px solid #414b55; border-radius: 8px; background: #30373e; box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22); }
.warehouse-tabs :deep(.el-tabs__header) { margin: 0 0 24px; }
.warehouse-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background: #414b55; }
.warehouse-tabs :deep(.el-tabs__item) { height: 58px; color: #aebbc6; font-size: 14px; }
.warehouse-tabs :deep(.el-tabs__item.is-active) { color: #78b8eb; font-weight: 600; }
.warehouse-tabs :deep(.el-tabs__active-bar) { height: 2px; background: #409eff; }
.tab-label { display: inline-flex; align-items: center; gap: 8px; }
.tab-label .el-icon { font-size: 17px; }
@media (max-width: 768px) { .warehouse-management { padding: 16px 12px 24px; } .workspace { min-height: 0; padding: 0 14px 16px; } }
@media (max-width: 560px) {
  .warehouse-management { padding: 12px 8px 18px; }
  h1 { font-size: 24px; }
  .page-description { font-size: 12px; }
  .workspace { padding: 0 10px 12px; }
  .warehouse-tabs :deep(.el-tabs__item) { height: 48px; font-size: 13px; }
  .tab-label { gap: 5px; }
}
</style>
