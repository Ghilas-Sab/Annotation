/**
 * Scénarios : Raccourcis clavier complets
 *
 * Couvre : Shift+← (-5 frames), End (dernière frame),
 *          Ctrl+← (annotation précédente), P (play/pause),
 *          Alt+→ équivalent End, Ctrl+Z depuis PlaybackControls,
 *          raccourcis ignorés quand un input est actif.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-KeyFull-${Date.now()}`

test.describe('17 — Raccourcis clavier complets', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string
  let totalFrames: number

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Keys`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
    totalFrames = vid.total_frames
    for (let f = 0; f < 5; f++) {
      await api.createAnnotation(vid.id, f * 10, `Beat ${f + 1}`)
    }
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  async function goToAnnotation(page: import('@playwright/test').Page) {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('body').click()
  }

  // ── Shift+← : reculer 5 frames ────────────────────────────────────────────

  test('Shift+← recule de 5 frames', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')

    // Aller à frame 10 via deux Shift+→ (chacun +5)
    await page.keyboard.press('Shift+ArrowRight')
    await expect(display).toHaveText('5', { timeout: 3000 })
    await page.keyboard.press('Shift+ArrowRight')
    await expect(display).toHaveText('10', { timeout: 3000 })

    await page.keyboard.press('Shift+ArrowLeft')
    await expect(display).toHaveText('5', { timeout: 3000 })
  })

  test('Shift+← depuis frame 3 revient à 0 (clampé)', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')

    // Aller à frame 3 via trois ArrowRight unitaires
    await page.keyboard.press('ArrowRight')
    await expect(display).toHaveText('1', { timeout: 3000 })
    await page.keyboard.press('ArrowRight')
    await expect(display).toHaveText('2', { timeout: 3000 })
    await page.keyboard.press('ArrowRight')
    await expect(display).toHaveText('3', { timeout: 3000 })

    await page.keyboard.press('Shift+ArrowLeft')
    // 3 - 5 < 0, donc clampé à 0
    await expect(display).toHaveText('0', { timeout: 3000 })
  })

  // ── End : dernière frame ──────────────────────────────────────────────────

  test('End va à la dernière frame', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')

    await page.keyboard.press('End')
    await expect(display).toHaveText(String(totalFrames - 1), { timeout: 3000 })
  })

  test('Alt+→ équivaut à End (dernière frame)', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')

    await page.keyboard.press('Alt+ArrowRight')
    await expect(display).toHaveText(String(totalFrames - 1), { timeout: 3000 })
  })

  test('Alt+← équivaut à Home (première frame)', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')

    await page.keyboard.press('End')
    await expect(display).toHaveText(String(totalFrames - 1), { timeout: 3000 })

    await page.keyboard.press('Alt+ArrowLeft')
    await expect(display).toHaveText('0', { timeout: 3000 })
  })

  // ── Ctrl+← : annotation précédente ────────────────────────────────────────

  test('Ctrl+→ et Ctrl+← naviguent entre les annotations', async ({ page }) => {
    // Créer des annotations dans la plage réelle de la vidéo (tiny.mp4 ≥ 40 frames)
    await api.clearAnnotations(videoId)
    await api.createAnnotation(videoId, 10, 'B10')
    await api.createAnnotation(videoId, 20, 'B20')
    await api.createAnnotation(videoId, 30, 'B30')

    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')

    // Depuis frame 0 (sans annotation), Ctrl+→ saute à la 1ère annotation = frame 10
    await page.keyboard.press('Home')
    await expect(display).toHaveText('0', { timeout: 3000 })
    await page.keyboard.press('Control+ArrowRight')
    await expect(display).toHaveText('10', { timeout: 3000 })

    // Ctrl+→ depuis frame 10 → frame 20
    await page.keyboard.press('Control+ArrowRight')
    await expect(display).toHaveText('20', { timeout: 3000 })

    // Ctrl+← depuis frame 20 → frame 10
    await page.keyboard.press('Control+ArrowLeft')
    await expect(display).toHaveText('10', { timeout: 3000 })
  })

  // ── P : play/pause ────────────────────────────────────────────────────────

  test('La touche P bascule play/pause sans créer d\'annotation', async ({ page }) => {
    await api.clearAnnotations(videoId)
    for (let f = 0; f < 5; f++) {
      await api.createAnnotation(videoId, f * 10, `Beat ${f + 1}`)
    }

    await goToAnnotation(page)

    // Count annotations before pressing P
    const countBefore = await page.locator('[class*="tab"]').filter({ hasText: /Annotations \(5\)/ }).count()
    expect(countBefore).toBeGreaterThan(0)

    await page.keyboard.press('p')
    // P key toggles play — annotation count should NOT change
    await page.keyboard.press('p')

    // Still 5 annotations
    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(5\)/i })
    ).toBeVisible({ timeout: 5000 })
  })

  // ── Raccourcis ignorés si un input texte est actif ────────────────────────

  test('Les raccourcis clavier sont ignorés quand un input texte a le focus', async ({ page }) => {
    await api.clearAnnotations(videoId)

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    // Focus the search / label input if available
    await page.locator('button[class*="tab"]').filter({ hasText: /Annotations/i }).click()

    // Click on an annotation item to enter edit mode if possible
    // Alternatively, use the bulk placement form's BPM input
    await page.locator('button[class*="tab"]').filter({ hasText: /Auto Placement/i }).click()

    const bpmInput = page.getByLabel(/BPM/i).first()
    if (await bpmInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bpmInput.focus()
      await bpmInput.fill('120')
      // Press Space — should type a space in the input, not create annotation
      await page.keyboard.press('Space')

      // No annotation should be created
      const anns = await api.listAnnotations(videoId)
      expect(anns).toHaveLength(0)
    }
  })

  // ── Ctrl+Z depuis la barre de raccourcis ──────────────────────────────────

  test('Ctrl+Z via la barre de raccourcis annule la dernière annotation', async ({ page }) => {
    await api.clearAnnotations(videoId)

    await goToAnnotation(page)
    await page.keyboard.press('Space')

    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(1\)/i })
    ).toBeVisible({ timeout: 8000 })

    // Use Ctrl+Z
    await page.keyboard.press('Control+z')

    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(0\)/i })
    ).toBeVisible({ timeout: 8000 })
  })

  // ── Shift+→ à la frontière max ────────────────────────────────────────────

  test('Shift+→ depuis la dernière frame reste à la dernière frame', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')

    // Aller à la dernière frame
    await page.keyboard.press('End')
    await expect(display).toHaveText(String(totalFrames - 1), { timeout: 3000 })

    // Shift+→ depuis la fin ne doit pas dépasser totalFrames-1
    await page.keyboard.press('Shift+ArrowRight')
    const afterShift = Number(await display.textContent())
    expect(afterShift).toBeLessThanOrEqual(totalFrames - 1)
    expect(afterShift).toBe(totalFrames - 1)
  })
})
