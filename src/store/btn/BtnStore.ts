import { defineStore } from 'pinia';
import axios from "@/store/SetAxios";

export const useBtnStore = defineStore('btn', {
    state: () => ({
        status: 0,
        maxValue: 0,
        minValue: 0,
    }),
    actions: {
        async OpenBtn(home: number) {
            const response = await axios.post('/open', { home: home });
            this.status = response.data.status;
        },
        async CloseBtn(home: number) {
            const response = await axios.post('/close', { home: home });
            this.status = response.data.status;
        },
        async UpBtn(home: number) {
            const response = await axios.post('/up', { home: home });
            this.status = response.data.status;
        },
        async DownBtn(home: number) {
            const response = await axios.post('/down', { home: home });
            this.status = response.data.status;
        },
        async submitTempData(MaxTemp: number, MinTemp: number) {
            const response = await axios.post('/setTempData', { Max: MaxTemp, Min: MinTemp });
            this.status = response.data.status;
        },
        async getTempData() {
            const response = await axios.get('/getTempData');
            this.maxValue = response.data.MaxTemp;
            this.minValue = response.data.MinTemp;
        },
    }
})
