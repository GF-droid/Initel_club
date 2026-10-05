import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from '@/store/SetAxios'

export interface Sku {
  id: number
  skuCode: string | null
  name: string
  spec: string
  category: string | null
  unit: string | null
  barcode: string | null
  supplier: string | null
  safetyStock: number
  price: number
  status: number
  remark: string | null
  createdAt: string
  updatedAt: string
}

export interface SkuForm {
  name: string
  spec: string
  category: string
  unit: string
  barcode: string
  supplier: string
  safetyStock: number
  price: number
  remark: string
}

const emptyForm = (): SkuForm => ({
  name: '', spec: '', category: '', unit: '', barcode: '',
  supplier: '', safetyStock: 0, price: 0, remark: '',
})

/** 优先展示服务端返回的 message（NestJS 的错误信封），否则用兜底文案。 */
const serverMessage = (error: unknown, fallback: string) => {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (Array.isArray(message)) return message.join('；')
  if (typeof message === 'string' && message) return message
  return fallback
}

export const useSkuStore = defineStore('sku', () => {
  const rows = ref<Sku[]>([])
  const total = ref(0)
  const loading = ref(false)
  const saving = ref(false)
  const syncing = ref(false)

  const keyword = ref('')
  const category = ref('')
  const includeInactive = ref(false)
  const page = ref(1)
  const pageSize = ref(20)

  const dialogVisible = ref(false)
  const editingCode = ref<string | null>(null)
  const form = reactive<SkuForm>(emptyForm())

  const load = async () => {
    loading.value = true
    try {
      const response = await axios.get<{ success: boolean; data: Sku[]; total: number }>('/sku', {
        params: {
          ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {}),
          ...(category.value.trim() ? { category: category.value.trim() } : {}),
          // DTO 校验的是字符串，这里必须传 'true' 而不是布尔值
          ...(includeInactive.value ? { includeInactive: 'true' } : {}),
          limit: pageSize.value,
          offset: (page.value - 1) * pageSize.value,
        },
      })
      rows.value = Array.isArray(response.data?.data) ? response.data.data : []
      total.value = Number(response.data?.total ?? 0)
    } catch (error: unknown) {
      rows.value = []
      total.value = 0
      ElMessage.error(serverMessage(error, '物资档案加载失败'))
    } finally {
      loading.value = false
    }
  }

  const onSearch = () => {
    page.value = 1
    void load()
  }

  const onSizeChange = () => {
    page.value = 1
    void load()
  }

  const resetFilters = () => {
    keyword.value = ''
    category.value = ''
    includeInactive.value = false
    onSearch()
  }

  const openCreate = () => {
    editingCode.value = null
    Object.assign(form, emptyForm())
    dialogVisible.value = true
  }

  const openEdit = (row: Sku) => {
    editingCode.value = row.skuCode
    Object.assign(form, {
      name: row.name ?? '',
      spec: row.spec ?? '',
      category: row.category ?? '',
      unit: row.unit ?? '',
      barcode: row.barcode ?? '',
      supplier: row.supplier ?? '',
      safetyStock: Number(row.safetyStock ?? 0),
      price: Number(row.price ?? 0),
      remark: row.remark ?? '',
    })
    dialogVisible.value = true
  }

  const submit = async () => {
    if (!form.name.trim()) {
      ElMessage.warning('物资名称不能为空')
      return
    }

    saving.value = true
    try {
      const payload = {
        name: form.name.trim(),
        spec: form.spec.trim(),
        category: form.category.trim() || undefined,
        unit: form.unit.trim() || undefined,
        barcode: form.barcode.trim() || undefined,
        supplier: form.supplier.trim() || undefined,
        safetyStock: Number(form.safetyStock) || 0,
        price: Number(form.price) || 0,
        remark: form.remark.trim() || undefined,
      }

      if (editingCode.value) {
        await axios.patch(`/sku/${editingCode.value}`, payload)
        ElMessage.success('物资已更新')
      } else {
        await axios.post('/sku', payload)
        ElMessage.success('物资已建档')
      }

      dialogVisible.value = false
      await load()
    } catch (error: unknown) {
      ElMessage.error(serverMessage(error, '保存失败'))
    } finally {
      saving.value = false
    }
  }

  /** 停用而非删除：历史库存流水还要指回这条主数据。 */
  const deactivate = async (row: Sku) => {
    if (!row.skuCode) {
      ElMessage.warning('该物资还没有编码，无法停用')
      return
    }
    try {
      await ElMessageBox.confirm(
        `确认停用「${row.name}」？停用后不再出现在默认列表中，但已产生的库存流水仍然指向它。`,
        '确认停用',
        { confirmButtonText: '确认停用', cancelButtonText: '取消', type: 'warning' },
      )
    } catch {
      return
    }

    try {
      await axios.delete(`/sku/${row.skuCode}`)
      ElMessage.success('已停用')
      await load()
    } catch (error: unknown) {
      ElMessage.error(serverMessage(error, '停用失败'))
    }
  }

  /** 把现有库存表里出现过的物资一次性录进主数据，并回填库存行的 sku_code。 */
  const syncFromInventory = async () => {
    syncing.value = true
    try {
      const response = await axios.post<{
        success: boolean
        data?: { processed?: number; created?: number; linked?: number; skippedRooms?: string[] }
      }>('/sku/sync')
      const data = response.data?.data ?? {}
      ElMessage.success(
        `同步完成：处理 ${data.processed ?? 0} 条，新建 ${data.created ?? 0} 个物资，回填 ${data.linked ?? 0} 条库存关联`,
      )
      if (data.skippedRooms?.length) {
        ElMessage.warning(`跳过 ${data.skippedRooms.length} 个没有库存表的房间：${data.skippedRooms.join('、')}`)
      }
      await load()
    } catch (error: unknown) {
      ElMessage.error(serverMessage(error, '同步失败'))
    } finally {
      syncing.value = false
    }
  }

  return {
    rows, total, loading, saving, syncing,
    keyword, category, includeInactive, page, pageSize,
    dialogVisible, editingCode, form,
    load, onSearch, onSizeChange, resetFilters,
    openCreate, openEdit, submit, deactivate, syncFromInventory,
  }
})
