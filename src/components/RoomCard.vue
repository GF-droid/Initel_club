<template>
  <div class="room-container">
    <el-scrollbar height="100%">
      <div class="cards-wrapper">
        <div v-for="room in rooms" :key="room.id" class="room-card">
          <div class="card-content">
            <h2 class="room-name">{{ room.name }}</h2>
            <div class="room-info">
              <div class="temperature">
                <span>当前温度：{{ room.temperature }}°C</span>
              </div>
              <div class="humidity">
                <span>当前湿度：{{ room.humidity }}%</span>
              </div>
            </div>
            <div v-if="showControlsForRoom(room.name)" class="room-controls">
              <el-button type="primary" size="small" @click="OpenBtn(room.paramId)">空调开</el-button>
              <el-button type="info" size="small" @click="CloseBtn(room.paramId)">空调关</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { ref, watchEffect, onMounted, onUnmounted } from 'vue'
import { ElScrollbar, ElButton } from 'element-plus'
import { useDataStore } from "@/store/Data/DataStore";
import { useBtnStore } from "@/store/btn/BtnStore"

const dataStore = useDataStore()
const { OpenBtn, CloseBtn } = useBtnStore()

const localData = ref({
  temp1: 0,
  hum1: 0,
  temp2: 0,
  hum2: 0,
  temp3: 0,
  hum3: 0,
  temp4: 0,
  hum4: 0,
  temp5: 0,
  hum5: 0,
  temp6: 0,
  hum6: 0,
  temp7: 0,
  hum7: 0,
  temp8: 0,
  hum8: 0,
  temp9: 0,
  hum9: 0,
  temp10: 0,
  hum10: 0,
});

watchEffect(() => {
  localData.value = {
    temp1: dataStore.temp1,
    hum1: dataStore.hum1,
    temp2: dataStore.temp2,
    hum2: dataStore.hum2,
    temp3: dataStore.temp3,
    hum3: dataStore.hum3,
    temp4: dataStore.temp4,
    hum4: dataStore.hum4,
    temp5: dataStore.temp5,
    hum5: dataStore.hum5,
    temp6: dataStore.temp6,
    hum6: dataStore.hum6,
    temp7: dataStore.temp7,
    hum7: dataStore.hum7,
    temp8: dataStore.temp8,
    hum8: dataStore.hum8,
    temp9: dataStore.temp9,
    hum9: dataStore.hum9,
    temp10: dataStore.temp10,
    hum10: dataStore.hum10,
  }
})

const rooms = ref([
  { id: 1, name: '101房间', temperature: 0, humidity: 0, paramId: 2, dataIndex: 1 },
  { id: 2, name: '102房间', temperature: 0, humidity: 0, paramId: 3, dataIndex: 2 },
  { id: 3, name: '108房间', temperature: 0, humidity: 0, paramId: 5, dataIndex: 3 },
  { id: 4, name: '109房间', temperature: 0, humidity: 0, paramId: 6, dataIndex: 4 },
  { id: 5, name: '113房间', temperature: 0, humidity: 0, paramId: 7, dataIndex: 5 },
  { id: 6, name: '115房间', temperature: 0, humidity: 0, paramId: 8, dataIndex: 6 },
  { id: 7, name: '116房间', temperature: 0, humidity: 0, paramId: 9, dataIndex: 7 },
  { id: 8, name: '117房间', temperature: 0, humidity: 0, paramId: 10, dataIndex: 8 },
  { id: 9, name: '118房间', temperature: 0, humidity: 0, paramId: 11, dataIndex: 9 },
  { id: 10, name: '119房间', temperature: 0, humidity: 0, paramId: 12, dataIndex: 10 },
])

const updateRoomData = () => {
  console.log('🔄 更新房间数据...');

  rooms.value.forEach((room) => {
    const tempKey = `temp${room.dataIndex}` as keyof typeof dataStore
    const humKey = `hum${room.dataIndex}` as keyof typeof dataStore

    const temperature = dataStore[tempKey] as number
    const humidity = dataStore[humKey] as number

    room.temperature = temperature
    room.humidity = humidity

    console.log(`📊 ${room.name}: 温度=${temperature}, 湿度=${humidity}`);
  })

  console.log('✅ 房间数据更新完成');
}

let intervalId: number

onMounted(() => {
  console.log('🚀 房间组件已挂载');

  // 初始加载数据
  dataStore.getalldata().then(() => {
    updateRoomData()
  })

  intervalId = setInterval(() => {
    console.log('⏰ 定时更新数据...');
    dataStore.getalldata().then(() => {
      updateRoomData()
    })
  }, 5000)
})

onUnmounted(() => {
  console.log('🧹 清理房间组件');
  clearInterval(intervalId)
})

const showControlsForRoom = (roomName: string) => {
  return true; // Always show controls for all rooms
}
</script>

<style scoped>
.room-container {
  height: 100%;
  padding: 5px;
}

.cards-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  justify-content: center;
}

.room-card {
  flex: 0 0 calc(33.333% - 40px);
  height: 250px;
  width: 300px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  padding: 3px;
}

.room-card::before,
.room-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: conic-gradient(from 0deg,
      transparent 0deg 60deg,
      #00ffff 90deg 180deg,
      #0099ff 210deg 300deg,
      transparent 330deg);
  animation: rotate 3s linear infinite;
  z-index: 0;
  /* 确保在内容之下 */
}

.room-card::after {
  filter: blur(20px);
}

.card-content {
  position: relative;
  height: 100%;
  background: rgba(22, 22, 22, 0.8);
  border-radius: 17px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 15px;
  /* 减少内边距 */
  z-index: 1;
  color: #fff;
}

.room-name {
  font-size: 24px;
  /* 稍微减小字体大小 */
  margin-bottom: 10px;
  /* 减少下边距 */
  color: #4ecdc4;
  text-align: center;
}

.room-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 65px;
  /* 减少下边距 */
}

.temperature,
.humidity {
  font-size: 16px;
  /* 稍微减小字体大小 */
  margin: 5px 0;
  /* 减少上下边距 */
}

.room-controls {
  display: flex;
  justify-content: space-around;
  margin-bottom: 25px
}

.el-button {
  flex: 1;
  margin: 0 3px;
  /* 减少按钮之间的间距 */
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

:deep(.el-scrollbar__bar.is-vertical) {
  width: 12px;
  right: 2px;
}

:deep(.el-scrollbar__thumb) {
  background-color: rgba(0, 153, 255, 0.5);
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

:deep(.el-scrollbar__thumb:hover) {
  background-color: rgba(0, 153, 255, 0.8);
}

:deep(.el-scrollbar__wrap) {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 153, 255, 0.5) transparent;
}

/* 滚动条轨道 */
::-webkit-scrollbar-track {
  background-color: #6a5f5f;
  /* 稍微深一点的轨道颜色 */
}

/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
  background-color: #333;
  /* 非常深的灰色，接近黑色 */
}

/* 鼠标悬停在滚动条滑块上时 */
::-webkit-scrollbar-thumb:hover {
  background-color: #1a1a1a;
  /* 几乎是黑色 */
}

:deep(.el-scrollbar__wrap::-webkit-scrollbar) {
  width: 12px;
}

:deep(.el-scrollbar__wrap::-webkit-scrollbar-track) {
  background-color: transparent;
}
</style>