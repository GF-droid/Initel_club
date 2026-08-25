<template>
  <div class="outbound-component">
    <h2>出库操作</h2>
    <el-form :model="form" label-width="120px">
      <el-form-item label="房间编号">
        <el-select
          v-model="form.roomNumber"
          filterable
          placeholder="请选择房间编号"
          popper-class="warehouse-select-popper"
          @focus="loadRooms"
          @change="fetchRoomItems"
        >
          <el-option
            v-for="item in roomOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="物品名称">
        <el-input
          v-model="selectedItemsDisplay"
          placeholder="点击选择物品"
          readonly
          @click="openSelectionDialog"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="onSubmit" :loading="submitting">提交</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 选择物品的对话框 -->
    <el-dialog v-model="showSelectionDialog" title="选择物品" width="50%">
      <el-loading :fullscreen="false" :body="true" v-if="loading" />
      <div v-else class="room-item">
        <h3>{{ getRoomLabel(form.roomNumber) }}</h3>
        <ul>
          <li v-for="item in getRoomItems(form.roomNumber)" :key="item.id">
            <el-radio 
              v-model="selectedItemId" 
              :label="item.id"
              @change="() => updateSelectedItem(item)"
            >
              {{ item.name }} (库存: {{ item.number }} {{ item.unity || '' }})
            </el-radio>
            <el-input-number 
              v-if="selectedItemId === item.id" 
              v-model="selectedQuantity" 
              :min="1" 
              :max="item.number"
              size="small"
              @change="updateSelectedQuantity"
            />
          </li>
        </ul>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSelectionDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmSelection">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/store/SetAxios'

const form = reactive({
  roomNumber: '',
  selectedItem: null
})

const roomOptions = ref([])
const roomItems = ref({})
const showSelectionDialog = ref(false)
const selectedItemId = ref(null)
const selectedQuantity = ref(1)
const loading = ref(false)
const submitting = ref(false)

// 计算属性：显示已选择的物品
const selectedItemsDisplay = computed(() => {
  if (form.selectedItem) {
    return `${form.selectedItem.name} (数量: ${form.selectedItem.quantity} ${form.selectedItem.unity || ''})`
  }
  return ''
})

// 自定义房间名称
const customRoomNames = [
  '101', '102', '108', '109', '113',
  '115', '116', '117', '118', '119'
]

// 加载房间选项
const loadRooms = () => {
  roomOptions.value = customRoomNames.map((name) => ({
    value: `data${name}`,
    label: `${name}房间`
  }))
}

// 从表名中提取房间号
const extractRoomNumber = (tableName) => {
  return tableName.replace('data', '')
}

// 获取选中房间的仓库物品数据
const fetchRoomItems = async () => {
  if (!form.roomNumber) return
  
  loading.value = true
  try {
    // 清空之前的物品数据
    roomItems.value = {}
    selectedItemId.value = null
    selectedQuantity.value = 1
    form.selectedItem = null
    
    console.log('🔍 获取房间物品，房间表名:', form.roomNumber)
    
    // 发送实际的 API 请求
    const roomId = extractRoomNumber(form.roomNumber)
    const response = await axios.get(`/inventory/rooms/${roomId}/items`)
    
    console.log('✅ 获取房间物品响应:', response.data)
    roomItems.value[form.roomNumber] = response.data.data
    
  } catch (error) {
    console.error('获取房间物品失败:', error)
    ElMessage.error('获取房间物品失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

const getRoomLabel = (roomValue) => {
  return roomOptions.value.find(option => option.value === roomValue)?.label || roomValue
}

const getRoomItems = (room) => {
  const items = roomItems.value[room] || [];
  // 过滤掉数量为0的物品
  return items.filter(item => item.number > 0);
}
const openSelectionDialog = () => {
  if (!form.roomNumber) {
    ElMessage.warning('请先选择房间')
    return
  }
  if (loading.value) {
    ElMessage.info('正在加载房间物品，请稍候')
    return
  }
  if (getRoomItems(form.roomNumber).length === 0) {
    ElMessage.warning('该房间暂无物品')
    return
  }
  showSelectionDialog.value = true
}

const updateSelectedItem = (item) => {
  selectedQuantity.value = 1
}

const updateSelectedQuantity = () => {
  const selectedItem = getRoomItems(form.roomNumber).find(item => item.id === selectedItemId.value)
  if (selectedItem && selectedQuantity.value > selectedItem.number) {
    selectedQuantity.value = selectedItem.number
    ElMessage.warning('数量不能超过库存数量')
  }
}

const confirmSelection = () => {
  const selectedItem = getRoomItems(form.roomNumber).find(item => item.id === selectedItemId.value)
  if (selectedItem && selectedQuantity.value > 0) {
    form.selectedItem = {
      id: selectedItem.id,
      roomNumber: form.roomNumber,
      name: selectedItem.name,
      quantity: selectedQuantity.value,
      unity: selectedItem.unity || ''
    }
    console.log('✅ 选择的物品:', form.selectedItem);
  } else {
    form.selectedItem = null
    ElMessage.warning('请选择有效的物品和数量')
  }
  showSelectionDialog.value = false
}

const onSubmit = async () => {
  console.log("🚀 开始出库提交")
  console.log("房间表名:", form.roomNumber)
  console.log("选择的物品:", form.selectedItem)

  if (!form.selectedItem) {
    ElMessage.warning('请选择物品')
    return
  }

  submitting.value = true
  try {
    // 准备发送给后端的数据 - 匹配后端期望的字段名
    const payload = {
      home: extractRoomNumber(form.roomNumber), // 房间号（如 101）
      name: form.selectedItem.name,             // 物品名称
      number: form.selectedItem.quantity,       // 出库数量
      unity: form.selectedItem.unity || '',     // 单位
      content: '出库操作'                       // 备注
    }

    console.log('📤 出库请求数据:', payload)
    console.log('🔗 请求URL:', '/inventory/outbound')

    // 🔴 修复：使用正确的出库API地址
    const response = await axios.post('/inventory/outbound', payload)

    console.log('✅ 出库响应:', response.data)

    if (response.data.success) {
      ElMessage.success('出库操作提交成功')
      console.log('🎉 出库成功')
      
      // 重置表单
      onReset()
    } else {
      throw new Error(response.data.message || '出库失败')
    }

  } catch (error) {
    console.error('❌ 出库操作失败:', error)
    console.error('❌ 错误详情:', error.response?.data)
    ElMessage.error('出库操作失败: ' + (error.response?.data?.message || error.message))
  } finally {
    submitting.value = false
  }
}

const onReset = () => {
  form.roomNumber = ''
  form.selectedItem = null
  roomItems.value = {}
  selectedItemId.value = null
  selectedQuantity.value = 1
}

// 初始化加载房间选项
loadRooms()
</script>

<style scoped>
.outbound-component {
  max-width: 960px;
  margin: 0 auto;
}

h2 {
  margin: 0 0 24px;
  padding-bottom: 18px;
  color: #edf3f8;
  font-size: 20px;
  font-weight: 600;
  border-bottom: 1px solid #414b55;
}

.outbound-component :deep(.el-form-item) {
  margin-bottom: 20px;
}

.outbound-component :deep(.el-form-item__label) {
  color: #c6d0d9;
}

.outbound-component :deep(.el-input),
.outbound-component :deep(.el-select) {
  width: 100%;
}

.outbound-component :deep(.el-input__wrapper) {
  background: #252a2f;
  box-shadow: 0 0 0 1px #4a5661 inset;
}

.outbound-component :deep(.el-select__wrapper) {
  background: #252a2f;
  box-shadow: 0 0 0 1px #4a5661 inset;
}

.outbound-component :deep(.el-input__inner) {
  color: #edf3f8;
}

.outbound-component :deep(.el-select__selected-item),
.outbound-component :deep(.el-select__placeholder) {
  color: #edf3f8;
}

.outbound-component :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}

.outbound-component :deep(.el-select__wrapper.is-focused) {
  box-shadow: 0 0 0 1px #409eff inset;
}

.outbound-component :deep(.el-button + .el-button) {
  margin-left: 10px;
}

.room-item {
  margin-bottom: 20px;
  color: #303133;
}

.room-item h3 {
  margin-bottom: 10px;
}

.room-item ul {
  list-style-type: none;
  padding: 0;
}

.room-item li {
  cursor: pointer;
  padding: 8px 0;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.room-item li .el-input-number {
  margin-left: 10px;
}

.el-loading {
  background-color: rgba(255, 255, 255, 0.8);
}
</style>
