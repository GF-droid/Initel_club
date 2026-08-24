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

use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
]);

const chartStore = useChartDataStore();
const { templist1, templist2, humlist1, humlist2, timelist } = storeToRefs(chartStore);
const { getdatalist1, getdatalist2 } = chartStore;

onBeforeMount(() => {
  getdatalist1(116);
  getdatalist2(117);
});

const chartOption = ref({
  title: {
    text: '房间温湿度变化',
    left: 'center'
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
    data: ['116温度', '116湿度', '117温度', '117湿度'],
    top: 30,
    textStyle: {
      color: '#000000'
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
    data: timelist,
    axisLine: {
      lineStyle: {
        color: '#999'
      }
    },
    axisLabel: {
      color: '#666'
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
        color: '#666'
      },
      splitLine: {
        lineStyle: {
          color: '#eee'
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
        formatter: '{value} %'
      }
    }
  ],
  series: [
    {
      name: '116温度',
      type: 'line',
      yAxisIndex: 0,
      data: templist1,
      smooth: true,
      symbolSize: 6,
      lineStyle: {
        width: 3
      }
    },
    {
      name: '116湿度',
      type: 'line',
      yAxisIndex: 1,
      data: humlist1,
      itemStyle: {
        color: '#4169E1'
      }
    },
    {
      name: '117温度',
      type: 'line',
      yAxisIndex: 0,
      data: templist2,
      itemStyle: {
        color: '#FF6347'
      }
    },
    {
      name: '117湿度',
      type: 'line',
      yAxisIndex: 1,
      data: humlist2,
      itemStyle: {
        color: '#1E90FF'
      }
    }
  ],
  color: ['#FF4500', '#4169E1', '#FF6347', '#1E90FF']
});

let intervalId;
onMounted(() => {
  intervalId = setInterval(() => {
    getdatalist1(116);
    getdatalist2(117);
    updateChart(); // Ensure this function is defined or implement its logic here
  }, 5000); // Update data every 5 seconds
});

function updateChart() {
  // Limit data points to the last 10 entries
  const limitedTemplist1 = templist1.value.slice(-10);
  const limitedHumlist1 = humlist1.value.slice(-10);
  const limitedTemplist2 = templist2.value.slice(-10);
  const limitedHumlist2 = humlist2.value.slice(-10);
  const limitedTimelist = timelist.value.slice(-10);

  chartOption.value = {
    ...chartOption.value,
    xAxis: {
      ...chartOption.value.xAxis,
      data: limitedTimelist // Update x-axis data
    },
    series: [
      {
        name: '116温度',
        type: 'line',
        yAxisIndex: 0,
        data: limitedTemplist1,
        // Other series options...
      },
      {
        name: '116湿度',
        type: 'line',
        yAxisIndex: 1,
        data: limitedHumlist1,
        // Other series options...
      },
      {
        name: '117温度',
        type: 'line',
        yAxisIndex: 0,
        data: limitedTemplist2,
        // Other series options...
      },
      {
        name: '117湿度',
        type: 'line',
        yAxisIndex: 1,
        data: limitedHumlist2,
        // Other series options...
      }
    ]
  };
}

onUnmounted(() => {
  clearInterval(intervalId); // Clear interval to prevent memory leaks
  templist1.value = [];
  templist2.value = [];
  humlist1.value = [];
  humlist2.value = [];
  timelist.value = [];
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
