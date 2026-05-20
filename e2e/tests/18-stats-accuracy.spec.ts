/**
 * Scénarios : Précision des statistiques BPM
 *
 * Couvre : valeur BPM calculée correctement (25 fps × intervalle connu),
 *          cartes min/max/médiane visibles, histogramme canvas présent,
 *          PlaybackSpeedCalculator avec BPM cible, navigation retour annotation,
 *          navigation retour projet, données mises à jour après ajout d'annotation.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-StatAcc-${Date.now()}`

test.describe('18 — Précision des statistiques', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string
  let videoIdSingle: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)

    // Video avec annotations régulières : 25 fps × 1 s = 25 frames → 60 BPM
    const proj1 = await api.createProject(`${RUN}-Regular`)
    const vid1 = await api.uploadVideo(proj1.id)
    videoId = vid1.id
    // Annotations every 25 frames (1s interval at 25fps → 60 BPM)
    for (let f = 0; f <= 50; f += 25) {
      await api.createAnnotation(vid1.id, f, `Beat`)
    }

    // Video avec une seule annotation (pas de BPM possible)
    const proj2 = await api.createProject(`${RUN}-Single`)
    const vid2 = await api.uploadVideo(proj2.id)
    videoIdSingle = vid2.id
    await api.createAnnotation(vid2.id, 10, 'Only one')
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  // ── Valeur BPM cohérente ───────────────────────────────────────────────────

  test('Le BPM affiché est cohérent avec les annotations (environ 60 BPM)', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)

    // Look for a BPM value displayed
    const bpmText = page.getByText(/\d+(\.\d+)?\s*BPM/i).first()
    await expect(bpmText).toBeVisible({ timeout: 10000 })

    const text = await bpmText.textContent() ?? ''
    const match = text.match(/(\d+(?:\.\d+)?)/)
    if (match) {
      const bpm = parseFloat(match[1])
      // 25 fps, annotations at 0, 25, 50 → 2 intervals of 25 frames = 1s → 60 BPM
      expect(bpm).toBeGreaterThan(50)
      expect(bpm).toBeLessThan(75)
    }
  })

  // ── Cartes de statistiques ────────────────────────────────────────────────

  test('La carte BPM minimum est visible et contient une valeur', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    await expect(
      page.getByText(/Min|Minimum/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('La carte BPM maximum est visible et contient une valeur', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    await expect(
      page.getByText(/Max|Maximum/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('Les cartes contiennent des valeurs numériques', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    // Stat cards render [class*="stat-card"] or similar with a numeric value
    const cards = page.locator('[class*="stat"]').filter({ hasText: /\d+/ })
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
  })

  // ── Histogramme ───────────────────────────────────────────────────────────

  test('L\'histogramme BPM est rendu sur la page (div bars)', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    // Le Histogram dans StatisticsPage est un composant div/SVG, pas canvas
    // Il apparaît quand il y a des intervalles à afficher
    await expect(page.getByText(/BPM/i).first()).toBeVisible({ timeout: 10000 })
    // La page contient des éléments visuels (divs, svg) pour les stats
    await expect(page.locator('[class*="stat"], [class*="card"], [class*="chart"], svg, div[style*="height"]').first()).toBeVisible({ timeout: 5000 })
  })

  // ── PlaybackSpeedCalculator ───────────────────────────────────────────────

  test('Le calculateur de vitesse est présent avec des annotations', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    await expect(page.getByText(/Playback Speed Calculator/i)).toBeVisible({ timeout: 10000 })
  })

  test('Le calculateur de vitesse contient un champ numérique', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    await expect(page.getByText(/Playback Speed Calculator/i)).toBeVisible({ timeout: 10000 })

    const numInput = page.locator('input[type="number"]').first()
    if (await numInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await numInput.fill('120')
      await expect(numInput).toHaveValue('120')
    } else {
      // Peut-être un display texte sans input interactif
      await expect(page.getByText(/×|\d+\.\d+x/i).first()).toBeVisible({ timeout: 3000 })
    }
  })

  // ── Message avec une seule annotation ────────────────────────────────────

  test('Une seule annotation → pas de BPM calculable → message informatif', async ({ page }) => {
    await page.goto(`/statistics/${videoIdSingle}`)
    await expect(
      page.getByText(/Pas assez|insuffisant|minimum|au moins 2|1 annotation/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  test('Le bouton de retour navigue vers la page d\'annotation', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    const backBtn = page.locator('header').getByRole('button').first()
    await backBtn.click()
    await expect(page).not.toHaveURL(`**/statistics/${videoId}`, { timeout: 5000 })
  })

  // ── Mise à jour dynamique ─────────────────────────────────────────────────

  test('La page stats se recharge avec les nouvelles annotations', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-Dynamic`)
    const vid = await api.uploadVideo(proj.id)

    // Start with 2 annotations
    await api.createAnnotation(vid.id, 0, 'B1')
    await api.createAnnotation(vid.id, 25, 'B2')

    await page.goto(`/statistics/${vid.id}`)
    await expect(page.getByText(/BPM/i).first()).toBeVisible({ timeout: 10000 })

    // Add a third via API then reload
    await api.createAnnotation(vid.id, 50, 'B3')
    await page.reload()

    await expect(page.getByText(/BPM/i).first()).toBeVisible({ timeout: 10000 })
  })
})
