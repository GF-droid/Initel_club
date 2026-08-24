<template>
  <div class="container">
    <el-card v-for="card in cards" :key="card.name" class="card" shadow="never">
      <div class="card-header">
        <span class="room-dot"></span>
        <span>{{ card.name }}</span>
        <el-tag size="small" type="success" effect="light">在线</el-tag>
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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect, onMounted, onUnmounted } from 'vue'
import { useDataStore } from '@/store/Data/DataStore'
import { storeToRefs } from 'pinia'

const dataStore = useDataStore()
const {
  temp1, hum1, temp2, hum2, temp3, hum3, temp4, hum4, temp5, hum5,
  temp6, hum6, temp7, hum7, temp8, hum8, temp9, hum9, temp10, hum10,
} = storeToRefs(dataStore)

const cards = ref([
  { name: '101房间', temperature: temp1.value, humidity: hum1.value },
  { name: '102房间', temperature: temp2.value, humidity: hum2.value },
  { name: '108房间', temperature: temp3.value, humidity: hum3.value },
  { name: '109房间', temperature: temp4.value, humidity: hum4.value },
  { name: '113房间', temperature: temp5.value, humidity: hum5.value },
  { name: '115房间', temperature: temp6.value, humidity: hum6.value },
  { name: '116房间', temperature: temp7.value, humidity: hum7.value },
  { name: '117房间', temperature: temp8.value, humidity: hum8.value },
  { name: '118房间', temperature: temp9.value, humidity: hum9.value },
  { name: '119房间', temperature: temp10.value, humidity: hum10.value },
])

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
})

let intervalId: number
onMounted(() => {
  dataStore.getalldata()
  intervalId = window.setInterval(() => dataStore.getalldata(), 5000)
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
