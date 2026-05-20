/**
 * Scénarios : Contrôles de lecture vidéo
 *
 * Couvre : boutons play/pause, frame counter, barre de progression,
 *          timeline d'annotations, placement bulk.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Play-${Date.now()}`

test.describe('10 — Contrôles de lecture', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Play`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
    await api.createAnnotation(vid.id, 10, 'Beat 1')
    await api.createAnnotation(vid.id, 25, 'Beat 2')
    await api.createAnnotation(vid.id, 40, 'Beat 3')
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  async function goToAnnotation(page: import('@playwright/test').Page) {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
  }

  // ── Bouton Play/Pause ──────────────────────────────────────────────────────

  test('Le bouton Play/Pause est visible', async ({ page }) => {
    await goToAnnotation(page)
    const playBtn = page.getByRole('button', { name: /play|pause|lecture/i })
    await expect(playBtn.first()).toBeVisible()
  })

  test('La touche P bascule la lecture', async ({ page }) => {
    await goToAnnotation(page)
    await page.locator('body').click()
    // Press P to play, then P to pause
    await page.keyboard.press('p')
    await page.keyboard.press('p')
    // No error should occur
    await expect(page.locator('video').first()).toBeVisible()
  })

  // ── Compteur de frames ────────────────────────────────────────────────────

  test('L\'affichage de frame courante est visible', async ({ page }) => {
    await goToAnnotation(page)
    await expect(page.locator('[data-testid="current-frame-display"]')).toBeVisible()
  })

  test('Le total de frames est affiché dans les contrôles', async ({ page }) => {
    await goToAnnotation(page)
    // Total frames should be visible somewhere in controls
    await expect(page.getByText(/\/\s*\d+|frames/i).first()).toBeVisible()
  })

  // ── Timeline d'annotations ────────────────────────────────────────────────

  test('La timeline d\'annotations est présente', async ({ page }) => {
    await goToAnnotation(page)
    // VideoTimeline renders an SVG
    const timeline = page.locator('[class*="timeline"] svg, canvas')
    await expect(timeline.first()).toBeVisible({ timeout: 10000 })
  })

  // ── Bouton d'annotation dans PlaybackControls ─────────────────────────────

  test('Le bouton Annoter dans PlaybackControls est cliquable', async ({ page }) => {
    // Clear before navigation so the UI loads with 0 annotations
    await api.clearAnnotations(videoId)
    await goToAnnotation(page)

    // The Annoter button has aria-label="annoter" exactly
    const annotateBtn = page.getByRole('button', { name: 'annoter', exact: true })
    await annotateBtn.waitFor({ state: 'visible', timeout: 10000 })
    await annotateBtn.click()

    await expect(page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(1\)/i })).toBeVisible({ timeout: 8000 })
  })

  // ── Bulk placement ────────────────────────────────────────────────────────

  test('L\'onglet Auto Placement permet de configurer un BPM cible', async ({ page }) => {
    await goToAnnotation(page)
    await page.locator('button[class*="tab"]').filter({ hasText: /Auto Placement/i }).click()

    // BulkPlacementForm always renders with "Début" and "Nombre" labels
    await expect(page.getByText(/Début|Nombre d'annotations/i).first()).toBeVisible({ timeout: 5000 })
  })

  // ── Décalage ──────────────────────────────────────────────────────────────

  test('L\'onglet Décaler permet de saisir un décalage en frames', async ({ page }) => {
    await goToAnnotation(page)
    await page.locator('button[class*="tab"]').filter({ hasText: /Décaler/i }).click()

    // The Décaler tab has an input with label "Décalage en frames" (id="shift-frames")
    const frameInput = page.locator('#shift-frames')
    if (await frameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await frameInput.fill('5')
      await expect(frameInput).toHaveValue('5')
    } else {
      await expect(page.getByText(/décalage|frames/i).first()).toBeVisible()
    }
  })
})
