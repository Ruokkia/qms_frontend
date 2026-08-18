import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { reportRuntimeError } from '@/utils/error-reporter'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/notification/index.vue'),
      },
      { path: 'admin', name: 'SystemAdmin', component: () => import('@/views/admin/index.vue') },
      {
        path: 'incoming',
        name: 'Incoming',
        component: () => import('@/views/incoming/index.vue'),
      },
      {
        path: 'finished-goods',
        name: 'FinishedGoods',
        component: () => import('@/views/finished-goods/index.vue'),
      },
      {
        path: 'trace',
        name: 'Trace',
        component: () => import('@/views/trace/index.vue'),
      },
      {
        path: 'exception',
        name: 'Exception',
        component: () => import('@/views/exception/index.vue'),
      },
      {
        path: 'exception/:id',
        name: 'ExceptionDetail',
        component: () => import('@/views/exception/detail.vue'),
      },
      {
        path: 'supplier-archive',
        name: 'SupplierArchive',
        component: () => import('@/views/supplier/Archive.vue'),
      },
      {
        path: 'supplier-audit',
        name: 'SupplierAudit',
        component: () => import('@/views/supplier-audit/index.vue'),
      },
      {
        path: 'supplier-change',
        name: 'SupplierMaterialChange',
        component: () => import('@/views/supplier-change/index.vue'),
      },
      {
        path: 'fai',
        name: 'FAI',
        component: () => import('@/views/fai/index.vue'),
      },
      {
        path: 'spc',
        name: 'SPC',
        component: () => import('@/views/spc/index.vue'),
      },
      {
        path: 'production-defect',
        name: 'ProductionDefect',
        component: () => import('@/views/production-defect/index.vue'),
      },
      {
        path: 'process-tools',
        name: 'ProcessTools',
        component: () => import('@/views/process-tools/index.vue'),
      },
      { path: 'supplier', name: 'Supplier', component: () => import('@/views/supplier/index.vue') },
      { path: 'tooling', name: 'Tooling', component: () => import('@/views/tooling/index.vue') },
      { path: 'tooling-maintenance', name: 'ToolingMaintenance', component: () => import('@/views/tooling/maintenance.vue') },
      { path: 'after-sales', name: 'AfterSales', component: () => import('@/views/after-sales/index.vue') },
      { path: 'measurement', name: 'Measurement', component: () => import('@/views/measurement/index.vue') },
      { path: 'quality-system', name: 'QualitySystem', component: () => import('@/views/quality-system/index.vue') },
      {
        path: 'process-tools/fmea',
        name: 'ProcessToolsFmea',
        component: () => import('@/views/process-tools/FmeaSheet.vue'),
      },
      {
        path: 'process-tools/fishbone',
        name: 'ProcessToolsFishbone',
        component: () => import('@/views/process-tools/FishboneEditor.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.onError((error, to) => {
  reportRuntimeError(error, `路由加载异常: ${String(to.fullPath)}`, '页面加载失败，请刷新后重试')
})

/** 路由守卫：权限校验（key 必须与路由记录的 name 完全一致） */
const MODULE_ROUTE_MAP: Record<string, string> = {
  SystemAdmin: 'systemAdmin',
  Incoming: 'incoming',
  FinishedGoods: 'finishedGoods',
  Supplier: 'supplier',
  Tooling: 'tooling',
  ToolingMaintenance: 'tooling',
  AfterSales: 'afterSales',
  Measurement: 'measurement',
  QualitySystem: 'qualitySystem',
  Trace: 'trace',
  Exception: 'exception',
  ExceptionDetail: 'exception',
  SupplierArchive: 'supplier',
  SupplierAudit: 'supplierAudit',
  SupplierMaterialChange: 'supplierMaterialChange',
  FAI: 'fai',
  SPC: 'spc',
  ProductionDefect: 'productionDefect',
  ProcessTools: 'processTools',
  ProcessToolsFmea: 'processTools',
  ProcessToolsFishbone: 'processTools',
}

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()

  // 公开页面（登录页）直接放行
  if (to.meta.public) {
    if (auth.isLogin) {
      next('/dashboard')
    } else {
      next()
    }
    return
  }

  // 未登录 → 跳转登录
  if (!auth.isLogin) {
    next('/login')
    return
  }

  // 检查模块权限
  const moduleName = MODULE_ROUTE_MAP[to.name as string]
  if (moduleName && !auth.hasModule(moduleName as any)) {
    next('/dashboard')
    return
  }

  next()
})

export default router
