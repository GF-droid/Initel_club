export const ROOM_IDS = ['101', '102', '108', '109', '113', '115', '116', '117', '118', '119'] as const;

export type RoomId = (typeof ROOM_IDS)[number];

export function isRoomId(value: string): value is RoomId {
  return ROOM_IDS.includes(value as RoomId);
}
