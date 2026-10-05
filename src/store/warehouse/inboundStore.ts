import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import axios from "@/store/SetAxios";
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import { apiErrorMessage } from '@/store/apiError'

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

/** One parsed spreadsheet row, plus the problems that keep it out of the import. */
export interface ImportRow {
  index: number
  home: string
  name: string
  number: number | null
  price: number
  unity: string
  content: string
  errors: string[]
}

type ValidImportRow = ImportRow & { number: number }

const asValidRow = (row: ImportRow): row is ValidImportRow => row.errors.length === 0 && row.number !== null

/** Accepted spreadsheet headers, matched case-insensitively after stripping spaces and punctuation. */
const HEADER_ALIASES: Record<string, string[]> = {
  home: ['房间编号', '房间', '房间号', 'home', 'room', 'roomid'],
  name: ['物品名称', '名称', '物品', 'name', 'item'],
  number: ['数量', 'number', 'qty', 'quantity'],
  price: ['单价', '价格', 'price'],
  unity: ['单位', 'unity', 'unit'],
  content: ['备注', '说明', 'content', 'remark', 'note'],
}

const normalizeHeader = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[\s_\-()（）]/g, '')

const HEADER_LOOKUP = new Map<string, string>()
for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
  for (const alias of aliases) HEADER_LOOKUP.set(normalizeHeader(alias), field)
}

const MAX_IMPORT_ROWS = 1000

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

  // Excel 导入状态
  const importVisible = ref(false)
  const importFileName = ref('')
  const importRows = ref<ImportRow[]>([])
  const importError = ref('')
  const parsing = ref(false)
  const importing = ref(false)

  const validImportRows = computed(() => importRows.value.filter(asValidRow))
  const invalidImportRows = computed(() => importRows.value.filter((row) => !asValidRow(row)))

  const onSubmit = async () => {
    // 先在前端拦掉最常见的两个空值，免得白跑一趟后端拿回 400
    if (!form.home) {
      ElMessage.warning('请先选择房间编号')
      return
    }
    if (!form.name.trim()) {
      ElMessage.warning('请填写物品名称')
      return
    }

    submitting.value = true
    try {
      await axios.post('/inventory/inbound', form)
      // 不要再判断 response.status === 200：
      //   · axios 对任何非 2xx 响应都会直接抛异常，能走到这里就代表成功；
      //   · 后端 @Post 默认返回 201 Created（不是 200），
      //     之前按 200 判断会把成功当成失败，弹出服务端的 "Inbound completed"。
      ElMessage.success('入库操作提交成功')
      onReset() // 重置表单
    } catch (error) {
      console.error('入库操作提交错误:', error)
      // 显示服务端返回的真实原因（例如"home must be one of the following values..."），
      // 否则用户只看到一句笼统的提示，无法知道是哪个字段有问题。
      ElMessage.error(apiErrorMessage(error, '入库操作提交失败，请稍后重试'))
    } finally {
      submitting.value = false
    }
  }

  // ------------------------------------------------------------ Excel 快速入库

  const openImportDialog = () => {
    importRows.value = []
    importFileName.value = ''
    importError.value = ''
    importVisible.value = true
  }

  const closeImportDialog = () => {
    importVisible.value = false
    importRows.value = []
    importFileName.value = ''
    importError.value = ''
  }

  /** Maps raw spreadsheet records onto ImportRow objects and validates each one. */
  const buildImportRows = (source: Record<string, unknown>[]) => {
    const rows: ImportRow[] = []

    source.forEach((raw, position) => {
      let home = ''
      let name = ''
      let unity = ''
      let content = ''
      let numberText = ''
      let priceText = ''

      for (const [key, value] of Object.entries(raw)) {
        const field = HEADER_LOOKUP.get(normalizeHeader(key))
        if (!field) continue
        const text = String(value ?? '').trim()
        if (field === 'home') home = text
        else if (field === 'name') name = text
        else if (field === 'unity') unity = text
        else if (field === 'content') content = text
        else if (field === 'number') numberText = text
        else if (field === 'price') priceText = text
      }

      // Spreadsheets are commonly padded with blank rows; ignore them silently.
      if (!home && !name && !numberText && !priceText && !unity && !content) return

      const errors: string[] = []
      // A row without its own room falls back to the room chosen in the form.
      const resolvedHome = home || form.home
      if (!resolvedHome) errors.push('缺少房间编号')
      else if (!rooms.value.some((room) => room.value === resolvedHome)) errors.push(`房间编号「${resolvedHome}」不在可选范围内`)
      if (!name) errors.push('缺少物品名称')

      let number: number | null = null
      if (!numberText) errors.push('缺少数量')
      else {
        const parsed = Number(numberText)
        if (Number.isFinite(parsed)) number = parsed
        else errors.push('数量不是有效数字')
      }
      if (number !== null && number <= 0) errors.push('数量必须大于 0')

      let price = 0
      if (priceText) {
        const parsed = Number(priceText)
        if (Number.isFinite(parsed)) price = parsed
        else errors.push('单价不是有效数字')
      }
      if (price < 0) errors.push('单价不能为负数')

      // `position + 2` matches the row number the user sees in the spreadsheet.
      rows.push({ index: position + 2, home: resolvedHome, name, number, price, unity, content, errors })
    })

    return rows
  }

  const parseImportFile = async (file?: File) => {
    if (!file) return
    parsing.value = true
    importError.value = ''
    importRows.value = []
    importFileName.value = file.name

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) {
        importError.value = '文件中没有可读取的工作表'
        return
      }

      const source = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '', raw: true })
      if (!source.length) {
        importError.value = '工作表为空：请确认第一行是表头，且至少有一行数据'
        return
      }

      const rows = buildImportRows(source)
      if (!rows.length) {
        importError.value = '未识别到有效数据，请点击「下载模板」按标准表头填写'
        return
      }

      importRows.value = rows.slice(0, MAX_IMPORT_ROWS)
      if (rows.length > MAX_IMPORT_ROWS) importError.value = `文件共 ${rows.length} 行，本次仅载入前 ${MAX_IMPORT_ROWS} 行，请拆分后分批导入`
    } catch (error) {
      console.error('Excel 解析失败:', error)
      importError.value = '文件解析失败，请确认文件为 .xlsx 或 .xls 格式且未损坏'
    } finally {
      parsing.value = false
    }
  }

  const downloadTemplate = () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ['房间编号', '物品名称', '数量', '单价', '单位', '备注'],
      ['101', '打印纸', 20, 25.5, '箱', 'A4 规格'],
      ['101', '签字笔', 100, 3.5, '支', ''],
    ])
    sheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 24 }]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, '入库明细')
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['可选房间编号'], ...rooms.value.map((room) => [room.value])]), '房间编号')
    XLSX.writeFile(workbook, '入库导入模板.xlsx')
  }

  const removeImportRow = (index: number) => {
    importRows.value = importRows.value.filter((row) => row.index !== index)
  }

  const submitImport = async () => {
    const rows = validImportRows.value
    if (!rows.length) {
      ElMessage.warning('没有通过校验的数据行，请修正后再导入')
      return
    }

    importing.value = true
    try {
      const response = await axios.post<{ success: boolean; data?: { inserted?: number } }>('/inventory/inbound/batch', {
        items: rows.map((row) => ({
          home: row.home,
          name: row.name,
          number: row.number,
          price: row.price,
          ...(row.unity ? { unity: row.unity } : {}),
          ...(row.content ? { content: row.content } : {}),
        })),
      })

      const inserted = response.data?.data?.inserted ?? rows.length
      const skipped = invalidImportRows.value.length
      ElMessage.success(skipped ? `成功入库 ${inserted} 条，已跳过 ${skipped} 条异常数据` : `成功入库 ${inserted} 条`)
      closeImportDialog()
    } catch (error: any) {
      console.error('批量入库失败:', error)
      const serverMessage = error?.response?.data?.message
      ElMessage.error(
        Array.isArray(serverMessage)
          ? `数据校验未通过：${serverMessage.join('；')}`
          : typeof serverMessage === 'string' && serverMessage
            ? serverMessage
            : '批量入库失败，请检查数据后重试',
      )
    } finally {
      importing.value = false
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
    onReset,
    importVisible,
    importFileName,
    importRows,
    importError,
    parsing,
    importing,
    validImportRows,
    invalidImportRows,
    openImportDialog,
    closeImportDialog,
    parseImportFile,
    downloadTemplate,
    removeImportRow,
    submitImport
  }
})
