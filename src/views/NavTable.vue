<template>
  <div class="nav-table">
    <el-tabs v-model="activeName" type="card" class="demo-tabs" @tab-click="handleClick">
      <el-tab-pane label="117房间" name="first" class="custom-tab">
        <div class="histogram-container">
          <keep-alive>
            <Chart117 v-if="activeName === 'first'" />
          </keep-alive>
        </div>
      </el-tab-pane>
      <!-- <el-tab-pane label="118房间" name="second" class="custom-tab">
        <div class="histogram-container">
          <keep-alive>
            <Chart118 ref="chart118Ref" v-show="currentChart === '118'" />
          </keep-alive>
        </div>
      </el-tab-pane>
      <el-tab-pane label="119房间" name="third" class="custom-tab">
        <div class="histogram-container">
          <keep-alive>
            <Chart119 ref="chart119Ref" v-show="currentChart === '119'" />
          </keep-alive>
        </div>
      </el-tab-pane> -->
    </el-tabs>
  </div>
</template>


<script lang='ts' setup name="NavTable">
import type { TabsPaneContext } from 'element-plus'
import { ref, watch, nextTick, type ComponentPublicInstance } from 'vue'
import Chart117 from '@/components/Charts/Chart117.vue';
import Chart118 from '@/components/Charts/Chart118.vue';
import Chart119 from '@/components/Charts/Chart119.vue';

interface ChartComponentInstance extends ComponentPublicInstance {
  isVisible?: boolean;
}

const activeName = ref('first');
const currentChart = ref('117');  // 假设默认显示 Chart117
const chart118Ref = ref<ChartComponentInstance | null>(null);
const chart119Ref = ref<ChartComponentInstance | null>(null);

const handleClick = (tab: TabsPaneContext, event: Event) => {
  console.log(tab, event)
}

watch(currentChart, (newValue) => {
  console.log('Current chart changed to:', newValue);
  if (chart118Ref.value) {
    chart118Ref.value.isVisible = newValue === '118';
    console.log('Chart118 visibility:', chart118Ref.value.isVisible);
  }
  if (chart119Ref.value) {
    chart119Ref.value.isVisible = newValue === '119';
    console.log('Chart119 visibility:', chart119Ref.value.isVisible);
  }
});

// Remove the duplicate watch block
</script>


<style scoped>
.histogram-container {
  width: 100%;
  height: 85vh;
}

.linechart-container {
  width: 100%;
  height: 85vh;
  ;
}
.piechart-container {
  width: 100%;
  height: 85vh;
  ;
}
.scatterchart-container {
  width: 100%;
  height: 85vh;
}
.nav-table {
  background-color: rgba(0, 102, 204, 0.5);
}

.custom-tab {
  color: #0066cc;
}

:deep(.el-tabs__item) {
  color: #0066cc;
  font-size: 16px;
  text-shadow: 0 0 5px rgba(0, 102, 204, 0.7), 0 0 10px rgba(173, 216, 230, 0.5);
}

:deep(.el-tabs__item.is-active) {
  color: #0066cc;
  font-weight: bold;
}

:deep(.el-tabs__active-bar) {
  background-color: #0066cc;
}
</style>