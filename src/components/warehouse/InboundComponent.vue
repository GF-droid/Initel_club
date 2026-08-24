<template>
  <div class="inbound-component">
    <h2>入库操作</h2>
    <el-form :model="form" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="房间编号">
            <el-select
              v-model="form.home"
              filterable
              allow-create
              default-first-option
              placeholder="请选择或输入房间编号"
            >
              <el-option
                v-for="room in rooms"
                :key="room.value"
                :label="room.label"
                :value="room.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="物品名称">
            <el-input v-model="form.name" placeholder="请输入物品名称" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="数量">
            <el-input-number v-model="form.number" :min="1" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="单价">
            <el-input-number v-model="form.price" :min="0" :precision="2" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="单位">
            <el-input v-model="form.unity" placeholder="请输入单位" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="备注">
        <el-input v-model="form.content" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>
      <el-form-item class="button-group">
        <el-button type="primary" @click="onSubmit" :loading="submitting">入库</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>

    </el-form>
  </div>
</template>

<script lang="ts" setup>
import { useInboundStore } from '@/store/warehouse/inboundStore'
import { storeToRefs } from 'pinia'
import * as XLSX from 'xlsx'

const inboundStore = useInboundStore()

// 使用 storeToRefs 来保持响应性
const { form, rooms, submitting } = storeToRefs(inboundStore)
const { onSubmit, onReset } = inboundStore
</script>

<style scoped>
.inbound-component {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.el-form {
  font-size: 16px;
}

.el-form-item {
  margin-bottom: 25px;
}

.el-input, .el-input-number, .el-select {
  width: 100%;
}

.el-input__inner, .el-input-number__decrease, .el-input-number__increase {
  height: 40px;
  line-height: 40px;
}

.el-textarea__inner {
  font-size: 16px;
}

.button-group {
  text-align: center;
  margin-top: 30px;
}

.el-button {
  padding: 12px 20px;
}
</style>
