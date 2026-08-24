<template>
  <div class="inventory-search">
    <div class="title-area">
      <h1>仓库物品搜索系统</h1>
      <p>高效管理，精准查询</p>
    </div>

    <el-card class="search-area" :body-style="{ padding: '20px' }">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="名称">
          <el-input v-model="searchForm.name" placeholder="输入物品名称" />
        </el-form-item>
        <el-form-item label="房间号">
          <el-input v-model="searchForm.roomNumber" placeholder="输入房间号" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="输入关键词" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch" :icon="Search">查询</el-button>
          <el-button @click="resetSearch" :icon="Refresh">重置</el-button>
          <el-button type="success" @click="exportToExcel" :icon="Download" :disabled="tableData.length === 0">
            导出Excel
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-area" :body-style="{ padding: '0px' }">
      <div class="table-header">
        <div class="header-left">
          <h2>搜索结果</h2>
          <el-tag :type="getTagType(tableData.length)">共 {{ tableData.length }} 条记录</el-tag>
        </div>
        <div class="header-right">
          <el-button-group>
            <el-button size="small" @click="exportCurrentPage" :icon="Document" :disabled="tableData.length === 0">
              导出当前页
            </el-button>
            <el-button size="small" @click="exportAllData" :icon="Files" :disabled="allData.length === 0">
              导出全部
            </el-button>
          </el-button-group>
        </div>
      </div>
      <el-table v-loading="loading" :data="tableData" style="width: 100%"
        :header-cell-style="{ background: '#f5f7fa', color: '#606266' }" border stripe height="calc(100vh - 320px)"
        ref="tableRef">
        <el-table-column prop="roomName" label="房间名" width="120" />
        <el-table-column prop="name" label="物品名称" width="150" />
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column prop="quantity" label="数量" width="100" align="right" />
        <el-table-column prop="unitPrice" label="单价" width="100" align="right">
          <template #default="scope">
            {{ formatPrice(scope.row.unitPrice) }}
          </template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="100" align="right">
          <template #default="scope">
            {{ formatPrice(calculateTotal(scope.row)) }}
          </template>
        </el-table-column>
        <el-table-column prop="notes" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column prop="updateTime" label="出库时间" width="180" align="center">
          <template #default="scope">
            {{ scope.row.updateTime || '暂未出库' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="viewDetails(scope.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 导出设置对话框 -->
    <el-dialog v-model="exportDialogVisible" title="导出设置" width="30%">
      <el-form>
        <el-form-item label="文件名">
          <el-input v-model="exportFileName" placeholder="请输入文件名">
            <template #append>.xlsx</template>
          </el-input>
        </el-form-item>
        <el-form-item label="导出范围">
          <el-radio-group v-model="exportRange">
            <el-radio label="current">当前搜索结果</el-radio>
            <el-radio label="all">全部数据</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="包含字段">
          <el-checkbox-group v-model="exportFields">
            <el-checkbox label="roomName">房间名</el-checkbox>
            <el-checkbox label="name">物品名称</el-checkbox>
            <el-checkbox label="unit">单位</el-checkbox>
            <el-checkbox label="quantity">数量</el-checkbox>
            <el-checkbox label="unitPrice">单价</el-checkbox>
            <el-checkbox label="totalAmount">总金额</el-checkbox>
            <el-checkbox label="notes">备注</el-checkbox>
            <el-checkbox label="updateTime">出库时间</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="exportDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmExport">确认导出</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" title="物品详情" width="50%">
      <el-descriptions :column="2" border>
        <el-descriptions-item v-for="(value, key) in currentItem" :key="key" :label="getLabel(key)">
          {{ formatDetailValue(key, value) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Search, Refresh, Download, Document, Files } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from '@/store/SetAxios'
import * as XLSX from 'xlsx'

const searchForm = reactive({
  name: '',
  roomNumber: '',
  keyword: ''
})

const tableData = ref([])
const allData = ref([]) // 存储全部原始数据
const loading = ref(false)
const tableRef = ref(null)

// 导出相关
const exportDialogVisible = ref(false)
const exportFileName = ref('物品信息导出')
const exportRange = ref('current')
const exportFields = ref(['roomName', 'name', 'unit', 'quantity', 'unitPrice', 'totalAmount', 'notes', 'updateTime'])

// 获取所有物品数据
const fetchItemsFromServer = async () => {
  loading.value = true
  try {
    console.log('开始获取数据...')
    const response = await axios.get('/all')
    console.log('后端返回的数据:', response.data)

    // 直接使用后端返回的字段名
    allData.value = response.data
    tableData.value = response.data

    ElMessage.success(`成功加载 ${response.data.length} 条记录`)
  } catch (error) {
    console.error('加载失败:', error)
    ElMessage.error('加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const onSearch = async () => {
  loading.value = true
  try {
    // 先从服务器获取最新的数据
    await fetchItemsFromServer();

    // 使用正确的字段名进行过滤
    const nameKeyword = searchForm.name.toLowerCase();
    const roomNumberKeyword = searchForm.roomNumber.toLowerCase();
    const keyword = searchForm.keyword.toLowerCase();

    console.log('搜索条件:', { nameKeyword, roomNumberKeyword, keyword })

    const filteredData = allData.value.filter(item => {
      const matchName = !nameKeyword || item.name?.toLowerCase().includes(nameKeyword);
      const matchRoom = !roomNumberKeyword || item.home?.toLowerCase().includes(roomNumberKeyword);
      const matchKeyword = !keyword ||
        item.name?.toLowerCase().includes(keyword) ||
        item.notes?.toLowerCase().includes(keyword);

      return matchName && matchRoom && matchKeyword;
    });

    tableData.value = filteredData;

    if (filteredData.length === 0) {
      ElMessage.info('没有找到匹配的结果');
    } else {
      ElMessage.success(`查询成功，共找到 ${filteredData.length} 条记录`);
    }
  } catch (error) {
    console.error('查询失败:', error);
    ElMessage.error('查询失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

const resetSearch = () => {
  searchForm.name = ''
  searchForm.roomNumber = ''
  searchForm.keyword = ''
  tableData.value = [...allData.value] // 恢复所有数据
  ElMessage.success('已重置所有筛选条件')
}

// 计算总金额
const calculateTotal = (row) => {
  return (row.quantity || 0) * (row.unitPrice || 0)
}

// 格式化价格
const formatPrice = (price) => {
  if (price === undefined || price === null) return '¥0.00'
  return `¥${Number(price).toFixed(2)}`
}

// 格式化详情中的值
const formatDetailValue = (key, value) => {
  if (key === 'unitPrice' || key === 'totalAmount') {
    return formatPrice(value)
  }
  if (value === null || value === undefined) {
    return '-'
  }
  return value
}

// 导出Excel主函数
const exportToExcel = () => {
  exportDialogVisible.value = true
}

// 导出当前页
const exportCurrentPage = () => {
  exportRange.value = 'current'
  exportDialogVisible.value = true
}

// 导出全部
const exportAllData = () => {
  exportRange.value = 'all'
  exportDialogVisible.value = true
}

// 确认导出
const confirmExport = () => {
  exportDialogVisible.value = false

  // 确定导出的数据源
  const sourceData = exportRange.value === 'current' ? tableData.value : allData.value

  if (sourceData.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }

  // 准备导出数据
  const exportData = sourceData.map(item => {
    const row = {}
    exportFields.value.forEach(field => {
      switch (field) {
        case 'roomName':
          row['房间名'] = item.roomName || '-'
          break
        case 'name':
          row['物品名称'] = item.name || '-'
          break
        case 'unit':
          row['单位'] = item.unit || '-'
          break
        case 'quantity':
          row['数量'] = item.quantity || 0
          break
        case 'unitPrice':
          row['单价'] = item.unitPrice ? `¥${item.unitPrice.toFixed(2)}` : '¥0.00'
          break
        case 'totalAmount':
          row['总金额'] = formatPrice(calculateTotal(item))
          break
        case 'notes':
          row['备注'] = item.notes || '-'
          break
        case 'updateTime':
          row['出库时间'] = item.updateTime || '暂未出库'
          break
      }
    })
    return row
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()

  // 添加工作表标题
  const titleRow = [{
    '导出时间': `导出时间：${new Date().toLocaleString()}`,
    '记录数量': `共 ${exportData.length} 条记录`,
    '搜索条件': `名称:${searchForm.name || '全部'} 房间:${searchForm.roomNumber || '全部'} 关键词:${searchForm.keyword || '全部'}`
  }]

  // 创建标题工作表（如果需要单独标题页）
  // 这里我们直接在数据上方添加标题信息

  // 创建数据工作表
  const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: false })

  // 设置列宽
  const colWidths = [
    { wch: 12 }, // 房间名
    { wch: 20 }, // 物品名称
    { wch: 8 },  // 单位
    { wch: 10 }, // 数量
    { wch: 12 }, // 单价
    { wch: 12 }, // 总金额
    { wch: 30 }, // 备注
    { wch: 20 }  // 出库时间
  ]
  ws['!cols'] = colWidths

  // 将工作表添加到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '物品信息')

  // 添加汇总信息表（可选）
  const summaryData = [
    ['汇总信息'],
    ['导出时间', new Date().toLocaleString()],
    ['数据总数', exportData.length],
    ['导出范围', exportRange.value === 'current' ? '当前搜索结果' : '全部数据'],
    ['搜索条件', `名称:${searchForm.name || '全部'}`],
    ['', `房间号:${searchForm.roomNumber || '全部'}`],
    ['', `关键词:${searchForm.keyword || '全部'}`]
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, wsSummary, '导出信息')

  // 生成文件名
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const filename = `${exportFileName.value || '物品信息导出'}_${timestamp}.xlsx`

  // 导出文件
  XLSX.writeFile(wb, filename)

  ElMessage.success(`成功导出 ${exportData.length} 条记录`)
}

// 组件挂载时加载所有物品
onMounted(() => {
  fetchItemsFromServer()
})

const dialogVisible = ref(false)
const currentItem = ref({})

const viewDetails = (row) => {
  currentItem.value = row
  dialogVisible.value = true
}

const getLabel = (key) => {
  const labels = {
    roomName: '房间名',
    name: '物品名称',
    unit: '单位',
    quantity: '数量',
    unitPrice: '单价',
    totalAmount: '总金额',
    notes: '备注',
    updateTime: '更新时间',
    home: '房间号'
  }
  return labels[key] || key
}

const getTagType = computed(() => (count) => {
  if (count === 0) return 'danger'
  if (count < 5) return 'warning'
  return 'success'
})
</script>

<style scoped>
.inventory-search {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
  box-sizing: border-box;
  background-color: #f0f2f5;
}

.title-area {
  text-align: center;
  padding: 20px;
  margin-bottom: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  color: white;
}

.title-area h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.title-area p {
  margin: 10px 0 0;
  font-size: 16px;
  opacity: 0.8;
}

.search-area {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.search-form .el-form-item {
  margin-bottom: 0;
  margin-right: 0;
}

.table-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.table-area :deep(.el-card__body) {
  height: 100%;
  padding: 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 10px;
}

.el-dialog :deep(.el-descriptions) {
  margin-top: 20px;
}

.el-dialog :deep(.el-descriptions__label) {
  width: 120px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

:deep(.el-checkbox) {
  width: calc(25% - 10px);
  margin-right: 0;
}
</style>