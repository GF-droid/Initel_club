import { createRouter, createWebHistory, type Router, type RouteRecordRaw } from 'vue-router'
import { useLoginAuthStore } from '@/store/login/loginAuthStore'


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
        path:"ledger",
        name:"ledger",
        component:()=>import('@/views/LedgerPage.vue')
        },
        {
        path:"sku",
        name:"sku",
        component:()=>import('@/views/SkuPage.vue')
        },
        // 仓储监控：功能尚未实现，暂时下线。
        // Cam.vue 与 VideoPlayer.vue 仍保留在仓库中，恢复时取消本段注释即可
        // （同时要恢复 NavHome.vue 里的菜单项和图标导入）。
        // {
        // path: "monitoring",
        // name: "Monitoring",
        // component: () => import('@/views/Cam.vue')
        // },
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

// 全局前置守卫：未登录不能进入工作台；已登录则不再停留在登录页。
//
// 这只是前端体验层面的拦截 —— 真正的访问控制在 API 的全局 JwtAuthGuard 上。
// 仅靠前端守卫挡不住直接调用接口，所以两者必须同时存在。
// 仅这两个路由名是公开的，其余（含 404）都要求登录。
const PUBLIC_ROUTES = new Set(['login', 'NotFound'])

router.beforeEach((to) => {
    const authStore = useLoginAuthStore()
    const isPublic = PUBLIC_ROUTES.has(String(to.name ?? ''))

    if (!isPublic && !authStore.isLoggedIn) {
        return {
            name: 'login',
            // 记住原目标，登录后跳回去
            query: to.fullPath && to.fullPath !== '/' ? { redirect: to.fullPath } : undefined
        }
    }

    if (to.name === 'login' && authStore.isLoggedIn) {
        return { name: 'home' }
    }

    return true
})

export default router
