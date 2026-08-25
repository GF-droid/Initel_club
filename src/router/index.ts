import { createRouter, createWebHistory, type Router, type RouteRecordRaw } from 'vue-router'
import { useLoginAuthStore } from '@/store/login/loginAuthStore'
import { UseAuth } from '@/utils/auth'
import { storeToRefs } from 'pinia'


const routes: RouteRecordRaw[] = [{
    path: '/login',
    name: 'login',
    component: () => import('@/views/Login.vue')
},
{
    path: '/home',
    name: 'home',
    component: () => import('@/views/Home.vue'),
    children: [
        // 添加一个空子路由，重定向到data2
        {
            path: '',  // 空路径
            redirect: '/home/data2'  // 重定向到data2
        },
        {
        path:'Data',
        name:'Data',
        component:()=>import('@/views/DataPage.vue')},
        {
        path:'air-conditioning',
        name:'air-conditioning',
        component:()=>import('@/views/DataPage.vue')},
        {
        path:'data2',
        name:'data2',
        component:()=>import('@/views/DataPage2.vue')},
        {
        path:'Chart',
        name:'Chart',
        component:()=>import('@/views/ChartPage.vue')},
        {
        path:"warehouse",
        name:"warehouse",
        component:()=>import('@/views/WarehousePage.vue')
        },
        {
        path: 'ai-assistant',  // AI助手
        name: 'ai-assistant',
        component: () => import('@/views/AIassistant.vue')  // 修正：应该是AI助手页面
        },
        {
        path:"search",
        name:"search",
        component:()=>import('@/views/SearchPage.vue')
        },
        {
        path: "monitoring",
        name: "Monitoring",
        component: () => import('@/views/Cam.vue')
        },
       
    ]
},

{
    path: '/',
    redirect: '/login'
},

// 404页面在输入了错误的路由后，会自动跳转到该页面
{
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue')
},
]


const router: Router = createRouter({
    history: createWebHistory(),
    routes: routes
})

// // 添加全局前置守卫
// router.beforeEach((to, from, next) => {
//     const auth = UseAuth()
//     const authStore = useLoginAuthStore()
//     if (to.name !== 'login' && !authStore.isLoggedIn &&!auth.isallow) {
//         next({ name: 'login' });
//     } else {
//         // if (auth.isallow) {
//             next();
//         // }
       
//     }
// })

export default router
