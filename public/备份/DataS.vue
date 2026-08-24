<template>
<div class="container">
    <div class="data-container">
        <div class="tit">
            <span class="sensor-id">117</span>
            <div class="labels">
                <span>温度</span>
                <span>湿度</span>
            </div>
        </div>
        <div class="A001">
            <div class="temp"><span>{{ localData.temp1 }}°C</span></div>
            <div class="hum"><span>{{ localData.hum1 }}%</span></div>
        </div>
        <div class="tit">
            <span class="sensor-id">118</span>
            <div class="labels">
                <span>温度</span>
                <span>湿度</span>
            </div>
        </div>
        <div class="A002">
            <div class="temp"><span>{{ localData.temp2 }}°C</span></div>
            <div class="hum"><span>{{ localData.hum2 }}%</span></div>
        </div>
        <div class="tit">
            <span class="sensor-id">119</span>
            <div class="labels">
                <span>温度</span>
                <span>湿度</span>
            </div>
        </div>
        <div class="A003">
            <div class="temp"><span>{{ localData.temp3 }}°C</span></div>
            <div class="hum"><span>{{ localData.hum3 }}%</span></div>
        </div>
    </div>
    <div class="btn-container">
        <Btn />
    </div>
</div>
</template>


<script lang='ts' setup>
import Btn from '@/components/btn.vue';
import { ref, onMounted, onUnmounted, watchEffect } from "vue";
import { useDataStore } from "@/store/Data/DataStore";
import { useBtnStore } from '@/store/btn/BtnStore'

const dataStore = useDataStore();
const btnStore = useBtnStore();

// 使用 ref 来存储本地数据
const localData = ref({
  temp1: 0,
  hum1: 0,
  temp2: 0,
  hum2: 0,
  temp3: 0,
  hum3: 0
});

let intervalId: number;

const fetchData = async () => {
    await dataStore.getData1();
    await dataStore.getData2();
    await dataStore.getData3();
}

// 使用 watchEffect 来监听 store 中的数据变化
watchEffect(() => {
  localData.value = {
    temp1: dataStore.temp1,
    hum1: dataStore.hum1,
    temp2: dataStore.temp2,
    hum2: dataStore.hum2,
    temp3: dataStore.temp3,
    hum3: dataStore.hum3
  };
});

const {CloseBtn,OpenBtn} = btnStore;
// 逻辑判断
const compareTemp = () =>{
    if(localData.value.temp1 > 28){
        OpenBtn(6);
    }
    if(localData.value.temp1 < 26){
        CloseBtn(6);
    }
    if(localData.value.temp2 > 28){
        OpenBtn(3);
    }
    if(localData.value.temp2 < 26){
        CloseBtn(3);
    }
    if(localData.value.temp3 > 28){
        OpenBtn(2);
    }
    if(localData.value.temp3 < 26){
        CloseBtn(2);
    }
}

onMounted(() => {
    console.log("挂载了");
    
    // 立即执行一次
    fetchData();
    // 设置每2秒执行一次的定时器
    intervalId = setInterval(fetchData, 2000);
    setInterval(compareTemp, 300000);
});

onUnmounted(() => {
    // 组件卸载时清除定时器
    clearInterval(intervalId);
});
</script>


<style scoped>
.container {
    width: 100%;
    height: 100vh;
    display: flex;
    background-color: rgba(0, 102, 204, 0.5) !important; /* 添加 !important 确保应用 */
    overflow: hidden;
}
.data-container {
    flex: 1 0 40%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow-y: auto; /* 如果内容过多，允许滚动 */
}
.A001, .A002, .A003 {
    flex: 1;
    display: flex;
    align-items: flex-start; /* 改为 flex-start，使内容靠上对齐 */
    justify-content: space-between;
    padding: 0 10px;
    
}
.temp, .hum {
    width: calc(40% - 2.5px);
    height: 50px;
    background-color: #f0f0f0;
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;
    border: 2px solid #0066cc;
    box-shadow: 0 0 10px rgba(0, 102, 204, 0.5), 0 0 20px rgba(173, 216, 230, 0.3);
    transition: box-shadow 0.3s ease;
    margin-top: 2px; /* 添加小的顶部边距，使数值框更靠近标签 */
}

.temp:hover, .hum:hover {
    box-shadow: 0 0 20px rgba(0, 102, 204, 0.8), 0 0 30px rgba(173, 216, 230, 0.5);
}

.temp span, .hum span, .labels span, .sensor-id {
    color: #0066cc;
    font-size: 30px;
    text-shadow: 0 0 5px rgba(0, 102, 204, 0.7), 0 0 10px rgba(173, 216, 230, 0.5);
    animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
    from {
        text-shadow: 0 0 5px rgba(0, 102, 204, 0.7), 0 0 10px rgba(173, 216, 230, 0.5);
    }
    to {
        text-shadow: 0 0 20px rgba(0, 102, 204, 0.9), 0 0 30px rgba(173, 216, 230, 0.7);
    }
}
.btn-container {
    flex: 0 0 60%;
    height: 100%;
    overflow-y: auto; /* 如果内容过多，允许滚动 */
}

.tit {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 5px; /* 减小整体底部边距 */
}

.sensor-id {
    margin-bottom: 5px;
}

.labels {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 0 10px;
    margin-bottom: 2px; /* 添加小的底部边距，使标签更靠近数值框 */
}

.labels span {
    width: calc(40% - 2.5px);
    text-align: center;
}

.labels span {
    width: calc(40% - 2.5px);
    text-align: center;
    color: #0066cc;
    font-size: 22px;
    text-shadow: 0 0 5px rgba(0, 102, 204, 0.7), 0 0 10px rgba(173, 216, 230, 0.5);
    animation: glow 2s ease-in-out infinite alternate;
}
</style>