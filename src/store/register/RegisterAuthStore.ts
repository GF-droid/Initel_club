import { defineStore } from "pinia";
import axios from "@/store/SetAxios";
import { ElNotification, ElForm } from 'element-plus'; // 引入 ElNotification


export const useRegisterAuthStore = defineStore("registerAuth", {
    state:() => ({
        message:"",
        code:0,
        registerRef: null as InstanceType<typeof ElForm>  | null, // 使用类型断言
    }),
    actions: {
        async submit_register(registerParams:any){
            try {   
                const response = await axios.post('/auth/register',registerParams)
                    if (response.data.code === 200) {
                        this.message = response.data.message;
                        this.code = response.data.code;
                        if (this.registerRef) {
                            this.registerRef.resetFields(); // 重置表单
                        }
                    }else{
                        this.message = response.data.message;
                        this.code = response.data.code;
                    }
                } catch (error) {
                    ElNotification.warning({
                        title: '网络错误',
                        message: '请检查网络连接',
                        duration: 2000
                    });
                }
                if (this.message) {
                    if (this.code === 200) {
                        ElNotification({
                            title: '注册成功',
                            type:'success',
                            message: "注册成功，请登录",
                            duration: 1000
                        })
                        // 刷新网页
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000)
                    }else{
                        ElNotification({
                            title: '注册失败',
                            type: 'error',
                            message: "用户名或邮箱已存在",
                            duration: 2000
                        })
                    }
                }
        }
    }}
)
