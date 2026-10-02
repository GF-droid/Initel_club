import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from '@/store/SetAxios'

export type TemperatureMode = 'range' | 'target'
export interface RoomControlSettings {
  mode: TemperatureMode
  min: number
  max: number
  target: number
  smart: boolean
}

export interface AirConditioningRoom {
  id: string
  label: string
  paramId: number
}

export interface ControlAlert { roomId: string; message: string; since: string }

const MINIMUM_ON_TIME = 5 * 60 * 1000
const MINIMUM_OFF_TIME = 3 * 60 * 1000
const INEFFECTIVE_COOLING_TIME = 10 * 60 * 1000

const rooms: AirConditioningRoom[] = [
  { id: '101', label: '101 房间', paramId: 2 },
  { id: '102', label: '102 房间', paramId: 3 },
  { id: '108', label: '108 房间', paramId: 5 },
  { id: '109', label: '109 房间', paramId: 6 },
  { id: '113', label: '113 房间', paramId: 7 },
  { id: '115', label: '115 房间', paramId: 8 },
  { id: '116', label: '116 房间', paramId: 9 },
  { id: '117', label: '117 房间', paramId: 10 },
  { id: '118', label: '118 房间', paramId: 11 },
  { id: '119', label: '119 房间', paramId: 12 }
]

export const useAirConditioningStore = defineStore('airConditioning', () => {
  const selectedRoomId = ref('101')
  const temperatureMode = ref<TemperatureMode>('range')
  const minTemperature = ref(22)
  const maxTemperature = ref(26)
  const targetTemperature = ref(24)
  const smartEnabled = ref(false)
  const isSubmitting = ref(false)
  const pendingRoomActions = new Set<string>()
  const airStates = ref<Record<string, boolean>>({})
  const roomSettings = ref<Record<string, RoomControlSettings>>({})
  const controlAlerts = ref<Record<string, ControlAlert>>({})
  const runtime = new Map<string, { stateChangedAt?: number; coolingSince?: number; alertLogged?: boolean }>()

  const writeOperationLog = async (input: { action: string; roomId?: string; success: boolean; message?: string; details?: Record<string, unknown> }) => {
    try {
      await axios.post('/operation-logs', { operationType: 'air_conditioning', operator: 'system', ...input })
    } catch (error) {
      console.warn('Failed to write operation log', error)
    }
  }

  const selectedRoom = computed(() => rooms.find((room) => room.id === selectedRoomId.value) ?? rooms[0])
  const currentState = computed(() => Boolean(airStates.value[selectedRoomId.value]))
  const comfortSummary = computed(() => temperatureMode.value === 'range'
    ? `${minTemperature.value} - ${maxTemperature.value} deg C`
    : `${targetTemperature.value} deg C`)

  const setAirState = async (roomId: string, on: boolean, silent = false) => {
    const room = rooms.find((item) => item.id === roomId)
    if (!room) return

    if (pendingRoomActions.has(roomId)) return
    const currentState = Boolean(airStates.value[roomId])
    // 智能控制需要保持幂等，手动操作则允许重复发送相同的开关指令。
    if (silent && currentState === on) return
    // Minimum run and rest times protect only the automatic strategy.
    // Manual commands are explicit operator actions and must remain available.
    if (silent) {
      const roomRuntime = runtime.get(roomId) ?? {}
      const elapsed = roomRuntime.stateChangedAt ? Date.now() - roomRuntime.stateChangedAt : Number.POSITIVE_INFINITY
      if (currentState && !on && elapsed < MINIMUM_ON_TIME) return
      if (!currentState && on && elapsed < MINIMUM_OFF_TIME) return
    }
    pendingRoomActions.add(roomId)
    isSubmitting.value = true
    const previousState = Boolean(airStates.value[roomId])
    try {
      const settings = getRoomSettings(roomId)
      const target = settings.mode === 'range'
        ? Number(((settings.min + settings.max) / 2).toFixed(1))
        : Number(settings.target)
      const response = await axios.post<{ command?: { commandId?: string } }>(`/air-conditioners/${roomId}/commands`, {
        power: on,
        targetTemperature: target,
        mode: 'cool',
        source: silent ? 'smart' : 'manual',
        operator: 'admin'
      })
      const commandId = response.data?.command?.commandId
      if (!commandId) throw new Error('服务器未返回命令编号')
      const result = await waitForCommandResult(commandId)
      if (result.success === true && result.status === 'success') {
        airStates.value = { ...airStates.value, [roomId]: on }
        const changedAt = Date.now()
        runtime.set(roomId, { stateChangedAt: changedAt, coolingSince: on ? changedAt : undefined, alertLogged: false })
        if (!on) {
          const nextAlerts = { ...controlAlerts.value }
          delete nextAlerts[roomId]
          controlAlerts.value = nextAlerts
        }
        if (!silent) ElMessage.success(`${room.label} 空调指令执行成功`)
      } else {
        airStates.value = { ...airStates.value, [roomId]: previousState }
        if (!silent) ElMessage.error(`${room.label} 空调控制失败：${result.message || '设备未完成指令'}`)
      }
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : '请检查设备连接'
        ElMessage.error(`空调控制请求失败：${message}`)
      }
    } finally {
      pendingRoomActions.delete(roomId)
      isSubmitting.value = false
    }
  }

  const waitForCommandResult = async (commandId: string): Promise<{ status: string; success: boolean | null; message?: string }> => {
    const deadline = Date.now() + 15_000
    while (Date.now() < deadline) {
      const response = await axios.get<{ status: string; success: boolean | null; message?: string }>(`/air-conditioners/commands/${commandId}`)
      if (response.data.status !== 'pending') return response.data
      await new Promise((resolve) => window.setTimeout(resolve, 1000))
    }
    return { status: 'timeout', success: false, message: '等待设备响应超时' }
  }

  const writeControlAlert = async (roomId: string, message: string, since: number) => {
    const alert: ControlAlert = { roomId, message, since: new Date(since).toISOString() }
    controlAlerts.value = { ...controlAlerts.value, [roomId]: alert }
    await writeOperationLog({ action: '空调降温效果不足', roomId, success: false, message, details: { since: alert.since } })
  }

  const setSmartEnabled = async (enabled: boolean) => {
    if (enabled && temperatureMode.value === 'range' && minTemperature.value >= maxTemperature.value) {
      ElMessage.warning('温度下限必须小于上限')
      return false
    }
    smartEnabled.value = enabled
    await writeOperationLog({ action: enabled ? '启用智能控制' : '停用智能控制', roomId: selectedRoomId.value, success: true, message: '控制策略已更新', details: { mode: temperatureMode.value, min: minTemperature.value, max: maxTemperature.value, target: targetTemperature.value } })
    return true
  }

  const getRoomSettings = (roomId: string): RoomControlSettings => {
    if (!roomSettings.value[roomId]) {
      roomSettings.value[roomId] = { mode: 'range', min: 22, max: 26, target: 24, smart: false }
    }
    return roomSettings.value[roomId]
  }

  const evaluateRoomTemperature = async (roomId: string, temperature: number) => {
    const settings = getRoomSettings(roomId)
    if (!settings.smart || !Number.isFinite(temperature)) return
    const shouldCool = settings.mode === 'range' ? temperature > settings.max : temperature > settings.target + 0.5
    const shouldStop = settings.mode === 'range' ? temperature <= settings.min : temperature <= settings.target - 0.5
    if (shouldCool) await setAirState(roomId, true, true)
    if (shouldStop) await setAirState(roomId, false, true)
    const state = Boolean(airStates.value[roomId])
    const roomRuntime = runtime.get(roomId) ?? {}
    if (state && shouldCool) {
      const coolingSince = roomRuntime.coolingSince ?? Date.now()
      runtime.set(roomId, { ...roomRuntime, coolingSince })
      if (!roomRuntime.alertLogged && Date.now() - coolingSince >= INEFFECTIVE_COOLING_TIME) {
        runtime.set(roomId, { ...roomRuntime, coolingSince, alertLogged: true })
        await writeControlAlert(roomId, '空调运行后温度仍未达到设定范围，请检查设备或环境', coolingSince)
      }
    } else if (!shouldCool) {
      runtime.set(roomId, { ...roomRuntime, coolingSince: undefined, alertLogged: false })
      if (controlAlerts.value[roomId]) {
        const nextAlerts = { ...controlAlerts.value }
        delete nextAlerts[roomId]
        controlAlerts.value = nextAlerts
      }
    }
  }

  const evaluateTemperature = async (roomId: string, temperature: number) => {
    if (!smartEnabled.value || roomId !== selectedRoomId.value || !Number.isFinite(temperature)) return

    const shouldCool = temperatureMode.value === 'range'
      ? temperature > maxTemperature.value
      : temperature > targetTemperature.value + 0.5
    const shouldStop = temperatureMode.value === 'range'
      ? temperature <= minTemperature.value
      : temperature <= targetTemperature.value - 0.5

    if (shouldCool) await setAirState(roomId, true, true)
    if (shouldStop) await setAirState(roomId, false, true)
  }

  return {
    rooms,
    selectedRoomId,
    selectedRoom,
    temperatureMode,
    minTemperature,
    maxTemperature,
    targetTemperature,
    smartEnabled,
    isSubmitting,
    airStates,
    controlAlerts,
    roomSettings,
    currentState,
    comfortSummary,
    setAirState,
    setSmartEnabled,
    getRoomSettings,
    evaluateRoomTemperature,
    evaluateTemperature,
  }
})
