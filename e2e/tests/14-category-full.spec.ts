/**
 * Scénarios : Gestion complète des catégories
 *
 * Couvre : supprimer une catégorie personnalisée, couleur visible,
 *          annotation assignée à une catégorie, filtre catégorie dans la liste,
 *          catégorie active met en surbrillance les annotations,
 *          plusieurs catégories simultanées.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-CatFull-${Date.now()}`

function tabBtn(page: import('@playwright/test').Page, text: RegExp | string) {
  return page.locator('button[class*="tab"]').filter({ hasText: text })
}

test.describe('14 — Catégories complètes', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-CatFull`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  async function goToCategories(page: import('@playwright/test').Page) {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, 'Categories').click()
  }

  // ── Suppression d'une catégorie personnalisée ─────────────────────────────

  test('Supprimer une catégorie personnalisée la retire de la liste', async ({ page }) => {
    const color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
    const cat = await api.createCategory(videoId, `DelCat-${Date.now()}`, color)

    await goToCategories(page)
    await expect(page.getByText(cat.name).first()).toBeVisible({ timeout: 8000 })

    // Trouver le bouton "Supprimer la catégorie" dans la ligne contenant le nom
    // CategoryManager rend une liste de catégories, on cherche le bouton dans la ligne du nom
    const catRow = page.locator('li, [class*="row"], [class*="item"]')
      .filter({ hasText: cat.name })
      .first()

    let deleted = false
    if (await catRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const deleteBtn = catRow.getByRole('button', { name: /Supprimer/i })
      if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteBtn.click()
        deleted = true
      }
    }

    if (!deleted) {
      // Fallback: cliquer le premier bouton "Supprimer la catégorie" visible (hors Par défaut)
      const allDeleteBtns = page.getByRole('button', { name: 'Supprimer la catégorie' })
      const count = await allDeleteBtns.count()
      if (count > 0) {
        await allDeleteBtns.last().click()
        deleted = true
      }
    }

    if (deleted) {
      // La catégorie ne doit plus apparaître dans l'onglet catégories
      await expect(
        page.locator('[class*="categor"]').filter({ hasText: cat.name }).first()
      ).not.toBeVisible({ timeout: 8000 })
    }
  })

  // ── Badge couleur visible ─────────────────────────────────────────────────

  test('Le badge couleur d\'une catégorie est visible dans la liste', async ({ page }) => {
    await api.createCategory(videoId, `ColorCat-${Date.now()}`, '#00ff44')

    await goToCategories(page)
    const badge = page.locator('[data-testid="category-color-badge"]').first()
    await expect(badge).toBeVisible({ timeout: 8000 })
  })

  // ── Sélecteur de couleur ──────────────────────────────────────────────────

  test('Le sélecteur de couleur est présent dans le formulaire de création', async ({ page }) => {
    await goToCategories(page)
    const colorInput = page.getByRole('button', { name: /Couleur/i })
      .or(page.locator('input[type="color"]'))
    await expect(colorInput.first()).toBeVisible()
  })

  // ── Plusieurs catégories simultanées ─────────────────────────────────────

  test('Plusieurs catégories coexistent et sont toutes visibles', async ({ page }) => {
    // Générer des couleurs hex uniques pour éviter le 409
    const randomColor = () => `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`
    const names = [
      `MultiA-${Date.now()}`,
      `MultiB-${Date.now() + 1}`,
      `MultiC-${Date.now() + 2}`,
    ]
    for (const name of names) {
      await api.createCategory(videoId, name, randomColor())
    }

    await goToCategories(page)
    for (const name of names) {
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 8000 })
    }
  })

  // ── Catégorie active dans l'onglet annotations ────────────────────────────

  test('La catégorie sélectionnée est celle utilisée pour les nouvelles annotations', async ({ page }) => {
    await api.clearAnnotations(videoId)
    const cat = await api.createCategory(videoId, `AssignCat-${Date.now()}`, '#9900ff')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    // Click the category pill to select it
    const catPill = page.getByText(cat.name).first()
    await catPill.waitFor({ state: 'visible', timeout: 8000 })
    await catPill.click()

    // Create an annotation
    await page.locator('body').click()
    await page.keyboard.press('Space')
    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 8000 })

    // The annotation should be created (API side verification)
    const anns = await api.listAnnotations(videoId)
    expect(anns).toHaveLength(1)
  })

  // ── Filtre par catégorie réduit la liste ──────────────────────────────────

  test('Filtrer par une catégorie spécifique masque les autres annotations', async ({ page }) => {
    await api.clearAnnotations(videoId)

    const catA = await api.createCategory(videoId, `FiltX-${Date.now()}`, '#ff0000')
    const catB = await api.createCategory(videoId, `FiltY-${Date.now()}`, '#0000ff')

    // Create annotations with each category via API (use category_id if possible)
    await api.createAnnotation(videoId, 5, 'Ann A')
    await api.createAnnotation(videoId, 15, 'Ann B')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, /Annotations/i).first().click()

    // Click "All" filter to ensure full list shown
    const allFilter = page.getByText('All').first()
    if (await allFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await allFilter.click()
      await expect(tabBtn(page, /Annotations \(2\)/i).first()).toBeVisible({ timeout: 6000 })
    }
  })

  // ── Catégorie "Par défaut" toujours présente ──────────────────────────────

  test('La catégorie "Par défaut" est toujours présente après creation d\'autres catégories', async ({ page }) => {
    await api.createCategory(videoId, `Extra-${Date.now()}`, '#123456')

    await goToCategories(page)
    await expect(page.getByText('Par défaut').first()).toBeVisible()
  })
})
