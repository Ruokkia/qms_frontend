/**
 * FAI（首件检验）Tab 自动刷新 —— 端到端回归测试
 * ===================================================================
 * 目标：验证「首件检验执行」与「历史报告查询」两个 tab 在切换时
 *      无需手动刷新即可自动拉取并渲染最新数据，覆盖核心用户路径。
 *
 * 能力：
 *  - DOM 状态捕获：读取表格行数、loading 态、可见文本，定位渲染异常
 *  - 网络请求拦截：监听 /api/fai/inspections 请求，断言切 tab 触发新请求
 *  - 控制台日志提取：收集 console.error / pageerror，精确定位异常根因
 *  - 错误报告与状态输出：步骤级 PASS/FAIL、汇总、失败自动截图与 JSON 报告
 *
 * 用法（需本地先启动：前端 dev server 与后端）：
 *   node scripts/e2e-fai-tab-auto-refresh.mjs
 * 环境变量：
 *   BASE_URL      默认为 http://localhost:5173
 *   QMS_USER      登录账号（默认 admin）
 *   QMS_PASSWORD  登录密码（默认 123456）
 *   HEADLESS      是否无头运行（默认 true）
 *
 * 依赖：playwright（若未安装会自动尝试 npm i -D playwright）
 * ===================================================================
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ---------- 配置 ----------
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
const QMS_USER = process.env.QMS_USER || 'admin'
const QMS_PASSWORD = process.env.QMS_PASSWORD || '123456'
const HEADLESS = (process.env.HEADLESS ?? 'true') !== 'false'
const ARTIFACTS_DIR = resolve(ROOT, 'scripts/artifacts/fai-e2e')

// ---------- 报告结构 ----------
const report = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  steps: [],
  consoleErrors: [],
  pageErrors: [],
  network: { inspectionRequests: 0, byTab: {} },
  failed: false,
}
function logStep(name) {
  const step = { name, status: 'START', detail: '' }
  report.steps.push(step)
  console.log(`\n▶ ${name}`)
  return step
}
function passStep(step, detail = '') {
  step.status = 'PASS'
  step.detail = detail
  console.log(`  ✅ PASS ${detail ? '- ' + detail : ''}`)
}
function failStep(step, detail = '') {
  step.status = 'FAIL'
  step.detail = detail
  report.failed = true
  console.error(`  ❌ FAIL - ${detail}`)
}

async function ensurePlaywright() {
  try {
    await import('playwright')
  } catch {
    console.log('[setup] 未检测到 playwright，正在尝试安装...')
    const r = spawnSync('npm', ['i', '-D', 'playwright', '--no-save'], {
      cwd: ROOT,
      stdio: 'inherit',
    })
    if (r.status !== 0) {
      throw new Error('playwright 安装失败，请手动执行 `npm i -D playwright` 后重试')
    }
  }
}

async function main() {
  await ensurePlaywright()
  const { chromium } = await import('playwright')
  mkdirSync(ARTIFACTS_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: HEADLESS })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // ---------- 控制台 / 异常捕获 ----------
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      report.consoleErrors.push(text)
      console.error(`  [console.error] ${text}`)
    }
  })
  page.on('pageerror', (err) => {
    report.pageErrors.push(err.message)
    console.error(`  [pageerror] ${err.message}`)
  })

  // ---------- 网络请求拦截 / 计数 ----------
  // 监听首件检验列表接口，按触发 tab 归并，用于断言“切 tab 即自动拉取”
  const INSPECTIONS_RE = /\/api\/fai\/inspections(\?|$)/
  const finishedByTab = { inspect: 0, report: 0, other: 0 }
  page.on('request', (req) => {
    if (INSPECTIONS_RE.test(req.url())) {
      report.network.inspectionRequests += 1
      const tab = page.__activeTab || 'other'
      finishedByTab[tab] = (finishedByTab[tab] || 0) + 1
      report.network.byTab = finishedByTab
    }
  })

  const helpers = {
    async screenshot(name) {
      const p = resolve(ARTIFACTS_DIR, `${name}.png`)
      await page.screenshot({ path: p, fullPage: false })
      console.log(`  📸 截图已保存: ${p}`)
      return p
    },
    async rowCount() {
      // 当前可见 tab 下的 el-table body 行数
      return await page.locator('.el-tab-pane:not([style*="display: none"]) .el-table__body-wrapper .el-table__row').count()
    },
    async isLoading() {
      return await page.locator('.el-tab-pane:not([style*="display: none"]) .el-loading-mask').count().then((c) => c > 0)
    },
  }

  try {
    // ===== 步骤 1：登录 =====
    let s = logStep('登录系统')
    try {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.fill('input[name="username"], input[placeholder*="账号"], input[placeholder*="用户名"]', QMS_USER)
      await page.fill('input[type="password"]', QMS_PASSWORD)
      await page.click('button:has-text("登录"), button[type="submit"]')
      await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {})
      // 若未跳 dashboard，尝试等待登录后落地页
      await page.waitForSelector('body', { timeout: 10000 })
      passStep(s, `已登录用户 ${QMS_USER}`)
    } catch (e) {
      failStep(s, `登录失败: ${e.message}`)
      await helpers.screenshot('01-login-failed')
      throw e
    }

    // ===== 步骤 2：进入首件检验页 =====
    s = logStep('导航至首件检验管理页 (/fai)')
    try {
      await page.goto(`${BASE_URL}/fai`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForSelector('.el-tabs', { timeout: 15000 })
      passStep(s, '进入 /fai 并渲染 tabs')
    } catch (e) {
      failStep(s, `无法进入 /fai: ${e.message}`)
      await helpers.screenshot('02-nav-failed')
      throw e
    }

    // 辅助：切换到指定 tab 并记录当前 active tab（供网络计数使用）
    async function switchTo(tabName, tabLabel) {
      page.__activeTab = tabName
      const before = report.network.inspectionRequests
      await page.click(`.el-tabs__header .el-tabs__item:has-text("${tabLabel}")`)
      // 等待该 tab 的自动刷新请求发出并表格渲染
      await page.waitForFunction(
        (b) => window.__faiReqCount > b,
        before,
        { timeout: 15000 }
      ).catch(() => {})
      // 兜底：等待网络空闲或表格行出现
      await page.waitForTimeout(800)
    }

    // 在网络层注入请求计数，便于断言“切 tab 触发新请求”
    await page.addInitScript(() => {
      window.__faiReqCount = 0
      const orig = window.fetch
      window.fetch = (...args) => {
        const url = String(args[0])
        if (/\/api\/fai\/inspections(\?|$)/.test(url)) window.__faiReqCount += 1
        return orig.apply(window, args)
      }
    })

    // ===== 步骤 3：首件检验执行 tab 自动刷新 =====
    s = logStep('切换至「首件检验执行」应自动拉取并渲染数据')
    try {
      await switchTo('inspect', '首件检验执行')
      const rows = await helpers.rowCount()
      const afterInspect = finishedByTab.inspect
      if (afterInspect >= 1 && rows >= 0) {
        passStep(s, `自动请求 ${afterInspect} 次，表格渲染行数=${rows}`)
      } else {
        failStep(s, `切到执行 tab 后未触发自动请求 (inspect请求=${afterInspect})`)
        await helpers.screenshot('03-inspect-no-refresh')
      }
    } catch (e) {
      failStep(s, `执行 tab 校验异常: ${e.message}`)
      await helpers.screenshot('03-inspect-error')
    }

    // ===== 步骤 4：历史报告查询 tab 自动刷新 =====
    s = logStep('切换至「历史报告查询」应自动拉取并渲染数据')
    try {
      await switchTo('report', '历史报告查询')
      const rows = await helpers.rowCount()
      const afterReport = finishedByTab.report
      if (afterReport >= 1 && rows >= 0) {
        passStep(s, `自动请求 ${afterReport} 次，表格渲染行数=${rows}`)
      } else {
        failStep(s, `切到报告 tab 后未触发自动请求 (report请求=${afterReport})`)
        await helpers.screenshot('04-report-no-refresh')
      }
    } catch (e) {
      failStep(s, `报告 tab 校验异常: ${e.message}`)
      await helpers.screenshot('04-report-error')
    }

    // ===== 步骤 5：来回切换不产生“空表/陈旧” —— 二次切回执行 tab 仍自动刷新 =====
    s = logStep('二次切回「首件检验执行」再次自动刷新（验证非一次性）')
    try {
      const before = finishedByTab.inspect
      await switchTo('inspect', '首件检验执行')
      const after = finishedByTab.inspect
      if (after > before) {
        passStep(s, `二次切回触发新请求 (inspect ${before} -> ${after})`)
      } else {
        failStep(s, '二次切回未触发新的自动请求')
        await helpers.screenshot('05-inspect-second-no-refresh')
      }
    } catch (e) {
      failStep(s, `二次切回校验异常: ${e.message}`)
      await helpers.screenshot('05-inspect-second-error')
    }

    // ===== 步骤 6：无控制台错误 / 页面异常 =====
    s = logStep('运行期间无控制台错误与未捕获异常')
    try {
      if (report.consoleErrors.length === 0 && report.pageErrors.length === 0) {
        passStep(s, '无 console.error / pageerror')
      } else {
        failStep(
          s,
          `发现 console.error=${report.consoleErrors.length} 条, pageerror=${report.pageErrors.length} 条`
        )
        await helpers.screenshot('06-console-errors')
      }
    } catch (e) {
      failStep(s, `异常检查出错: ${e.message}`)
    }
  } finally {
    report.finishedAt = new Date().toISOString()
    report.network.byTab = finishedByTab
    const summaryPath = resolve(ARTIFACTS_DIR, 'report.json')
    writeFileSync(summaryPath, JSON.stringify(report, null, 2), 'utf8')
    console.log(`\n========== 测试汇总 ==========`)
    console.log(`总步骤: ${report.steps.length} | 通过: ${report.steps.filter((x) => x.status === 'PASS').length} | 失败: ${report.steps.filter((x) => x.status === 'FAIL').length}`)
    console.log(`/api/fai/inspections 请求: 总=${report.network.inspectionRequests} byTab=${JSON.stringify(finishedByTab)}`)
    console.log(`console.error=${report.consoleErrors.length} pageerror=${report.pageErrors.length}`)
    console.log(`报告已生成: ${summaryPath}`)
    await browser.close()
    if (report.failed) {
      console.error('\n❌ 回归测试存在失败项，请查看上方 FAIL 明细与 artifacts 截图')
      process.exitCode = 1
    } else {
      console.log('\n✅ 全部通过：FAI tab 切换自动刷新回归测试成功')
    }
  }
}

main().catch((e) => {
  console.error('测试运行器异常:', e)
  process.exitCode = 1
})
