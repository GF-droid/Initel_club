import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import axios from "@/store/SetAxios";
import { ElMessage } from 'element-plus'

interface FormState {
    home: string
    name: string
    number: number
    price: number
  unity: string
  content: string
}

interface Room {
  value: string
  label: string
}

export const useInboundStore = defineStore('inbound', () => {
  const form = reactive<FormState>({
    home: '',
    name: '',
    number: 1,
    price: 0,
    unity: '',
    content: ''
  })

  const rooms = ref<Room[]>([
    { value: '101', label: '101房间 ' },
    { value: '102', label: '102房间 ' },
    { value: '108', label: '108房间 ' },
    { value: '109', label: '109房间 ' },
    { value: '113', label: '113房间 ' },
    { value: '115', label: '115房间 ' },
    { value: '116', label: '116房间 ' },
    { value: '117', label: '117房间 ' },
    { value: '118', label: '118房间 ' },
    { value: '119', label: '119房间 ' },

    // ... 可以添加更多预设房间
  ])

  const submitting = ref(false)

  const onSubmit = async () => {
    submitting.value = true
    try {
      const response = await axios.post<{ success: boolean; message?: string }>('/inventory/inbound', form)
        console.log(response);
        
      if (response.status == 200) {
        ElMessage.success('入库操作提交成功')
        onReset() // 重置表单
      } else {
        ElMessage.error(response.data || '入库操作提交失败')
      }
    } catch (error) {
      console.error('入库操作提交错误:', error)
      ElMessage.error('入库操作提交失败，请稍后重试')
    } finally {
      submitting.value = false
    }
  }

  const onReset = () => {
    Object.assign(form, {
      home: '',
      name: '',
      number: 1,
      price: 0,
      unity: '',
      content: ''
    })
  }

  return {
    form,
    rooms,
    submitting,
    onSubmit,
    onReset
  }
})
