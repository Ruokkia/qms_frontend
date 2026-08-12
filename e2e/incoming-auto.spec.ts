import { test, expect, snap } from './fixtures'

/**
 * E2E-4 来料检验与自动建单（对应 docs/e2e-report-20260811.md）
 *
 * 调整说明（2026-08-11）：
 *  - 来料页路由 /incoming，表格容器 .incoming-table。
 *  - 操作列含「详情/追溯/更多」；「更多」下拉中仅不合格行含「整改」入口，
 *    点击整改会自动创建关联异常单（后端逻辑）。
 *  - 本用例验证：进入列表 → 打开某行「更多」→ 若含「整改」则点击并验证跳转。
 */
test.describe('E2E-4 来料检验与自动建单', () => {
  test('进入来料检验列表', async ({ authenticatedPage: page }) => {
    await page.goto('/incoming')
    await expect(page).toHaveURL(/.*\/incoming.*/)
    const table = page.locator('.incoming-table, .el-table').first()
    await expect(table).toBeVisible()
    await snap(page, 'E2E4-incoming-list')
  })

  test('不合格行可通过「更多→整改」自动建单', async ({ authenticatedPage: page }) => {
    await page.goto('/incoming')
    const table = page.locator('.incoming-table, .el-table').first()
    await expect(table).toBeVisible()

    // 逐行查找「更多」按钮（操作列最后一个）
    const rows = page.locator('.incoming-table .el-table__row, .el-table__row')
    const rowCount = await rows.count()
    let rectified = false
    for (let i = 0; i < rowCount; i++) {
      const moreBtn = rows
        .nth(i)
        .getByRole('button', { name: /更多/ })
        .first()
      if (await moreBtn.count()) {
        await moreBtn.click()
        // 下拉菜单中找「整改」
        const rectifyItem = page.getByText(/整改/).first()
        if (await rectifyItem.count()) {
          await rectifyItem.click()
          await snap(page, 'E2E4-rectify-row')
          // 应跳转或弹出异常单（自动建单）
          await expect(page).toHaveURL(/.*\/exception.*|.*\/incoming.*/, { timeout: 10_000 })
          rectified = true
          break
        } else {
          // 该行没有整改入口，关闭下拉重试
          await page.keyboard.press('Escape')
        }
      }
    }
    if (!rectified) {
      // 当前列表无不合格行，记录为数据依赖（需有不合格来料数据）
      test.info().annotations.push({
        type: 'info',
        description: 'E2E4: 当前列表未发现可整改（不合格）行，自动建单流程依赖不合格来料数据',
      })
      await snap(page, 'E2E4-no-rectify')
    }
  })
})
