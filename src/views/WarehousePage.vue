<template>
  <div class="warehouse-management">
    <h1>出入库管理系统</h1>
    
    <el-tabs v-model="activeTab" class="demo-tabs">
      <el-tab-pane label="入库" name="inbound">
        <InboundComponent v-if="activeTab === 'inbound'" />
      </el-tab-pane>
      <el-tab-pane label="出库" name="outbound">
        <OutboundComponent v-if="activeTab === 'outbound'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElTabs, ElTabPane } from 'element-plus'
import InboundComponent from '@/components/warehouse/InboundComponent.vue'
import OutboundComponent from '@/components/warehouse/OutboundComponent.vue'

const activeTab = ref('inbound')
</script>

<style scoped>
.warehouse-management {
  width: 100%;
  height: 100vh;
  padding: 20px;
  box-sizing: border-box;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  flex-direction: column;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 2.5em;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.demo-tabs {
  margin-top: 20px;
}

:deep(.el-tabs__nav-wrap) {
  padding: 0 20px;
}

:deep(.el-tabs__item) {
  font-size: 20px;
  padding: 0 40px;
  transition: all 0.3s ease;
}

:deep(.el-tabs__item:hover) {
  color: #409EFF;
  transform: translateY(-2px);
}

:deep(.el-tabs__item.is-active) {
  font-weight: bold;
  color: #409EFF;
}
</style>
