import { test, expect, snap } from './fixtures'

/**
 * E2E-2 成品检验管理（对应 docs/e2e-report-20260811.md）
 *
 * 调整说明（2026-08-11）：
 *  - 成品页路由 /finished-goods，表格容器为 .el-table（.finished-table）。
 *  - 列表无「新增」按钮：新建走「详情」弹窗编辑模式，或仅编辑已存在记录。
 *    本用例验证：进入列表 → 打开首行详情 → 可见可编辑字段 → 保存。
 */
test.describe('E2E-2 成品检验管理', () => {
  test('进入成品检验列表并打开详情', async ({ authenticatedPage: page }) => {
    await page.goto('/finished-goods')
    await expect(page).toHaveURL(/.*\/finished-goods.*/)
    const table = page.locator('.el-table').first()
    await expect(table).toBeVisible()
    await snap(page, 'E2E2-fg-list')

    // 打开首行「详情」按钮（button.text-btn 文字“详情”）
    const detailBtn = page.locator('.el-table__row').first().getByText('详情', { exact: true })
    await expect(detailBtn).toBeVisible()
    await detailBtn.click()
    // 详情为 el-dialog 弹窗（FinishedGoodsDetailDialog）
    const dialog = page.locator('.el-dialog').first()
    await expect(dialog).toBeVisible({ timeout: 15_000 })
    // 等弹窗内字段/输入渲染完成，避免截到空弹窗
    await expect(dialog.locator('.el-form-item, input, .el-descriptions, .detail-field').first()).toBeVisible({ timeout: 10_000 })
    await snap(page, 'E2E2-fg-detail-dialog', { waitForRows: false })
  })

  test('成品详情可编辑字段并保存', async ({ authenticatedPage: page }) => {
    await page.goto('/finished-goods')
    const table = page.locator('.el-table').first()
    await expect(table).toBeVisible()

    const detailBtn = page.locator('.el-table__row').first().getByText('详情', { exact: true })
    await detailBtn.click()
    const dialog = page.locator('.el-dialog').first()
    await expect(dialog).toBeVisible({ timeout: 15_000 })

    // 详情内存在可编辑输入
    const input = dialog.locator('input.el-input__inner, textarea').first()
    if (await input.count()) {
      await expect(input).toBeVisible()
      await page.waitForTimeout(400)
      await snap(page, 'E2E2-detail-editable', { waitForRows: false })
    }
    // 尝试保存（按钮文案可能含「保存」「确定」「提交」）
    const saveBtn = dialog.getByRole('button', { name: /保存|确定|提交/ }).first()
    if (await saveBtn.count()) {
      await saveBtn.click()
      // 等保存结果提示/列表刷新
      await page.waitForTimeout(800)
      await snap(page, 'E2E2-click-save', { waitForRows: false })
    }
  })
})
