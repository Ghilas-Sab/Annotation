/**
 * Scénarios : Page d'annotation
 *
 * Couvre : chargement, création/suppression d'annotation, navigation dans la liste,
 *          undo, export buttons, BPM hero, tabs.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Ann-${Date.now()}`

// Helper: locator for a specific tab button (uses `button[class*="tab"]` to avoid
// matching the `.tabs` container div that also satisfies [class*="tab"])
function tabBtn(page: import('@playwright/test').Page, text: RegExp | string) {
  return page.locator('button[class*="tab"]').filter({ hasText: text })
}

test.describe('03 — Page d\'annotation', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Ann`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  test.beforeEach(async () => {
    await api.clearAnnotations(videoId)
  })

  // ── Chargement ────────────────────────────────────────────────────────────

  test('La page d\'annotation se charge correctement', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await expect(page.getByRole('button', { name: /Projet/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /play|pause|lecture/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('La vidéo est présente dans la page', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await expect(page.locator('video').first()).toBeVisible({ timeout: 15000 })
  })

  test('La liste d\'annotations est vide au départ', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()
    // AnnotationList empty state
    await expect(page.getByText('Aucune annotation — appuie sur').first()).toBeVisible()
  })

  // ── Bouton Annoter ────────────────────────────────────────────────────────

  test('Cliquer sur le bouton Annoter crée une annotation à la frame courante', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    const annotateBtn = page.getByRole('button', { name: /^Annoter$|^Annoter frame/i }).first()
    await annotateBtn.waitFor({ state: 'visible' })
    await annotateBtn.click()

    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })
  })

  // ── Espace pour annoter ───────────────────────────────────────────────────

  test('La touche Espace crée une annotation', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    await page.locator('body').click()
    await page.keyboard.press('Space')

    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })
  })

  // ── Supprimer une annotation ──────────────────────────────────────────────

  test('Supprimer une annotation depuis la liste', async ({ page }) => {
    await api.createAnnotation(videoId, 10, 'Beat 1')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()

    const item = page.locator('[data-testid="annotation-item"]').first()
    await item.waitFor({ state: 'visible', timeout: 8000 })
    await item.hover()

    const deleteBtn = item.getByRole('button', { name: /Supprimer/i })
    await deleteBtn.waitFor({ state: 'visible' })
    await deleteBtn.click()

    await expect(tabBtn(page, /Annotations \(0\)/i).first()).toBeVisible({ timeout: 8000 })
  })

  // ── Undo ──────────────────────────────────────────────────────────────────

  test('Ctrl+Z annule la dernière annotation créée', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    await page.locator('body').click()
    await page.keyboard.press('Space')
    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })

    await page.keyboard.press('Control+z')
    await expect(tabBtn(page, /Annotations \(0\)/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('Le bouton Annuler (undo) est désactivé sans historique', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    // Undo button is in a .tooltip-wrap div with tooltip "Annuler (Ctrl+Z)"
    const undoBtn = page.locator('.tooltip-wrap').filter({ hasText: 'Annuler (Ctrl+Z)' }).locator('button')
    await expect(undoBtn).toBeDisabled({ timeout: 5000 })
  })

  test('Le bouton Annuler (undo) est activé après une annotation', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    await page.locator('body').click()
    await page.keyboard.press('Space')

    const undoBtn = page.locator('.tooltip-wrap').filter({ hasText: 'Annuler (Ctrl+Z)' }).locator('button')
    await expect(undoBtn).toBeEnabled({ timeout: 5000 })
  })

  // ── Navigation vers annotation ────────────────────────────────────────────

  test('Cliquer sur une annotation dans la liste cherche sa frame', async ({ page }) => {
    await api.createAnnotation(videoId, 10, 'Beat 1')
    await api.createAnnotation(videoId, 30, 'Beat 2')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()

    const firstItem = page.locator('[data-testid="annotation-item"]').first()
    await firstItem.waitFor({ state: 'visible', timeout: 8000 })
    await firstItem.click()

    const frameDisplay = page.locator('[data-testid="current-frame-display"]')
    await expect(frameDisplay).toBeVisible()
  })

  // ── Tabs ──────────────────────────────────────────────────────────────────

  test('Onglet Categories est accessible', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, 'Categories').click()
    await expect(page.getByText(/Catégories|Ajouter|nouvelle catégorie/i).first()).toBeVisible()
  })

  test('Onglet Auto Placement est accessible', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Auto Placement/i).click()
    await expect(page.getByText(/BPM|placement|automatique/i).first()).toBeVisible()
  })

  test('Onglet Décaler tout est accessible', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Décaler/i).click()
    await expect(page.getByText(/décalage|frames|ms/i).first()).toBeVisible()
  })

  // ── Export buttons ────────────────────────────────────────────────────────

  test('Les boutons d\'export sont visibles dans la topbar', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await expect(page.getByRole('button', { name: /JSON|CSV|Export/i }).first()).toBeVisible()
  })

  // ── Retour ────────────────────────────────────────────────────────────────

  test('Le bouton Projet retourne au détail du projet', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.getByRole('button', { name: /Projet/i }).click()
    await page.waitForURL(/\/projects\//)
  })

  // ── Stats depuis annotation ───────────────────────────────────────────────

  test('Le bouton Stats navigue vers la page de statistiques', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.getByRole('button', { name: /Stats/i }).click()
    await page.waitForURL(`**/statistics/${videoId}`)
  })

  // ── Audio toggle ──────────────────────────────────────────────────────────

  test('Le bouton Beep est visible et cliquable', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    const beepBtn = page.getByRole('button', { name: /Beep/i })
    await expect(beepBtn).toBeVisible()
    await beepBtn.click()
    await expect(beepBtn).toBeVisible()
  })
})
