// import './assets/main.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import router from './router'
import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from "pinia";
import VueParticles from 'vue-particles'
import './vue-particles.d.ts'

// ECharts 相关导入
import ECharts from 'vue-echarts'
import { use } from "echarts/core"
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'

// 配置 ECharts
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

const app = createApp(App)
const pinia = createPinia()

// 注册 ECharts 组件
app.component('v-chart', ECharts)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus); // 确保 Element Plus 被正确使用
app.use(pinia)
app.use(VueParticles)
app.use(router)

// 移除这两行，因为我们已经全局注册了 ECharts 组件
// app.config.globalProperties.$echarts = echarts
// app.provide('$echarts', echarts)

app.mount('#app')
