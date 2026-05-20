/**
 * Scénarios : VideoImportModal (modal d'import de clips dans l'assemblage)
 *
 * Couvre : titre "Sélectionner des vidéos", compteur "X sélectionné(s)",
 *          checkbox "Tout sélectionner", sélection individuelle,
 *          bouton "Ajouter la sélection" désactivé sans sélection,
 *          bouton actif après sélection, fermeture avec ✕, fermeture avec Annuler,
 *          fermeture en cliquant sur le backdrop, message "Sélectionnez au moins une vidéo".
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-VIM-${Date.now()}`

test.describe('25 — VideoImportModal (assemblage)', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let projectId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-VIM`)
    projectId = proj.id
    // Deux vidéos pour tester la sélection multiple
    await api.uploadVideo(proj.id, 'video-one.mp4')
    await api.uploadVideo(proj.id, 'video-two.mp4')
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  async function openModal(page: import('@playwright/test').Page) {
    await page.goto(`/assemblage/${projectId}`)
    await expect(page.getByText(/Assemblage|assemblage/i).first()).toBeVisible({ timeout: 15000 })
    const importBtn = page.getByRole('button', { name: /Importer|Ajouter|import/i }).first()
    await importBtn.waitFor({ state: 'visible', timeout: 10000 })
    await importBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
  }

  // ── Contenu du modal ──────────────────────────────────────────────────────

  test('Le modal affiche "Sélectionner des vidéos"', async ({ page }) => {
    await openModal(page)
    await expect(page.getByText(/Sélectionner des vidéos/i)).toBeVisible()
  })

  test('Les deux vidéos du projet sont listées', async ({ page }) => {
    await openModal(page)
    await expect(page.getByText('video-one.mp4')).toBeVisible()
    await expect(page.getByText('video-two.mp4')).toBeVisible()
  })

  test('La checkbox "Tout sélectionner" est présente', async ({ page }) => {
    await openModal(page)
    await expect(page.getByLabel(/Tout sélectionner/i)).toBeVisible()
  })

  // ── Compteur ──────────────────────────────────────────────────────────────

  test('Le compteur affiche "0 sélectionné" au départ', async ({ page }) => {
    await openModal(page)
    await expect(page.getByText(/0 sélectionné/i)).toBeVisible()
  })

  test('Le compteur passe à "1 sélectionné" après une sélection', async ({ page }) => {
    await openModal(page)
    await page.getByLabel('video-one.mp4').click()
    await expect(page.getByText(/1 sélectionné/i)).toBeVisible({ timeout: 3000 })
  })

  test('"Tout sélectionner" passe le compteur à 2 (ou N)', async ({ page }) => {
    await openModal(page)
    await page.getByLabel(/Tout sélectionner/i).click()
    // Compteur >= 2 car 2 vidéos dans le projet
    await expect(page.getByText(/[2-9] sélectionné/i)).toBeVisible({ timeout: 3000 })
  })

  // ── Bouton "Ajouter la sélection" ────────────────────────────────────────

  test('Le bouton "Ajouter la sélection" est désactivé sans sélection', async ({ page }) => {
    await openModal(page)
    const addBtn = page.getByRole('button', { name: /Ajouter la sélection/i })
    await expect(addBtn).toBeDisabled()
  })

  test('Le bouton "Ajouter la sélection" est actif après une sélection', async ({ page }) => {
    await openModal(page)
    await page.getByLabel('video-one.mp4').click()
    const addBtn = page.getByRole('button', { name: /Ajouter la sélection/i })
    await expect(addBtn).toBeEnabled({ timeout: 3000 })
  })

  // ── Message d'aide ───────────────────────────────────────────────────────

  test('Le message "Sélectionnez au moins une vidéo" est visible sans sélection', async ({ page }) => {
    await openModal(page)
    await expect(
      page.getByText(/Sélectionnez au moins une vidéo/i)
    ).toBeVisible()
  })

  // ── Fermeture du modal ────────────────────────────────────────────────────

  test('Fermer avec le bouton ✕ (Fermer) ferme le modal', async ({ page }) => {
    await openModal(page)
    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })

  test('Fermer avec Annuler ferme le modal', async ({ page }) => {
    await openModal(page)
    await page.getByRole('button', { name: /Annuler/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })

  test('Cliquer sur le backdrop ferme le modal', async ({ page }) => {
    await openModal(page)
    // Cliquer en dehors du dialogue (coin supérieur gauche de l'écran)
    await page.mouse.click(5, 5)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })

  // ── Ajout effectif d'un clip ──────────────────────────────────────────────

  test('Sélectionner et confirmer ajoute le clip à la liste', async ({ page }) => {
    await openModal(page)
    await page.getByLabel('video-one.mp4').click()
    await page.getByRole('button', { name: /Ajouter la sélection/i }).click()

    // Modal doit se fermer
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })

    // Le clip doit apparaître dans la liste d'assemblage
    await expect(page.getByText('video-one.mp4').first()).toBeVisible({ timeout: 5000 })
  })

  test('Tout sélectionner puis confirmer ajoute tous les clips', async ({ page }) => {
    await openModal(page)
    await page.getByLabel(/Tout sélectionner/i).click()
    await page.getByRole('button', { name: /Ajouter la sélection/i }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByText('video-one.mp4').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('video-two.mp4').first()).toBeVisible({ timeout: 5000 })
  })
})
