import { defineStore } from 'pinia';
import { AxiosError } from "axios";
import axios from "@/store/SetAxios";
import { ElMessage } from 'element-plus';
import { ref, type Ref } from 'vue';

interface DataItem {
    wendu: number;
    shidu: number;
    time: string;
}

export const useChartDataStore = defineStore("ChartStore", () => {
    const templist1: Ref<number[]> = ref([])
    const templist2: Ref<number[]> = ref([])
    const humlist1: Ref<number[]> = ref([])
    const humlist2: Ref<number[]> = ref([])
    const timelist: Ref<string[]> = ref([])

    const getdatalist1 = async (roomid: number) => {
        try {
            console.log(`📊 获取房间 ${roomid} 图表数据...`);
            const response = await axios.get(`/telemetry/rooms/${roomid}`);

            if (response.status == 200 && Array.isArray(response.data)) {
                console.log(`✅ 房间 ${roomid} 获取到 ${response.data.length} 条数据`);

                // 清空旧数据，避免重复
                templist1.value = [];
                humlist1.value = [];

                response.data.forEach((item: DataItem) => {
                    templist1.value.push(item.wendu);
                    humlist1.value.push(item.shidu);
                });

                // 只在第一次调用时设置时间数据
                if (timelist.value.length === 0) {
                    response.data.forEach((item: DataItem) => {
                        timelist.value.push(item.time);
                    });
                }

                console.log(`📈 房间 ${roomid} 温度数据:`, templist1.value);
                console.log(`💧 房间 ${roomid} 湿度数据:`, humlist1.value);
            }
        } catch (error) {
            console.error(`❌ 获取房间 ${roomid} 图表数据失败:`, error);
            if (error instanceof AxiosError) {
                ElMessage.error(`获取数据失败: ${error.message}`);
            } else {
                ElMessage.error("获取数据时发生未知错误");
            }
        }
    }

    const getdatalist2 = async (roomid: number) => {
        try {
            console.log(`📊 获取房间 ${roomid} 图表数据...`);
            const response = await axios.get(`/telemetry/rooms/${roomid}`);

            if (response.status == 200 && Array.isArray(response.data)) {
                console.log(`✅ 房间 ${roomid} 获取到 ${response.data.length} 条数据`);

                // 清空旧数据，避免重复
                templist2.value = [];
                humlist2.value = [];

                response.data.forEach((item: DataItem) => {
                    templist2.value.push(item.wendu);
                    humlist2.value.push(item.shidu);
                });

                console.log(`📈 房间 ${roomid} 温度数据:`, templist2.value);
                console.log(`💧 房间 ${roomid} 湿度数据:`, humlist2.value);
            }
        } catch (error) {
            console.error(`❌ 获取房间 ${roomid} 图表数据失败:`, error);
            if (error instanceof AxiosError) {
                ElMessage.error(`获取数据失败: ${error.message}`);
            } else {
                ElMessage.error("获取数据时发生未知错误");
            }
        }
    }

    // 清空所有数据的方法
    const clearAllData = () => {
        templist1.value = [];
        templist2.value = [];
        humlist1.value = [];
        humlist2.value = [];
        timelist.value = [];
    }

    return {
        templist1,
        templist2,
        humlist1,
        humlist2,
        timelist,
        getdatalist1,
        getdatalist2,
        clearAllData
    }
})
