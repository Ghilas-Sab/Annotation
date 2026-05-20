/**
 * Scénarios : Placement automatique d'annotations (BulkPlacementForm)
 *
 * Couvre : ouverture de l'onglet "Auto Placement", champs start/end/count/préfixe,
 *          aperçu de l'intervalle, bouton désactivé si count < 2, placement effectif,
 *          préfixe personnalisé visible dans les annotations créées.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Bulk-${Date.now()}`

test.describe('21 — Placement automatique (BulkPlacementForm)', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string
  let totalFrames: number

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Bulk`)
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

  async function goToPlacementTab(page: import('@playwright/test').Page) {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('button[class*="tab"]').filter({ hasText: /Auto Placement/i }).click()
    // Attendre que le formulaire soit visible
    await expect(page.locator('.bulk-form')).toBeVisible({ timeout: 8000 })
  }

  // ── Ouverture du formulaire ────────────────────────────────────────────────

  test('L\'onglet Auto Placement affiche le formulaire de placement', async ({ page }) => {
    await goToPlacementTab(page)
    await expect(page.getByText(/Placement Automatique/i)).toBeVisible()
  })

  test('Les champs Début, Fin, Nombre et Préfixe sont présents', async ({ page }) => {
    await goToPlacementTab(page)
    await expect(page.locator('#start-frame')).toBeVisible()
    await expect(page.locator('#end-frame')).toBeVisible()
    await expect(page.locator('#count')).toBeVisible()
    await expect(page.locator('#prefix')).toBeVisible()
  })

  // ── Valeurs initiales ─────────────────────────────────────────────────────

  test('Le champ Fin est pré-rempli avec le nombre total de frames', async ({ page }) => {
    await goToPlacementTab(page)
    const endInput = page.locator('#end-frame')
    const val = await endInput.inputValue()
    expect(Number(val)).toBe(totalFrames)
  })

  test('Le champ Début est pré-rempli à 0', async ({ page }) => {
    await goToPlacementTab(page)
    const startInput = page.locator('#start-frame')
    const val = await startInput.inputValue()
    expect(Number(val)).toBe(0)
  })

  test('Le préfixe par défaut est "beat"', async ({ page }) => {
    await goToPlacementTab(page)
    const prefixInput = page.locator('#prefix')
    const val = await prefixInput.inputValue()
    expect(val).toBe('beat')
  })

  // ── Aperçu de l'intervalle ────────────────────────────────────────────────

  test('Le texte d\'aperçu affiche le nombre d\'annotations et l\'intervalle', async ({ page }) => {
    await goToPlacementTab(page)
    // Le texte d'aperçu contient "annotations avec un intervalle"
    await expect(page.getByText(/annotations avec un intervalle/i)).toBeVisible()
  })

  test('Modifier le nombre d\'annotations met à jour l\'aperçu', async ({ page }) => {
    await goToPlacementTab(page)
    await page.locator('#count').fill('8')
    await expect(page.getByText(/8 annotations/i)).toBeVisible({ timeout: 3000 })
  })

  // ── Validation ────────────────────────────────────────────────────────────

  test('Le bouton est désactivé si count < 2', async ({ page }) => {
    await goToPlacementTab(page)
    await page.locator('#count').fill('1')
    const btn = page.getByRole('button', { name: /Placer les annotations/i })
    await expect(btn).toBeDisabled({ timeout: 3000 })
  })

  test('Le bouton est actif avec count = 4 (valeur par défaut)', async ({ page }) => {
    await goToPlacementTab(page)
    const btn = page.getByRole('button', { name: /Placer les annotations/i })
    await expect(btn).toBeEnabled()
  })

  // ── Placement effectif ────────────────────────────────────────────────────

  test('Cliquer sur Placer crée des annotations sur la vidéo', async ({ page }) => {
    await goToPlacementTab(page)

    // Paramètres : 4 annotations de la frame 0 à totalFrames
    await page.locator('#count').fill('4')

    const btn = page.getByRole('button', { name: /Placer les annotations/i })
    await expect(btn).toBeEnabled()
    await btn.click()

    // Vérifier que des annotations ont été créées
    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(\d+\)/i })
    ).not.toContainText('(0)', { timeout: 10000 })
  })

  test('Le préfixe personnalisé est utilisé pour les labels créés', async ({ page }) => {
    await goToPlacementTab(page)

    await page.locator('#prefix').fill('tempo')
    await page.locator('#count').fill('3')

    const btn = page.getByRole('button', { name: /Placer les annotations/i })
    await btn.click()

    // Naviguer vers l'onglet Annotations pour voir les labels
    await page.locator('button[class*="tab"]').filter({ hasText: /Annotations/i }).click()

    // Chercher un label contenant "tempo"
    await expect(page.getByText(/tempo/i).first()).toBeVisible({ timeout: 8000 })
  })

  // ── Sélection de plage personnalisée ──────────────────────────────────────

  test('Modifier start et end met à jour l\'aperçu de l\'intervalle', async ({ page }) => {
    await goToPlacementTab(page)

    await page.locator('#start-frame').fill('0')
    await page.locator('#end-frame').fill('50')
    await page.locator('#count').fill('6')

    // L'intervalle doit être recalculé : (50-0)/(6-1) = 10 frames
    await expect(page.getByText(/10\.0 frames/i)).toBeVisible({ timeout: 3000 })
  })
})
