<template>
  <section class="air-control">
    <div class="control-heading">
      <div>
        <div class="heading-title"><el-icon><WindPower /></el-icon><h2>空调控制</h2></div>
        <p>{{ smartEnabled ? `智能控制已启用，目标 ${comfortSummary}` : '选择房间后可进行手动控制，或前往智能控制页设置策略。' }}</p>
      </div>
      <el-tag :type="smartEnabled ? 'success' : 'info'" effect="dark">{{ smartEnabled ? '智能控制中' : '手动模式' }}</el-tag>
    </div>

    <div class="control-content">
      <el-select v-model="selectedRoomId" class="room-select" popper-class="warehouse-select-popper">
        <el-option v-for="room in rooms" :key="room.id" :label="room.label" :value="room.id" />
      </el-select>
      <span class="state-text"><i :class="{ active: currentState }"></i>{{ currentState ? '空调运行中' : '空调已关闭' }}</span>
      <div class="manual-actions">
        <el-button type="primary" :disabled="smartEnabled" :loading="isSubmitting" @click="setAirState(selectedRoomId, true)">开启</el-button>
        <el-button :disabled="smartEnabled" :loading="isSubmitting" @click="setAirState(selectedRoomId, false)">关闭</el-button>
      </div>
      <el-button text type="primary" @click="router.push('/home/air-conditioning')">智能控制设置<el-icon class="settings-arrow"><ArrowRight /></el-icon></el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { ArrowRight, WindPower } from '@element-plus/icons-vue'
import { useAirConditioningStore } from '@/store/airConditioningStore'

const router = useRouter()
const airStore = useAirConditioningStore()
const { rooms, selectedRoomId, smartEnabled, isSubmitting, currentState, comfortSummary } = storeToRefs(airStore)
const { setAirState } = airStore
</script>

<style scoped>
.air-control { display: flex; gap: 24px; align-items: center; justify-content: space-between; margin-bottom: 18px; padding: 16px 18px; border: 1px solid #4a5661; border-radius: 8px; background: #343d46; }
.control-heading { display: flex; align-items: flex-start; gap: 12px; }
.heading-title { display: flex; align-items: center; gap: 8px; color: #edf3f8; }
.heading-title .el-icon { color: #83c3ef; font-size: 19px; }
h2 { margin: 0; font-size: 16px; font-weight: 600; }
p { margin: 6px 0 0; color: #aebbc6; font-size: 12px; line-height: 1.4; }
.control-content { display: flex; align-items: center; gap: 12px; }
.room-select { width: 126px; }
.room-select :deep(.el-select__wrapper) { min-height: 32px; background: #252a2f; box-shadow: 0 0 0 1px #52606c inset; }
.room-select :deep(.el-select__selected-item) { color: #edf3f8; font-size: 13px; }
.state-text { display: inline-flex; align-items: center; gap: 6px; color: #b7c4cf; font-size: 12px; white-space: nowrap; }
.state-text i { width: 7px; height: 7px; border-radius: 50%; background: #7e8b96; }
.state-text i.active { background: #67c23a; box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.13); }
.manual-actions { display: flex; gap: 7px; }
.manual-actions .el-button { min-width: 56px; margin: 0; }
.settings-arrow { margin-left: 3px; }
:global(.warehouse-select-popper) { --el-bg-color-overlay: #30373e; --el-border-color-light: #4a5661; border: 1px solid #4a5661 !important; background: #30373e !important; }
:global(.warehouse-select-popper .el-select-dropdown__wrap) { background: #30373e; }
:global(.warehouse-select-popper .el-select-dropdown__item) { color: #c6d0d9; }
:global(.warehouse-select-popper .el-select-dropdown__item:hover), :global(.warehouse-select-popper .el-select-dropdown__item.is-hovering) { background: #3a444d; }
:global(.warehouse-select-popper .el-select-dropdown__item.is-selected) { color: #83c3ef; font-weight: 600; }
:global(.warehouse-select-popper .el-popper__arrow::before) { background: #30373e !important; border-color: #4a5661 !important; }
@media (max-width: 1050px) { .air-control { align-items: flex-start; flex-direction: column; } .control-content { flex-wrap: wrap; } }
@media (max-width: 600px) { .air-control { padding: 14px; } .control-content, .room-select { width: 100%; } .manual-actions { flex: 1; } .manual-actions .el-button { flex: 1; } }
</style>
