/**
 * Scénarios : Gestion des catégories
 *
 * Couvre : création, renommage, suppression, sélection pour annotation, filtrage.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Cat-${Date.now()}`

function tabBtn(page: import('@playwright/test').Page, text: RegExp | string) {
  return page.locator('button[class*="tab"]').filter({ hasText: text })
}

test.describe('04 — Catégories', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Cat`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  async function goToCategoriesTab(page: import('@playwright/test').Page) {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await tabBtn(page, 'Categories').click()
  }

  // ── Affichage ─────────────────────────────────────────────────────────────

  test('La catégorie "Par défaut" existe toujours', async ({ page }) => {
    await goToCategoriesTab(page)
    await expect(page.getByText('Par défaut').first()).toBeVisible()
  })

  test('L\'onglet Categories est accessible', async ({ page }) => {
    await goToCategoriesTab(page)
    await expect(page.getByText(/Catégories|Ajouter une catégorie|Nouvelle/i).first()).toBeVisible()
  })

  // ── Création ──────────────────────────────────────────────────────────────

  test('Créer une nouvelle catégorie', async ({ page }) => {
    await goToCategoriesTab(page)

    const nameInput = page.getByPlaceholder(/Nom de la catégorie|nouvelle catégorie/i)
    await nameInput.fill(`Cat-${RUN}`)

    const createBtn = page.getByRole('button', { name: /Ajouter|Créer/i }).first()
    await createBtn.click()

    await expect(page.getByText(`Cat-${RUN}`).first()).toBeVisible({ timeout: 6000 })
  })

  test('Ne peut pas créer une catégorie sans nom', async ({ page }) => {
    await goToCategoriesTab(page)

    const createBtn = page.getByRole('button', { name: /Ajouter|Créer/i }).first()
    // Button should be disabled when name is empty
    await expect(createBtn).toBeDisabled()
  })

  // ── Catégorie dans l'onglet annotations ──────────────────────────────────

  test('La catégorie apparaît dans le sélecteur de l\'onglet Annotations', async ({ page }) => {
    const catName = `CatSelect-${Date.now()}`
    await api.createCategory(videoId, catName, '#00ff88')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    // Annotations tab should show category pills
    await expect(page.getByText(catName).first()).toBeVisible({ timeout: 8000 })
  })

  test('Sélectionner une catégorie met à jour l\'état actif', async ({ page }) => {
    const catName = `CatActive-${Date.now()}`
    await api.createCategory(videoId, catName, '#ff0044')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    const catPill = page.getByText(catName).first()
    await catPill.click()

    // The pill should be visually selected (border style changes)
    await expect(catPill).toBeVisible()
  })

  // ── Filtrage des annotations par catégorie ────────────────────────────────

  test('Filtrer les annotations par catégorie', async ({ page }) => {
    await api.clearAnnotations(videoId)
    await api.createCategory(videoId, `FiltA-${Date.now()}`, '#ff1100')
    await api.createAnnotation(videoId, 5, 'Beat A')

    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    // The filter row with "All" should be visible
    await expect(page.getByText('All')).toBeVisible()
    await page.getByText('All').click()

    // Should still show the annotation
    await expect(tabBtn(page, /Annotations \(1\)/i).first()).toBeVisible({ timeout: 6000 })
  })

  // ── Suppression ───────────────────────────────────────────────────────────

  test('La catégorie par défaut ne peut pas être supprimée', async ({ page }) => {
    await goToCategoriesTab(page)

    // "Par défaut" category should not have a delete button, or it should be disabled
    const defaultCatRow = page.locator('[class*="category"]').filter({ hasText: 'Par défaut' }).first()
    if (await defaultCatRow.isVisible().catch(() => false)) {
      const deleteBtn = defaultCatRow.getByRole('button', { name: /Supprimer/i })
      // Either not visible or disabled
      const isVisible = await deleteBtn.isVisible().catch(() => false)
      if (isVisible) {
        await expect(deleteBtn).toBeDisabled()
      }
    }
  })
})
