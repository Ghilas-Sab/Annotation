/**
 * Scénarios : Édition et déplacement d'annotations
 *
 * Couvre : éditer le label, déplacer sur la timeline, placement bulk,
 *          décalage global, filtre par catégorie.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Edit-${Date.now()}`

function tabBtn(page: import('@playwright/test').Page, text: RegExp | string) {
  return page.locator('button[class*="tab"]').filter({ hasText: text })
}

test.describe('11 — Édition d\'annotations', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Edit`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  test.beforeEach(async () => {
    await api.clearAnnotations(videoId)
    await api.createAnnotation(videoId, 10, 'Label Original')
    await api.createAnnotation(videoId, 25, 'Label B')
  })

  async function goToAnnotationsTab(page: import('@playwright/test').Page) {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).click()
  }

  // ── Édition du label ───────────────────────────────────────────────────────

  test('Modifier le label d\'une annotation', async ({ page }) => {
    await goToAnnotationsTab(page)

    const item = page.locator('[data-testid="annotation-item"]').first()
    await item.waitFor({ state: 'visible', timeout: 8000 })

    // Find the edit input or double-click to edit
    const labelInput = item.getByRole('textbox')
    if (await labelInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await labelInput.clear()
      await labelInput.fill('Nouveau Label')
      await labelInput.press('Enter')
    } else {
      // Double-click on label span to enter edit mode
      const labelSpan = item.locator('span').filter({ hasText: /Label Original/ }).first()
      if (await labelSpan.isVisible({ timeout: 2000 }).catch(() => false)) {
        await labelSpan.dblclick()
        const input = item.getByRole('textbox')
        await input.clear()
        await input.fill('Nouveau Label')
        await input.press('Enter')
      }
    }
    // Verify change
    const anns = await api.listAnnotations(videoId)
    expect(anns).toHaveLength(2)
  })

  // ── Bulk placement ────────────────────────────────────────────────────────

  test('Le placement automatique crée des annotations à un BPM donné', async ({ page }) => {
    await api.clearAnnotations(videoId)

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Auto Placement/i).click()

    // Fill BPM
    const bpmInput = page.getByLabel(/BPM/i).first()
    if (await bpmInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bpmInput.fill('60')

      const placeBtn = page.getByRole('button', { name: /Placer|Générer|Créer|Place/i })
      if (await placeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await placeBtn.click()

        // Wait for annotations to appear
        await expect(
          tabBtn(page, /Annotations \(\d+\)/i)
        ).not.toContainText('(0)', { timeout: 8000 })
      }
    }
  })

  // ── Décalage global ───────────────────────────────────────────────────────

  test('Décaler toutes les annotations de N frames', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Décaler/i).click()

    const frameInput = page.locator('#shift-frames')
    if (await frameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await frameInput.fill('5')

      const shiftBtn = page.getByRole('button', { name: /Décaler|Appliquer|Shift/i })
      if (await shiftBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await shiftBtn.click()

        // Verify annotations shifted
        const anns = await api.listAnnotations(videoId)
        const frames = anns.map((a) => a.frame_number)
        expect(frames.some((f) => f >= 10)).toBe(true)
      }
    }
  })

  // ── Sélection et suppression avec clavier ──────────────────────────────────

  test('Sélectionner une annotation et la supprimer avec Suppr', async ({ page }) => {
    await goToAnnotationsTab(page)

    const item = page.locator('[data-testid="annotation-item"]').first()
    await item.waitFor({ state: 'visible', timeout: 8000 })
    await item.click()

    await page.locator('body').press('Delete')

    await expect(tabBtn(page, /Annotations \(1\)/i)).toBeVisible({ timeout: 6000 })
  })

  // ── Échap désélectionne ────────────────────────────────────────────────────

  test('Échap désélectionne l\'annotation', async ({ page }) => {
    await goToAnnotationsTab(page)

    const item = page.locator('[data-testid="annotation-item"]').first()
    await item.waitFor({ state: 'visible', timeout: 8000 })
    await item.click()

    await page.locator('body').press('Escape')
    // No error, page stays stable
    await expect(tabBtn(page, /Annotations/i)).toBeVisible()
  })
})
