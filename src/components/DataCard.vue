<template>
    <div class="container">
        <div class="card-row" v-for="row in 2" :key="row">
            <div class="card-scroll">
                <el-card v-for="(card, index) in cardsInRow(row)" :key="`card-${row}-${index}`" class="card"
                    shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>{{ card.name }}</span>
                        </div>
                    </template>
                    <div class="card-content">
                        <div>{{ card.content1 }}</div>
                        <div>{{ card.content2 }}</div>
                    </div>
                </el-card>
                <el-card v-for="(card, index) in cardsInRow(row)" :key="`card-${row}-${index}-duplicate`" class="card"
                    shadow="hover">
                    <template #header>
                        <div class="card-header">
                            <span>{{ card.name }}</span>
                        </div>
                    </template>
                    <div class="card-content">
                        <div>{{ card.content1 }}</div>
                        <div>{{ card.content2 }}</div>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ElCard } from 'element-plus'
import { ref, computed, watchEffect, onMounted, onUnmounted } from 'vue'
import { useDataStore } from "@/store/Data/DataStore";
import { storeToRefs } from 'pinia';

const dataStore = useDataStore()
const {
    temp1, hum1, temp2, hum2, temp3, hum3, temp4, hum4, temp5, hum5,
    temp6, hum6, temp7, hum7, temp8, hum8, temp9, hum9, temp10, hum10
} = storeToRefs(dataStore)

// 删除重复的 onBeforeMount 和 localData，直接使用 store 数据

const cards = ref([
    { name: '101房间', content1: `温度：${temp1.value}℃`, content2: `湿度：${hum1.value}%` },
    { name: '102房间', content1: `温度：${temp2.value}℃`, content2: `湿度：${hum2.value}%` },
    { name: '108房间', content1: `温度：${temp3.value}℃`, content2: `湿度：${hum3.value}%` },
    { name: '109房间', content1: `温度：${temp4.value}℃`, content2: `湿度：${hum4.value}%` },
    { name: '113房间', content1: `温度：${temp5.value}℃`, content2: `湿度：${hum5.value}%` },
    { name: '115房间', content1: `温度：${temp6.value}℃`, content2: `湿度：${hum6.value}%` },
    { name: '116房间', content1: `温度：${temp7.value}℃`, content2: `湿度：${hum7.value}%` },
    { name: '117房间', content1: `温度：${temp8.value}℃`, content2: `湿度：${hum8.value}%` },
    { name: '118房间', content1: `温度：${temp9.value}℃`, content2: `湿度：${hum9.value}%` },
    { name: '119房间', content1: `温度：${temp10.value}℃`, content2: `湿度：${hum10.value}%` }
])

// 使用 watchEffect 自动更新卡片内容
watchEffect(() => {
    // 房间101 (temp1, hum1)
    cards.value[0].content1 = `温度：${temp1.value}℃`
    cards.value[0].content2 = `湿度：${hum1.value}%`

    // 房间102 (temp2, hum2)
    cards.value[1].content1 = `温度：${temp2.value}℃`
    cards.value[1].content2 = `湿度：${hum2.value}%`

    // 房间108 (temp3, hum3)
    cards.value[2].content1 = `温度：${temp3.value}℃`
    cards.value[2].content2 = `湿度：${hum3.value}%`

    // 房间109 (temp4, hum4)
    cards.value[3].content1 = `温度：${temp4.value}℃`
    cards.value[3].content2 = `湿度：${hum4.value}%`

    // 房间113 (temp5, hum5)
    cards.value[4].content1 = `温度：${temp5.value}℃`
    cards.value[4].content2 = `湿度：${hum5.value}%`

    // 房间115 (temp6, hum6)
    cards.value[5].content1 = `温度：${temp6.value}℃`
    cards.value[5].content2 = `湿度：${hum6.value}%`

    // 房间116 (temp7, hum7)
    cards.value[6].content1 = `温度：${temp7.value}℃`
    cards.value[6].content2 = `湿度：${hum7.value}%`

    // 房间117 (temp8, hum8)
    cards.value[7].content1 = `温度：${temp8.value}℃`
    cards.value[7].content2 = `湿度：${hum8.value}%`

    // 房间118 (temp9, hum9)
    cards.value[8].content1 = `温度：${temp9.value}℃`
    cards.value[8].content2 = `湿度：${hum9.value}%`

    // 房间119 (temp10, hum10)
    cards.value[9].content1 = `温度：${temp10.value}℃`
    cards.value[9].content2 = `湿度：${hum10.value}%`
})

let intervalId: number

onMounted(() => {
    // 初始加载数据
    dataStore.getalldata()

    // 设置定时器，每5秒更新一次
    intervalId = setInterval(() => {
        dataStore.getalldata()
    }, 5000)
})

onUnmounted(() => {
    clearInterval(intervalId)
})

const cardsPerRow = 5

const cardsInRow = computed(() => (row: any) => {
    const start = (row - 1) * cardsPerRow
    return cards.value.slice(start, start + cardsPerRow)
})
</script>

<style scoped>
.container {
    overflow: hidden;
    width: 100%;
    height: 520px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 60px 0;
}

.card-row {
    height: 240px;
    overflow: hidden;
}

.card-scroll {
    display: flex;
    animation: scroll 30s linear infinite;
    width: calc(260px * 10);
}

.card {
    flex: 0 0 auto;
    width: 250px;
    margin: 0 15px;
    font-size: 16px;
    transition: box-shadow 0.3s ease;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.card-content {
    height: 100px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}

.card-content div {
    margin: 5px 0;
}

@keyframes scroll {
    0% {
        transform: translateX(0);
    }

    100% {
        transform: translateX(calc(-260px * 5));
    }
}

.card-row:nth-child(2) .card-scroll {
    animation-direction: reverse;
}

.card-row:first-child {
    margin-bottom: 40px;
}
</style>