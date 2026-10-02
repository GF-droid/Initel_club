import { defineStore } from 'pinia';
import { AxiosError } from "axios";
import axios from "@/store/SetAxios";
import { ElMessage } from 'element-plus';
import { ref, type Ref } from 'vue';

interface DataItem {
    roomId?: string;
    wendu: number;
    shidu: number;
    time: string;
}

export const useDataStore = defineStore('data', {
    state: () => ({
        temp1: 0, hum1: 0, templist1: [] as number[], humlist1: [] as number[],
        temp2: 0, hum2: 0, templist2: [] as number[], humlist2: [] as number[],
        temp3: 0, hum3: 0, templist3: [] as number[], humlist3: [] as number[],
        temp4: 0, hum4: 0, templist4: [] as number[], humlist4: [] as number[],
        temp5: 0, hum5: 0, templist5: [] as number[], humlist5: [] as number[],
        temp6: 0, hum6: 0, templist6: [] as number[], humlist6: [] as number[],
        temp7: 0, hum7: 0, templist7: [] as number[], humlist7: [] as number[],
        temp8: 0, hum8: 0, templist8: [] as number[], humlist8: [] as number[],
        temp9: 0, hum9: 0, templist9: [] as number[], humlist9: [] as number[],
        temp10: 0, hum10: 0, templist10: [] as number[], humlist10: [] as number[],
        time1: [] as string[], time2: [] as string[], time3: [] as string[],
        time4: [] as string[], time5: [] as string[], time6: [] as string[],
        time7: [] as string[], time8: [] as string[], time9: [] as string[],
        time10: [] as string[],
        smokeStates: {} as Record<string, { alarm: boolean; message: string; updatedAt?: string }>,
        dataUpdateTrigger: ref(0) as Ref<number>,
    }),
    actions: {
        async getSmokeStatuses() {
            try {
                const response = await axios.get<{ success: boolean; data: Array<{ roomId: string; alarm: boolean; message: string; updatedAt?: string }> }>('/sensors/smoke');
                if (response.data?.success && Array.isArray(response.data.data)) {
                    this.smokeStates = Object.fromEntries(response.data.data.map((item) => [item.roomId, { alarm: item.alarm, message: item.message, updatedAt: item.updatedAt }]));
                }
            } catch (error) {
                console.warn('获取烟雾报警状态失败', error);
            }
        },

        // 修复 getData1 方法中的错误
        async getData1(roomid: any) {
            try {
                console.log('开始获取房间数据:', roomid);

                // 第一个房间数据
                const response1 = await axios.get<DataItem[]>(`/telemetry/rooms/${roomid[0]}`, {
                    timeout: 10000,
                });
                console.log(`房间 ${roomid[0]} 数据:`, response1.data);

                this.templist1 = [];
                this.humlist1 = [];
                this.time1 = [];

                response1.data.forEach((item: DataItem) => {
                    this.templist1.push(item.wendu);
                    this.humlist1.push(item.shidu);
                    this.time1.push(item.time);
                });

                if (response1.data.length > 0) {
                    const lastItem = response1.data[response1.data.length - 1];
                    this.temp1 = lastItem.wendu;
                    this.hum1 = lastItem.shidu;
                }

                // 第二个房间数据 - 修复了这里的错误
                const response2 = await axios.get<DataItem[]>(`/telemetry/rooms/${roomid[1]}`, {
                    timeout: 10000,
                });
                console.log(`房间 ${roomid[1]} 数据:`, response2.data);

                this.templist2 = [];
                this.humlist2 = [];
                this.time2 = [];

                response2.data.forEach((item: DataItem) => {
                    this.templist2.push(item.wendu);  // 修正：应该是 templist2
                    this.humlist2.push(item.shidu);   // 修正：应该是 humlist2
                    this.time2.push(item.time);       // 修正：应该是 time2
                });

                if (response2.data.length > 0) {
                    const lastItem2 = response2.data[response2.data.length - 1];
                    this.temp2 = lastItem2.wendu;     // 修正：应该是 temp2
                    this.hum2 = lastItem2.shidu;      // 修正：应该是 hum2
                }

                this.dataUpdateTrigger++;
                console.log('getData1 完成');

            } catch (error) {
                console.error("获取数据1失败:", error);
                if (error instanceof AxiosError) {
                    console.error("Axios 错误详情:", {
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        data: error.response?.data,
                        message: error.message
                    });
                    if (error.response?.status === 500) {
                        ElMessage.error('服务器内部错误，请联系管理员');
                    } else {
                        ElMessage.error(`获取数据失败: ${error.message}`);
                    }
                } else {
                    ElMessage.error('获取数据时发生未知错误');
                }
            }
        },

        // 改进的 getalldata 方法
        async getalldata() {
            try {
                console.log('🔄 开始获取全部数据...');

                const response = await axios.get<any>("/telemetry/rooms", {
                    timeout: 10000,
                    withCredentials: false
                });

                console.log('📥 收到原始响应:', response);
                console.log('📊 响应数据详情:', JSON.stringify(response.data, null, 2));

                // 详细检查每个数据项
                const payload = Array.isArray(response.data) ? response.data : response.data?.data;
                if (Array.isArray(payload)) {
                    console.log(`✅ 成功接收 ${payload.length} 条数据`);

                    payload.forEach((item, index) => {
                        console.log(`🔍 房间 ${index + 1} 原始数据:`, {
                            wendu: item.wendu,
                            shidu: item.shidu,
                            time: item.time,
                            wendu类型: typeof item.wendu,
                            shidu类型: typeof item.shidu
                        });
                    });

                    const roomIds = ['101', '102', '108', '109', '113', '115', '116', '117', '118', '119'];
                    const hasRoomIds = payload.some((item) => item && item.roomId !== undefined);
                    const roomCount = Math.min(payload.length, 10);

                    for (let i = 0; i < roomCount; i++) {
                        const dataItem = payload.find((item) => String(item?.roomId ?? '') === roomIds[i]) ?? (hasRoomIds ? undefined : payload[i]);
                        if (dataItem && typeof dataItem === 'object') {
                            // 更安全的数据转换
                            const tempValue = Number(dataItem.wendu);
                            const humValue = Number(dataItem.shidu);

                            (this as any)[`temp${i + 1}`] = isNaN(tempValue) ? 0 : tempValue;
                            (this as any)[`hum${i + 1}`] = isNaN(humValue) ? 0 : humValue;

                            console.log(`🔄 更新房间 ${i + 1}:`, {
                                温度原始值: dataItem.wendu,
                                温度转换后: tempValue,
                                湿度原始值: dataItem.shidu,
                                湿度转换后: humValue
                            });
                        } else {
                            console.warn(`⚠️ 房间 ${i + 1} 数据格式异常:`, dataItem);
                            (this as any)[`temp${i + 1}`] = 0;
                            (this as any)[`hum${i + 1}`] = 0;
                        }
                    }

                    if (roomCount < 10) {
                        for (let i = roomCount; i < 10; i++) {
                            (this as any)[`temp${i + 1}`] = 0;
                            (this as any)[`hum${i + 1}`] = 0;
                        }
                    }
                } else {
                    console.error('❌ 响应数据格式错误:', response.data);
                    for (let i = 1; i <= 10; i++) {
                        (this as any)[`temp${i}`] = 0;
                        (this as any)[`hum${i}`] = 0;
                    }
                }

                this.dataUpdateTrigger++;
                console.log('🎉 全部数据更新完成');

            } catch (error) {
                console.error("💥 获取全部数据失败:", error);
                // 错误处理...
            }
        },

        // 统一的获取单个房间数据方法
        async getRoomData(roomNumber: number, roomId: string) {
            try {
                console.log(`获取房间 ${roomId} 数据 (编号: ${roomNumber})`);

                const response = await axios.get<DataItem[]>(`/telemetry/rooms/${roomId}`, {
                    timeout: 10000,
                });

                console.log(`房间 ${roomId} 响应数据:`, response.data);

                // 清空对应列表
                (this as any)[`templist${roomNumber}`] = [];
                (this as any)[`humlist${roomNumber}`] = [];
                (this as any)[`time${roomNumber}`] = [];

                // 填充数据
                response.data.forEach((item: DataItem) => {
                    (this as any)[`templist${roomNumber}`].push(item.wendu);
                    (this as any)[`humlist${roomNumber}`].push(item.shidu);
                    (this as any)[`time${roomNumber}`].push(item.time);
                });

                // 更新最新数据
                if (response.data.length > 0) {
                    const lastItem = response.data[response.data.length - 1];
                    (this as any)[`temp${roomNumber}`] = lastItem.wendu;
                    (this as any)[`hum${roomNumber}`] = lastItem.shidu;
                }

                this.dataUpdateTrigger++;
                console.log(`房间 ${roomId} 数据获取完成`);

            } catch (error) {
                console.error(`获取房间 ${roomId} 数据失败:`, error);
                if (error instanceof AxiosError) {
                    ElMessage.error(`获取房间 ${roomId} 数据失败: ${error.message}`);
                } else {
                    ElMessage.error(`获取房间 ${roomId} 数据时发生未知错误`);
                }
            }
        },

        // 兼容旧方法
        async getData2() {
            await this.getRoomData(2, '102');
        },

        async getData3() {
            await this.getRoomData(3, '108');
        },

        // 批量获取所有房间的详细数据
        async getAllRoomDetails() {
            const rooms = [
                { number: 1, id: '101' }, { number: 2, id: '102' },
                { number: 3, id: '108' }, { number: 4, id: '110' },
                { number: 5, id: '113' }, { number: 6, id: '115' },
                { number: 7, id: '116' }, { number: 8, id: '117' },
                { number: 9, id: '118' }, { number: 10, id: '119' }
            ];

            try {
                // 并行获取所有房间数据
                const promises = rooms.map(room =>
                    this.getRoomData(room.number, room.id)
                );

                await Promise.all(promises);
                console.log('所有房间详细数据获取完成');

            } catch (error) {
                console.error('批量获取房间数据失败:', error);
            }
        }
    }
})
