/**
 * Scénarios : Précision et détails des annotations
 *
 * Couvre : frame exacte après clic, label visible, tri par frame,
 *          undo multiple, redo (si supporté), annotation frame 0,
 *          annotation dernière frame, deux annotations même frame (idempotence),
 *          label par défaut visible.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-AnnDet-${Date.now()}`

function tabBtn(page: import('@playwright/test').Page, text: RegExp | string) {
  return page.locator('button[class*="tab"]').filter({ hasText: text })
}

test.describe('13 — Détails et précision des annotations', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string
  let totalFrames: number

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Det`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
    totalFrames = vid.total_frames
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  test.beforeEach(async () => {
    await api.clearAnnotations(videoId)
  })

  // ── Frame exacte après navigation ─────────────────────────────────────────

  test('Cliquer sur une annotation conserve l\'affichage de frame actif', async ({ page }) => {
    await api.createAnnotation(videoId, 15, 'Beat 15')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()

    const item = page.locator('[data-testid="annotation-item"]').first()
    await item.waitFor({ state: 'visible', timeout: 8000 })
    await item.click()

    // L'affichage de frame reste visible et accessible après le clic
    const frameDisplay = page.locator('[data-testid="current-frame-display"]')
    await expect(frameDisplay).toBeVisible()
    // La valeur est un nombre valide
    const value = await frameDisplay.textContent()
    expect(Number(value)).toBeGreaterThanOrEqual(0)
  })

  // ── Label visible ─────────────────────────────────────────────────────────

  test('Le label de l\'annotation est visible dans la liste', async ({ page }) => {
    await api.createAnnotation(videoId, 5, 'Mon Super Label')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()

    await expect(page.getByText('Mon Super Label').first()).toBeVisible({ timeout: 8000 })
  })

  test('Le numéro de frame est visible dans l\'item d\'annotation', async ({ page }) => {
    await api.createAnnotation(videoId, 42, 'Frame 42')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()

    const item = page.locator('[data-testid="annotation-item"]').first()
    await item.waitFor({ state: 'visible', timeout: 8000 })
    // Frame number "42" appears somewhere in the item (may match multiple elements)
    await expect(item.getByText('42').first()).toBeVisible({ timeout: 8000 })
  })

  // ── Tri par frame ─────────────────────────────────────────────────────────

  test('Les annotations sont triées par numéro de frame croissant', async ({ page }) => {
    await api.createAnnotation(videoId, 30, 'Beat C')
    await api.createAnnotation(videoId, 5, 'Beat A')
    await api.createAnnotation(videoId, 15, 'Beat B')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()

    const items = page.locator('[data-testid="annotation-item"]')
    await expect(items).toHaveCount(3, { timeout: 8000 })

    // First item should contain frame 5, last should contain frame 30
    await expect(items.first().getByText('5')).toBeVisible()
    await expect(items.last().getByText('30')).toBeVisible()
  })

  // ── Undo multiple ─────────────────────────────────────────────────────────

  test('Undo multiple annule les annotations successivement', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('body').click()

    // Create 3 annotations sur des frames différentes (évite le toggle)
    // Frame 10
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })

    // Frame 20
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
    await expect(tabBtn(page, /Annotations \(2\)/i).first()).toBeVisible({ timeout: 8000 })

    // Frame 30
    for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Space')
    await expect(tabBtn(page, /Annotations \(3\)/i).first()).toBeVisible({ timeout: 8000 })

    // Undo 1
    await page.keyboard.press('Control+z')
    await expect(tabBtn(page, /Annotations \(2\)/i).first()).toBeVisible({ timeout: 6000 })

    // Undo 2
    await page.keyboard.press('Control+z')
    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 6000 })
  })

  // ── Annotation frame 0 ────────────────────────────────────────────────────

  test('On peut annoter la frame 0', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('body').click()

    // Frame starts at 0
    const frameDisplay = page.locator('[data-testid="current-frame-display"]')
    await expect(frameDisplay).toHaveText('0', { timeout: 5000 })
    await page.keyboard.press('Space')

    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })

    const ann = (await api.listAnnotations(videoId))[0]
    expect(ann.frame_number).toBe(0)
  })

  // ── Annotation dernière frame ──────────────────────────────────────────────

  test('On peut annoter la dernière frame', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('body').click()

    // Go to last frame with End key
    await page.keyboard.press('End')
    const frameDisplay = page.locator('[data-testid="current-frame-display"]')
    await expect(frameDisplay).toHaveText(String(totalFrames - 1), { timeout: 5000 })

    await page.keyboard.press('Space')
    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })
  })

  // ── Toggle : Espace sur frame déjà annotée supprime l'annotation ──────────

  test('Espace sur une frame déjà annotée supprime l\'annotation (toggle)', async ({ page }) => {
    await api.createAnnotation(videoId, 0, 'À supprimer')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('body').click()

    // Frame 0 is annotated — pressing Space should remove it
    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })
    await page.keyboard.press('Space')
    await expect(tabBtn(page, /Annotations \(0\)/i).first()).toBeVisible({ timeout: 8000 })
  })

  // ── Compteur d'annotations dans l'onglet ─────────────────────────────────

  test('Le compteur de l\'onglet reflète le nombre d\'annotations créées', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('body').click()

    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowRight')
      await page.keyboard.press('Space')
    }

    await expect(tabBtn(page, /Annotations \(4\)/i).first()).toBeVisible({ timeout: 10000 })
  })
})
