import { defineStore } from 'pinia';
import type { registerReq } from '@/interface/UserInterface';
import { reactive, ref } from 'vue';
import { ElForm, type FormInstance, type FormRules } from 'element-plus';

export const useRegisterStore = defineStore("registerStore", () => {
    const registerParams: registerReq = reactive({
        username: '',
        password: '',
        email: '',
    });

    const registerRef = ref<FormInstance | null>(null); // 确保类型正确

    const registerRules: FormRules = reactive({
        username: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
        password: [
            { required: true, message: '密码不能为空', trigger: 'blur' },
            { min: 6, max: 16, message: '密码长度需为6~16位', trigger: 'blur' }
        ],
        email: [
            { required: true, message: '邮箱不能为空', trigger: 'blur' },
            { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
        ]
    });

    return { registerParams, registerRef, registerRules };
});
