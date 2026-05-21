/**
 * Scénarios : Raccourcis clavier et modal d'aide
 *
 * Couvre : modal raccourcis, navigation frame par frame, espace annoter,
 *          touche B pour beep, Suppr pour supprimer annotation sélectionnée,
 *          Ctrl+← → pour annotation précédente/suivante.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Keys-${Date.now()}`

test.describe('08 — Raccourcis clavier', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Keys`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
    // Add annotations for keyboard navigation tests
    for (let f = 0; f < 4; f++) {
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
    // Click body to ensure focus is not on an input
    await page.locator('body').click()
  }

  // ── Modal raccourcis ───────────────────────────────────────────────────────

  test('Le bouton clavier ouvre le modal des raccourcis', async ({ page }) => {
    await goToAnnotation(page)
    await page.getByRole('button', { name: /Raccourcis clavier/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/raccourcis|shortcuts/i).first()).toBeVisible()
  })

  test('Fermer le modal via le backdrop (overlay)', async ({ page }) => {
    await goToAnnotation(page)
    await page.getByRole('button', { name: /Raccourcis clavier/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // Click outside the dialog (the backdrop wrapper has onClick=onClose)
    await page.mouse.click(10, 10)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })

  test('Fermer le modal avec le bouton ✕', async ({ page }) => {
    await goToAnnotation(page)
    await page.getByRole('button', { name: /Raccourcis clavier/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    // ✕ button is the last button in the dialog header
    await page.getByRole('dialog').getByRole('button').last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })

  // ── Navigation frame ───────────────────────────────────────────────────────

  test('Flèche droite avance d\'une frame', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')
    const before = Number(await display.textContent())
    await page.keyboard.press('ArrowRight')
    // Wait for async frame update via requestVideoFrameCallback
    await expect(display).toHaveText(String(before + 1), { timeout: 3000 })
  })

  test('Flèche gauche recule d\'une frame (pas en dessous de 0)', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')
    await page.keyboard.press('ArrowLeft')
    // Frame 0 can't go below 0
    await expect(display).toHaveText('0', { timeout: 3000 })
  })

  test('Shift+→ avance de 5 frames', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')
    const before = Number(await display.textContent())
    await page.keyboard.press('Shift+ArrowRight')
    await expect(display).toHaveText(String(before + 5), { timeout: 3000 })
  })

  test('Home va à la première frame', async ({ page }) => {
    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')
    // Go to some frame first
    await page.keyboard.press('Shift+ArrowRight')
    await expect(display).toHaveText('5', { timeout: 3000 })
    await page.keyboard.press('Home')
    await expect(display).toHaveText('0', { timeout: 3000 })
  })

  // ── Espace annoter ────────────────────────────────────────────────────────

  test('Espace crée ou supprime une annotation à la frame courante', async ({ page }) => {
    // Clear annotations before navigation so the UI loads with 0
    await api.clearAnnotations(videoId)

    await goToAnnotation(page)
    await page.keyboard.press('Space')

    // Wait for annotation count to update (async API call)
    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(1\)/i })
    ).toBeVisible({ timeout: 8000 })
  })

  // ── Touche B (beep) ───────────────────────────────────────────────────────

  test('La touche B bascule le beep audio', async ({ page }) => {
    await goToAnnotation(page)
    const beepBtn = page.getByRole('button', { name: /Beep/i })
    const before = await beepBtn.textContent()
    await page.keyboard.press('b')
    const after = await beepBtn.textContent()
    // Text should have changed (ON ↔ OFF)
    expect(after).not.toBe(before)
  })

  // ── Ctrl+← → navigation annotation ───────────────────────────────────────

  test('Ctrl+→ saute à l\'annotation suivante', async ({ page }) => {
    // Ensure there are annotations for navigation
    await api.clearAnnotations(videoId)
    for (let f = 0; f < 4; f++) {
      await api.createAnnotation(videoId, f * 10, `Beat ${f + 1}`)
    }

    await goToAnnotation(page)
    const display = page.locator('[data-testid="current-frame-display"]')
    await page.keyboard.press('Home')
    await expect(display).toHaveText('0', { timeout: 3000 })
    await page.keyboard.press('Control+ArrowRight')
    // Should jump to first annotation at frame 10
    await expect(display).toHaveText('10', { timeout: 3000 })
  })

  // ── Suppr pour supprimer annotation sélectionnée ─────────────────────────

  test('Suppr supprime l\'annotation sélectionnée', async ({ page }) => {
    await api.clearAnnotations(videoId)
    await api.createAnnotation(videoId, 5, 'ToDelete')

    await goToAnnotation(page)
    await page.locator('button[class*="tab"]').filter({ hasText: /Annotations/i }).click()

    // Select the annotation by clicking it
    const item = page.locator('[data-testid="annotation-item"]').first()
    await item.waitFor({ state: 'visible', timeout: 8000 })
    await item.click()

    // Press Delete
    await page.keyboard.press('Delete')

    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(0\)/i })
    ).toBeVisible({ timeout: 6000 })
  })

  // ── Barre de raccourcis ───────────────────────────────────────────────────

  test('La barre de raccourcis en bas affiche les touches', async ({ page }) => {
    await goToAnnotation(page)
    // Bottom bar with kbd elements
    await expect(page.locator('kbd').first()).toBeVisible()
  })
})
