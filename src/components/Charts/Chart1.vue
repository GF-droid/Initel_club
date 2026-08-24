<template>
  <div class="chart-container">
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from "echarts/components";
import VChart from "vue-echarts";
import { ref, onMounted, onUnmounted, onBeforeMount } from 'vue';
import { useChartDataStore } from '@/store/Data/ChartData';
import { storeToRefs } from 'pinia';
import Chart from "vue-echarts";

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);


const charstore = useChartDataStore()
const {templist1,templist2,humlist1,humlist2,timelist} = storeToRefs(charstore)
const {getdatalist1,getdatalist2} = charstore

// 确保商店初始化并正确访问
onBeforeMount(() => {
  const chartStore = useChartDataStore();
  const { templist1, templist2, humlist1, humlist2, timelist } = storeToRefs(chartStore);
  const { getdatalist1, getdatalist2 } = chartStore;

  // 现在在你的组件中使用这些
});

const wendu101 = templist1.value
const shidu101 = humlist1.value
const date1 = timelist.value

const wendu102 =templist2.value
const shidu102 = humlist2.value

const chartOption = ref({
  title: {
    text: '房间温湿度变化',
    left: 'center',
    textStyle: { color: '#edf3f8' }
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: '#6a7985'
      }
    },
    formatter: function (params) {
      let result = params[0].axisValue + '<br/>';
      params.forEach(item => {
        result += item.marker + ' ' + item.seriesName + ': ' +
          item.value + (item.seriesIndex % 2 === 0 ? ' °C' : ' %') + '<br/>';
      });
      return result;
    }
  },
  legend: {
    data: ['101温度', '101湿度', '102温度', '102湿度'],
    top: 30,
    textStyle: {
      color: '#c4d0da'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: date1,
    axisLine: {
      lineStyle: {
        color: '#999'
      }
    },
    axisLabel: {
      color: '#b4c0cb'
    }
  },
  yAxis: [
    {
      type: 'value',
      name: '温度 (°C)',
      position: 'left',
      axisLine: {
        show: true,
        lineStyle: {
          color: '#FF4500'
        }
      },
      axisLabel: {
        formatter: '{value} °C',
        color: '#b4c0cb'
      },
      splitLine: {
        lineStyle: {
          color: '#4b5661'
        }
      }
    },
    {
      type: 'value',
      name: '湿度 (%)',
      position: 'right',
      axisLine: {
        show: true,
        lineStyle: {
          color: '#4169E1'
        }
      },
      axisLabel: {
        formatter: '{value} %',
        color: '#7fb4ff'
      }
    }
  ],
  series: [
    {
      name: '101温度',
      type: 'line',
      yAxisIndex: 0,
      data: wendu101,
      smooth: true,
      symbolSize: 6,
      lineStyle: {
        width: 3
      }
    },
    {
      name: '101湿度',
      type: 'line',
      yAxisIndex: 1,
      data: shidu101,
      itemStyle: {
        color: '#4169E1'
      }
    },
    {
      name: '102温度',
      type: 'line',
      yAxisIndex: 0,
      data:wendu102 ,
      itemStyle: {
        color: '#FF6347'
      }
    },
    {
      name: '102湿度',
      type: 'line',
      yAxisIndex: 1,
      data:shidu102,
      itemStyle: {
        color: '#1E90FF'
      }
    }
  ],
  color: ['#FF4500', '#4169E1', '#FF6347', '#1E90FF']
});

// 添加周期性调用的逻辑
let intervalId;
onMounted(() => {
  getdatalist1(101);
  getdatalist2(102);
  intervalId = setInterval(() => {
    getdatalist1(101);
    getdatalist2(102);
    updateChart(); // 调用更新图表的函数
  }, 5000); // 每5秒更新一次数据
});

// 更新图表的函数
function updateChart() {
  // 限制数据点数量为5个
  const limitedTemplist1 = templist1.value.slice(-10);
  const limitedHumlist1 = humlist1.value.slice(-10);
  const limitedTemplist2 = templist2.value.slice(-10);
  const limitedHumlist2 = humlist2.value.slice(-10);
  const limitedTimelist = timelist.value.slice(-10); // 限制时间列表为最后5个

  chartOption.value = {
    ...chartOption.value,
    xAxis: {
      ...chartOption.value.xAxis,
      data: limitedTimelist // 更新x轴数据
    },
    series: [
      {
        name: '101温度',
        type: 'line',
        yAxisIndex: 0,
        data: limitedTemplist1,
        smooth: true,
        symbolSize: 6,
        lineStyle: {
          width: 3
        },
        animationDelay: (idx) => idx * 10,
        animationDuration: 1000
      },
      {
        name: '101湿度',
        type: 'line',
        yAxisIndex: 1,
        data: limitedHumlist1,
        itemStyle: {
          color: '#4169E1'
        },
        animationDelay: (idx) => idx * 10,
        animationDuration: 1000
      },
      {
        name: '102温度',
        type: 'line',
        yAxisIndex: 0,
        data: limitedTemplist2,
        itemStyle: {
          color: '#FF6347'
        },
        animationDelay: (idx) => idx * 10,
        animationDuration: 1000
      },
      {
        name: '102湿度',
        type: 'line',
        yAxisIndex: 1,
        data: limitedHumlist2,
        itemStyle: {
          color: '#1E90FF'
        },
        animationDelay: (idx) => idx * 10,
        animationDuration: 1000
      }
    ]
  };
}

onUnmounted(() => {
  clearInterval(intervalId); // 清除定时器，防止内存泄漏
  templist1.value =[]
  templist2.value = []
  humlist1.value = []
  humlist2.value = []
  timelist.value = []
});
</script>

<style scoped>
.chart-container {
  width: 100%;
  height: 400px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}
.chart {
  width: 100%;
  height: 80%;
}
</style>
