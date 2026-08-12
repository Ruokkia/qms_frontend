import { test, expect, login, snap, TEST_USER } from './fixtures'

/**
 * E2E-1 登录与分公司切换（对应 docs/e2e-report-20260811.md）
 *
 * 调整说明（2026-08-11）：
 *  - 登录按钮真实文案为「安全登录」（非「登录」），登录成功后跳 /dashboard。
 *  - 分公司切换：使用超级管理员 qms_admin（R00，data_scope=ALL_PLANTS）登录，
 *    尝试在导航栏切换分公司（SZ/MZ）。若导航栏无切换控件则为前端缺陷 L5，如实记录。
 */
test.describe('E2E-1 登录与分公司切换', () => {
  test('使用有效账号登录并进入主页', async ({ page }) => {
    await login(page, TEST_USER.username, TEST_USER.password)
    // 登录后应停留在应用主框架（非登录页）
    await expect(page).not.toHaveURL(/.*\/login.*/)
    await expect(page).toHaveURL(/.*\/dashboard.*/)
    // 顶部导航条存在（应用已挂载）
    await expect(page.locator('.app-header, header, .topbar, .navbar, .main-layout').first()).toBeVisible()
    // 等侧边栏菜单/主框架内容渲染，避免截到空白布局
    await expect(page.locator('.el-menu, .sidebar, .el-aside, .menu-container, .dashboard-content').first()).toBeVisible({ timeout: 10_000 }).catch(() => {})
    await snap(page, 'E2E1-login-success', { waitForRows: false })
  })

  test('无效密码被拒绝', async ({ page }) => {
    await page.goto('/login')
    const account = page.locator('.login-form .el-input__inner').first()
    const pwd = page.locator('.login-form .el-input__inner').nth(1)
    await account.fill(TEST_USER.username)
    await pwd.fill('wrong-password')
    await page.getByRole('button', { name: /安全登录/ }).click()
    // 仍然停留在登录页（登录失败，未跳转）
    await expect(page).toHaveURL(/.*\/login.*/, { timeout: 10_000 })
    // 出现错误提示
    await expect(page.locator('.login-error').first()).toBeVisible()
    await snap(page, 'E2E1-invalid-password')
  })

  test('超级管理员可尝试切换分公司（SZ/MZ）', async ({ page }) => {
    await login(page, TEST_USER.username, TEST_USER.password)
    // 导航栏中可能包含分公司切换控件（el-select 或文字 SZ/MZ）
    const switcher = page
      .locator('.plant-switch, .plant-selector, .el-select, header select')
      .filter({ hasText: /SZ|MZ|深圳|梅州/ })
      .first()
    if (await switcher.count()) {
      await expect(switcher).toBeVisible()
      await snap(page, 'E2E1-plant-switch-visible')
      // 尝试切换（若可点击且非禁用，记为可切换；若禁用则记为 L5 缺陷）
      const disabled = await switcher.getAttribute('aria-disabled').catch(() => null)
      const classAttr = (await switcher.getAttribute('class').catch(() => '')) || ''
      if (disabled === 'true' || classAttr.includes('is-disabled')) {
        test.info().annotations.push({ type: 'defect', description: 'L5: 分公司切换控件处于禁用态' })
      } else {
        await switcher.click()
        await snap(page, 'E2E1-plant-switch-open')
      }
    } else {
      // 导航栏无切换控件 → 记录为 L5 缺陷
      test.info().annotations.push({ type: 'defect', description: 'L5: 导航栏未发现分公司切换控件' })
      await snap(page, 'E2E1-no-plant-switch')
    }
  })
})
