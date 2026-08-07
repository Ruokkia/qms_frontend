const { chromium } = require('playwright')

const BASE = 'http://127.0.0.1:5173'

;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const spcResp = []
  page.on('response', (r) => {
    const u = r.url()
    if (u.includes('/api/v1/spc/subgroups')) {
      spcResp.push({ method: r.request().method(), url: u.replace(BASE, ''), status: r.status() })
    }
  })
  const consoleErrors = []
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

  // 1) 登录
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.locator('input[type="text"]').first().fill('qms_admin')
  await page.locator('input[type="password"]').fill('123456')
  await page.getByRole('button', { name: '登录' }).click()
  await page.waitForTimeout(2500)

  // 2) 进入 SPC 数据采集
  await page.goto(BASE + '/spc', { waitUntil: 'networkidle' })
  await page.getByText('数据采集', { exact: true }).click()
  await page.waitForTimeout(800)

  // 3) 选择工序
  await page.locator('.data-entry .el-select').nth(0).click()
  await page.waitForSelector('.el-select-dropdown__item', { timeout: 5000 })
  await page.locator('.el-select-dropdown__item').first().click()
  await page.waitForTimeout(500)

  // 4) 选择参数
  await page.locator('.data-entry .el-select').nth(1).click()
  await page.waitForSelector('.el-select-dropdown__item', { timeout: 5000 })
  await page.locator('.el-select-dropdown__item').first().click()
  await page.waitForSelector('.sample-grid input', { timeout: 8000 })

  const inputs = page.locator('.sample-grid input')
  const n = await inputs.count()
  for (let i = 0; i < n; i++) {
    await inputs.nth(i).fill('10.123')
  }

  // 5) 提交子组
  const postBefore = spcResp.filter((x) => x.method === 'POST').length
  await page.getByRole('button', { name: '提交子组' }).click()
  await page.waitForTimeout(4500)
  const postAfter = spcResp.filter((x) => x.method === 'POST')

  // 6) 删除子组（先刷新历史）
  let deleteStatus = 'SKIPPED(no_subgroup)'
  const refreshBtn = page.locator('.subgroup-list').getByRole('button', { name: '刷新' })
  if (await refreshBtn.count()) {
    await refreshBtn.click()
    await page.waitForTimeout(1500)
  }
  const delBtn = page.locator('.subgroup-list').getByRole('button', { name: '删除' }).first()
  if (await delBtn.count() > 0) {
    await delBtn.click()
    await page.waitForSelector('.el-popconfirm__action', { timeout: 4000 })
    await page.locator('.el-popconfirm__action .el-button--primary').click()
    await page.waitForTimeout(3000)
    const dels = spcResp.filter((x) => x.method === 'DELETE')
    deleteStatus = dels.length ? dels[dels.length - 1].status : 'NO_DELETE_REQ'
  }

  const postStatus = postAfter.length ? postAfter[postAfter.length - 1].status : 'NO_POST_REQ'

  console.log('=== RESULT ===')
  console.log('sample_count =', n)
  console.log('POST /api/v1/spc/subgroups status =', postStatus)
  console.log('DELETE /api/v1/spc/subgroups/{id} status =', deleteStatus)
  console.log('all spc/subgroups responses =', JSON.stringify(spcResp, null, 2))
  console.log('console errors =', JSON.stringify(consoleErrors.slice(0, 10), null, 2))

  await browser.close()
})().catch((e) => {
  console.error('SCRIPT_ERR', e)
  process.exit(1)
})
