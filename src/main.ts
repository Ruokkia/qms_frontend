import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'
// import { setupMock } from './mock'
import request from './api/request'
import { reportRuntimeError } from './utils/error-reporter'
import './style.css'

// Mock 拦截器已关闭：M0/M1/M2 后端接口已就绪，全部走真实后端 API。
// 如需本地 Mock 调试，可取消下行注释。
// setupMock(request)

const app = createApp(App)

app.config.errorHandler = (error, _instance, info) => {
  reportRuntimeError(error, `Vue 组件异常: ${info}`)
}

window.addEventListener('unhandledrejection', (event) => {
  reportRuntimeError(event.reason, '未处理的异步异常')
})

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
