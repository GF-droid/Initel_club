<template>
  <div>
    <div class="container">
    <el-card v-for="card in cards" :key="card.name" class="card" shadow="never">
      <div class="card-header">
        <span class="room-dot"></span>
        <span>{{ card.name }}</span>
        <el-tag v-if="dataStore.smokeStates[card.roomId]?.alarm" size="small" type="danger" effect="dark">烟雾报警</el-tag>
        <el-tag v-else size="small" type="success" effect="light">正常</el-tag>
      </div>
      <div class="card-content">
        <div class="metric temperature">
          <span class="metric-label">温度</span>
          <strong>{{ card.temperature }}<small>°C</small></strong>
        </div>
        <div class="metric humidity">
          <span class="metric-label">湿度</span>
          <strong>{{ card.humidity }}<small>%</small></strong>
        </div>
      </div>
      <div v-if="dataStore.smokeStates[card.roomId]?.alarm" class="smoke-alert"><span class="smoke-alert-dot"></span><span>{{ dataStore.smokeStates[card.roomId]?.message || '检测到烟雾，请立即处理' }}</span></div>
      <div v-if="airStore.controlAlerts[card.roomId]" class="control-alert"><span class="control-alert-dot"></span><span>{{ airStore.controlAlerts[card.roomId].message }}</span></div>
      <div class="ac-controls">
        <div class="ac-control-header"><span>空调控制</span><span class="ac-state" :class="{ running: airStore.airStates[card.roomId] }">{{ airStore.airStates[card.roomId] ? '运行中' : '已关闭' }}</span></div>
        <el-radio-group v-model="controls[card.roomId].mode" size="small" class="mode-switch">
          <el-radio-button label="target">固定温度</el-radio-button>
          <el-radio-button label="range">温度范围</el-radio-button>
        </el-radio-group>
        <div class="temperature-settings">
          <el-select v-if="controls[card.roomId].mode === 'target'" v-model="controls[card.roomId].target" class="temperature-select" filterable popper-class="warehouse-select-popper">
            <el-option v-for="temperature in temperatureOptions" :key="temperature" :label="`${temperature} °C`" :value="temperature" />
          </el-select>
          <template v-else>
            <el-select v-model="controls[card.roomId].min" class="temperature-select" filterable popper-class="warehouse-select-popper">
              <el-option v-for="temperature in temperatureOptions" :key="`min-${temperature}`" :label="`${temperature} °C`" :value="temperature" />
            </el-select>
            <span>-</span>
            <el-select v-model="controls[card.roomId].max" class="temperature-select" filterable popper-class="warehouse-select-popper">
              <el-option v-for="temperature in temperatureOptions" :key="`max-${temperature}`" :label="`${temperature} °C`" :value="temperature" />
            </el-select>
          </template>
          <span class="unit">°C</span>
        </div>
        <div class="ac-actions">
          <el-switch v-model="controls[card.roomId].smart" size="small" active-text="智能" @change="onSmartChange(card.roomId)" />
          <el-button size="small" type="primary" :disabled="controls[card.roomId].smart" @click="airStore.setAirState(card.roomId, true)">开启</el-button>
          <el-button size="small" :disabled="controls[card.roomId].smart" @click="airStore.setAirState(card.roomId, false)">关闭</el-button>
        </div>
      </div>
    </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watchEffect, onMounted, onUnmounted } from 'vue'
import { useDataStore } from '@/store/Data/DataStore'
import { storeToRefs } from 'pinia'
import { useAirConditioningStore } from '@/store/airConditioningStore'

const dataStore = useDataStore()
const airStore = useAirConditioningStore()
const temperatureOptions = Array.from({ length: 29 }, (_, index) => 16 + index * 0.5)
const {
  temp1, hum1, temp2, hum2, temp3, hum3, temp4, hum4, temp5, hum5,
  temp6, hum6, temp7, hum7, temp8, hum8, temp9, hum9, temp10, hum10,
} = storeToRefs(dataStore)

const cards = ref([
  { roomId: '101', name: '101房间', temperature: temp1.value, humidity: hum1.value },
  { roomId: '102', name: '102房间', temperature: temp2.value, humidity: hum2.value },
  { roomId: '108', name: '108房间', temperature: temp3.value, humidity: hum3.value },
  { roomId: '109', name: '109房间', temperature: temp4.value, humidity: hum4.value },
  { roomId: '113', name: '113房间', temperature: temp5.value, humidity: hum5.value },
  { roomId: '115', name: '115房间', temperature: temp6.value, humidity: hum6.value },
  { roomId: '116', name: '116房间', temperature: temp7.value, humidity: hum7.value },
  { roomId: '117', name: '117房间', temperature: temp8.value, humidity: hum8.value },
  { roomId: '118', name: '118房间', temperature: temp9.value, humidity: hum9.value },
  { roomId: '119', name: '119房间', temperature: temp10.value, humidity: hum10.value },
])

const controls = reactive<Record<string, ReturnType<typeof airStore.getRoomSettings>>>({})
cards.value.forEach((card) => { controls[card.roomId] = airStore.getRoomSettings(card.roomId) })
const onSmartChange = (roomId: string) => { void airStore.evaluateRoomTemperature(roomId, Number(cards.value.find((card) => card.roomId === roomId)?.temperature ?? 0)) }

watchEffect(() => {
  const values = [
    [temp1.value, hum1.value], [temp2.value, hum2.value],
    [temp3.value, hum3.value], [temp4.value, hum4.value],
    [temp5.value, hum5.value], [temp6.value, hum6.value],
    [temp7.value, hum7.value], [temp8.value, hum8.value],
    [temp9.value, hum9.value], [temp10.value, hum10.value],
  ]
  values.forEach(([temperature, humidity], index) => {
    cards.value[index].temperature = temperature
    cards.value[index].humidity = humidity
  })
  airStore.rooms.forEach((room, index) => { void airStore.evaluateRoomTemperature(room.id, Number(values[index]?.[0])) })
})

let intervalId: number
onMounted(() => {
  dataStore.getalldata()
  dataStore.getSmokeStatuses()
  intervalId = window.setInterval(() => { dataStore.getalldata(); dataStore.getSmokeStatuses() }, 5000)
})

onUnmounted(() => window.clearInterval(intervalId))
</script>

<style scoped>
.container {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  padding: 4px;
  box-sizing: border-box;
}

.card {
  width: 100%;
  min-width: 0;
  min-height: 148px;
  border: 1px solid #4b5661;
  border-radius: 14px;
  background: #3a434c;
  color: #edf3f8;
  --el-card-bg-color: #3a434c;
  --el-card-border-color: #4b5661;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

.card :deep(.el-card__body) {
  background: #3a434c;
  color: #edf3f8;
}

.card :deep(.el-card__body) {
  padding: 18px;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 26px rgba(0, 0, 0, 0.28);
}
.smoke-alert { display: flex; align-items: center; gap: 7px; margin-top: 12px; padding: 7px 9px; border: 1px solid rgba(245, 108, 108, .55); border-radius: 7px; background: rgba(120, 35, 40, .38); color: #ffb2b2; font-size: 11px; }
.smoke-alert-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: #f56c6c; box-shadow: 0 0 0 3px rgba(245, 108, 108, .18); }
.control-alert { display: flex; align-items: center; gap: 7px; margin-top: 8px; padding: 7px 9px; border: 1px solid rgba(230, 162, 60, .55); border-radius: 7px; background: rgba(119, 80, 26, .28); color: #f5d28c; font-size: 11px; }
.control-alert-dot { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: #e6a23c; }

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #edf3f8;
  font-weight: 700;
}

.room-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #25b864;
  box-shadow: 0 0 0 4px rgba(37, 184, 100, 0.14);
}

.card-header .el-tag {
  margin-left: auto;
}

.card-content {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  min-width: 0;
}

.metric {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: #46525e;
  border: 1px solid #52606c;
}

.metric-label {
  display: block;
  margin-bottom: 4px;
  color: #b7c4cf;
  font-size: 12px;
}

.metric strong {
  color: #f1f6fa;
  font-size: 22px;
  font-weight: 700;
}

.metric small {
  margin-left: 2px;
  color: #b8c4ce;
  font-size: 12px;
}

.ac-controls { margin-top: 14px; padding-top: 12px; border-top: 1px solid #52606c; }
.ac-control-header, .ac-actions, .temperature-settings { display: flex; align-items: center; }
.ac-control-header { justify-content: space-between; margin-bottom: 8px; color: #c6d0d9; font-size: 12px; font-weight: 600; }
.ac-state { color: #8e9ca8; font-size: 11px; font-weight: 400; }
.ac-state.running { color: #7bcf8a; }
.mode-switch { width: 100%; margin-bottom: 8px; }
.mode-switch :deep(.el-radio-button) { flex: 1; }
.mode-switch :deep(.el-radio-button__inner) { width: 100%; padding: 5px 4px; border-color: #52606c; background: #252a2f; color: #aebbc6; font-size: 11px; }
.mode-switch :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { background: #1f4058; border-color: #409eff; color: #9fd4f5; box-shadow: none; }
.temperature-settings { gap: 5px; margin-bottom: 9px; }
.temperature-settings :deep(.temperature-select) { width: 0; flex: 1; }
.temperature-settings :deep(.el-select__wrapper) { min-height: 30px; padding: 1px 7px; background: #252a2f; box-shadow: 0 0 0 1px #52606c inset; }
.temperature-settings :deep(.el-select__selected-item), .temperature-settings :deep(.el-select__placeholder), .temperature-settings :deep(.el-select__input) { color: #edf3f8; font-size: 12px; }
.temperature-settings > span { color: #8e9ca8; font-size: 11px; }
.temperature-settings .unit { color: #aebbc6; }
.ac-actions { gap: 6px; }
.ac-actions .el-switch { margin-right: auto; }
.ac-actions .el-button { min-width: 42px; margin: 0; padding: 5px 7px; }

@media (max-width: 600px) {
  .container {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 601px) and (max-width: 900px) {
  .container {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (min-width: 901px) and (max-width: 1500px) {
  .container {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
