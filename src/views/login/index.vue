<template>
  <main class="login-page">
    <section class="brand-panel">
      <div class="brand-top"><span class="brand-mark">Q</span><span>康立质量管理系统</span></div>
      <div class="brand-content">
        <p class="eyebrow">QUALITY OPERATIONS PLATFORM</p>
        <h1>让每一次质量决策<br /><em>都有据可循</em></h1>
        <p class="brand-copy">覆盖来料、过程、异常、首件与 SPC 的统一质量协作平台。</p>
        <div class="capability-list"><div v-for="item in capabilities" :key="item.title" class="capability"><span class="capability-icon">{{ item.icon }}</span><div><b>{{ item.title }}</b><small>{{ item.detail }}</small></div></div></div>
      </div>
      <footer>QMS · Internal use only · {{ new Date().getFullYear() }}</footer>
    </section>

    <section class="access-panel">
      <div class="access-card">
        <div class="access-heading"><span class="section-kicker">WELCOME BACK</span><h2>登录工作台</h2><p>输入账号信息，进入你的质量工作空间。</p></div>
        <el-form :model="form" class="login-form" @submit.prevent="onLogin">
          <el-form-item label="账号"><el-input v-model="form.account" size="large" placeholder="选择账号或手动输入" :prefix-icon="User" @keyup.enter="focusPassword" /></el-form-item>
          <el-form-item label="密码"><el-input ref="pwdRef" v-model="form.password" size="large" type="password" show-password placeholder="请输入密码" :prefix-icon="Lock" @keyup.enter="onLogin" /></el-form-item>
          <p v-if="errMsg" class="login-error">{{ errMsg }}</p>
          <el-button native-type="submit" type="primary" size="large" class="login-button" :loading="loading">安全登录 <span>→</span></el-button>
        </el-form>
        <div class="directory-head"><div><b>开发账号目录</b><span>已同步 {{ accounts.length }} 个启用账号</span></div><el-button link type="primary" @click="loadDirectory">刷新</el-button></div>
        <div class="account-directory" v-loading="directoryLoading"><button v-for="account in accounts" :key="account.account" type="button" class="account-chip" :class="{ selected: form.account === account.account }" @click="selectAccount(account)"><span class="account-avatar">{{ account.realName.slice(0, 1) }}</span><span><b>{{ account.realName }}</b><small>{{ account.account }} · {{ account.roleCode }}</small></span><i>{{ account.plantCode }}</i></button><p v-if="!directoryLoading && accounts.length === 0" class="directory-empty">暂未获取到账号目录</p></div>
        <p class="security-note">开发环境展示账号目录；不展示密码、Token 等敏感信息。</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Lock, User } from '@element-plus/icons-vue'
import { getLoginDirectoryApi, loginApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import type { LoginDirectoryUser } from '@/types'

const router = useRouter(); const auth = useAuthStore(); const pwdRef = ref<{ focus?: () => void } | null>(null); const loading = ref(false); const directoryLoading = ref(false); const errMsg = ref(''); const accounts = ref<LoginDirectoryUser[]>([])
const form = reactive({ account: '', password: '' })
const capabilities = [{ icon: '01', title: '统一质量数据', detail: '来料、过程与成品全链路协同' }, { icon: '02', title: '权限分级管理', detail: '角色、模块与数据范围统一管控' }, { icon: '03', title: '审计可追溯', detail: '关键质量动作保留完整记录' }]
function focusPassword() { ;(pwdRef.value as { focus?: () => void })?.focus?.() }
function selectAccount(account: LoginDirectoryUser) { form.account = account.account; errMsg.value = ''; focusPassword() }
async function loadDirectory() { directoryLoading.value = true; try { const res = await getLoginDirectoryApi(); accounts.value = res.data || [] } catch { accounts.value = [] } finally { directoryLoading.value = false } }
async function onLogin() { errMsg.value = ''; if (!form.account || !form.password) { errMsg.value = '请输入账号和密码'; return }; loading.value = true; try { const res = await loginApi({ account: form.account.trim(), password: form.password }); if (res.code === 0 && res.data) { auth.setUser(res.data); router.push('/dashboard') } else { errMsg.value = res.message || '登录失败' } } catch { errMsg.value = '登录失败，请检查账号与密码' } finally { loading.value = false } }
onMounted(loadDirectory)
</script>

<style scoped>
.login-page{min-height:100vh;display:grid;grid-template-columns:minmax(420px,1.08fr) minmax(520px,.92fr);background:#f7f9fc;color:#13213a}.brand-panel{position:relative;overflow:hidden;padding:42px clamp(42px,7vw,112px);display:flex;flex-direction:column;min-height:100vh;background:radial-gradient(circle at 76% 12%,#315d9d 0,rgba(49,93,157,.08) 22%,transparent 42%),linear-gradient(145deg,#071b35 0%,#0e315e 58%,#17487b 100%);color:#fff}.brand-panel:after{content:"";position:absolute;width:520px;height:520px;border:1px solid rgba(255,255,255,.12);border-radius:50%;right:-230px;bottom:-250px;box-shadow:0 0 0 48px rgba(255,255,255,.03),0 0 0 110px rgba(255,255,255,.025)}.brand-top{position:relative;z-index:1;display:flex;align-items:center;gap:10px;font-size:15px;font-weight:600;letter-spacing:.04em}.brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#4da3ff;font-size:19px}.brand-content{position:relative;z-index:1;margin:auto 0}.eyebrow,.section-kicker{font-size:11px;font-weight:700;letter-spacing:.16em;color:#80bfff}.brand-content h1{margin:18px 0;font-size:clamp(36px,4vw,62px);line-height:1.12;letter-spacing:-.04em}.brand-content em{font-style:normal;color:#7ec3ff}.brand-copy{max-width:490px;color:#bdd2ec;font-size:16px;line-height:1.8}.capability-list{display:grid;gap:16px;margin-top:44px}.capability{display:flex;align-items:center;gap:14px}.capability-icon{display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(154,209,255,.32);border-radius:11px;color:#a9d9ff;font-size:11px;font-weight:700}.capability b,.capability small{display:block}.capability b{font-size:14px}.capability small{margin-top:3px;color:#a9c4e4;font-size:12px}.brand-panel footer{position:relative;z-index:1;color:#88a8cd;font-size:11px;letter-spacing:.08em}.access-panel{display:grid;place-items:center;padding:44px}.access-card{width:min(100%,500px)}.access-heading{margin-bottom:28px}.section-kicker{color:#2477d4}.access-heading h2{margin:7px 0 8px;font-size:31px;letter-spacing:-.04em}.access-heading p{margin:0;color:#718096;font-size:14px}.login-form :deep(.el-form-item__label){font-weight:600;color:#334155}.captcha-row{display:flex;width:100%;gap:10px}.captcha-button{flex:0 0 134px;height:40px;overflow:hidden;border:1px solid #dbe3ed;border-radius:7px;background:#f8fbff;cursor:pointer}.captcha-button img{width:100%;height:100%;object-fit:cover}.login-error{margin:-5px 0 12px;color:#d14343;font-size:13px}.login-button{width:100%;height:46px;font-weight:600;box-shadow:0 8px 18px rgba(32,112,211,.22)}.login-button span{margin-left:8px;font-size:18px}.directory-head{display:flex;align-items:center;justify-content:space-between;margin:30px 0 12px}.directory-head b,.directory-head span{display:block}.directory-head b{font-size:14px}.directory-head span{margin-top:3px;color:#94a3b8;font-size:11px}.account-directory{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:230px;overflow:auto;padding-right:3px}.account-chip{display:flex;align-items:center;gap:9px;min-width:0;padding:10px;border:1px solid #e5ebf2;border-radius:10px;background:#fff;text-align:left;cursor:pointer;transition:.18s}.account-chip:hover,.account-chip.selected{border-color:#66a9ef;background:#f2f8ff;transform:translateY(-1px)}.account-avatar{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:#e7f1ff;color:#2376ce;font-size:13px;font-weight:700}.account-chip b,.account-chip small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-chip b{max-width:100px;color:#334155;font-size:12px}.account-chip small{max-width:118px;margin-top:2px;color:#94a3b8;font-size:10px}.account-chip i{margin-left:auto;color:#5b8dbe;font-style:normal;font-size:10px;font-weight:700}.directory-empty{grid-column:1/-1;margin:12px 0;color:#94a3b8;text-align:center;font-size:13px}.security-note{margin:14px 0 0;color:#9aa8ba;font-size:11px;line-height:1.5}@media(max-width:980px){.login-page{grid-template-columns:1fr}.brand-panel{min-height:340px;padding:32px}.brand-content{margin:50px 0 0}.brand-content h1{font-size:38px}.capability-list{display:none}.brand-panel footer{display:none}.access-panel{padding:36px 24px}}@media(max-width:500px){.account-directory{grid-template-columns:1fr}.access-panel{padding:30px 18px}.brand-panel{min-height:300px}.captcha-button{flex-basis:118px}}
</style>
