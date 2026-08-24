import { defineStore } from "pinia";
import { reactive, ref } from "vue";
import { type LoginReq } from "@/interface/UserInterface";
import { type FormInstance, type FormRules } from 'element-plus';


export const useLoginStore = defineStore('login', () => {
    const loginParams: LoginReq = reactive({
        username: '',
        password: ''
    })


    const loginRules = reactive({
        username: [{ required: true, message: '账号不能为空', trigger: 'blur' }],
        password: [{ required: true, message: '密码不能为空', trigger: 'blur' }]
    })

    return { loginParams, loginRules }
})