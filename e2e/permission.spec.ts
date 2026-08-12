import { test, expect, login, snap } from './fixtures'

/**
 * E2E-5 权限越权校验（对应 docs/e2e-report-20260811.md）
 *
 * 调整说明（2026-08-11）：
 *  - 系统管理真实路由为 /admin（非 /admin/users）。
 *  - R02 检验员（sz_insp01）无 systemAdmin 模块权限，前端路由守卫
 *    会将其重定向回 /dashboard（无 403 文案）。
 *  - 断言：访问 /admin 后 URL 回落到 /dashboard，页面不含系统管理内容。
 */
test.describe('E2E-5 权限越权校验', () => {
  test('R02 访问 /admin 被重定向回主页（无越权）', async ({ page }) => {
    // 使用受限账号登录
    await login(page, 'sz_insp01', '123456')
    await expect(page).toHaveURL(/.*\/dashboard.*/)

    // 直接访问系统管理路由
    await page.goto('/admin')
    // 守卫应重定向回 dashboard（不展示系统管理内容）
    await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 10_000 })
    await snap(page, 'E2E5-r02-redirect-dashboard')

    // 主页不应渲染系统管理专属内容（如用户管理表格 / 角色配置）
    await expect(page.getByText('角色配置', { exact: false })).toHaveCount(0)
    await expect(page.getByText('用户管理', { exact: false })).toHaveCount(0)
  })

  test('R02 直接打开 /admin 完整 URL 同样被拦截', async ({ page }) => {
    await login(page, 'sz_insp01', '123456')
    // 通过 baseURL + 路径直接访问
    await page.goto('/admin')
    await expect(page).toHaveURL(/.*\/dashboard.*/, { timeout: 10_000 })
    await snap(page, 'E2E5-r02-url-blocked')
  })
})
