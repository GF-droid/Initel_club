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
    pendingRoomActions.add(roomId)
    isSubmitting.value = true
    try {
      const settings = getRoomSettings(roomId)
      const target = roomId === selectedRoomId.value
        ? temperatureMode.value === 'range' ? Number(((minTemperature.value + maxTemperature.value) / 2).toFixed(1)) : targetTemperature.value
        : settings.mode === 'range' ? Number(((settings.min + settings.max) / 2).toFixed(1)) : settings.target
      await axios.post(`/air-conditioners/${roomId}/commands`, {
        power: on,
        targetTemperature: target,
        mode: 'cool',
        source: silent ? 'smart' : 'manual',
        operator: 'admin'
      })
      airStates.value = { ...airStates.value, [roomId]: on }
      if (!silent) ElMessage.success(`${room.label} 控制指令已下发，等待设备回执`)
    } catch {
      if (!silent) ElMessage.error('空调控制请求失败，请检查设备连接')
    } finally {
      pendingRoomActions.delete(roomId)
      isSubmitting.value = false
    }
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
    roomSettings,
    currentState,
    comfortSummary,
    setAirState,
    setSmartEnabled,
    getRoomSettings,
    evaluateRoomTemperature,
    evaluateTemperature
  }
})
