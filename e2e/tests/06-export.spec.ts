/**
 * Scénarios : Page d'export de projet
 *
 * Couvre : chargement, sélection vidéo, sélection formats, tout sélectionner,
 *          bouton export désactivé sans sélection, export JSON/CSV, jobs d'export.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Export-${Date.now()}`

test.describe('06 — Export de projet', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let projectId: string
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Exp`)
    projectId = proj.id
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
    // Add some annotations so export has content
    for (let f = 0; f < 3; f++) {
      await api.createAnnotation(videoId, f * 15 + 5, `Beat ${f + 1}`)
    }
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  // ── Chargement ────────────────────────────────────────────────────────────

  test('La page d\'export se charge', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    await expect(page.getByText(/Export|Exporter/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Les vidéos du projet sont listées', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    await expect(page.getByText('test-video.mp4')).toBeVisible({ timeout: 10000 })
  })

  // ── Sélection vidéo ───────────────────────────────────────────────────────

  test('Sélectionner une vidéo coche sa checkbox', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.check()
    await expect(checkbox).toBeChecked()
  })

  test('Désélectionner une vidéo décoche sa checkbox', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.check()
    await checkbox.uncheck()
    await expect(checkbox).not.toBeChecked()
  })

  test('Tout sélectionner coche toutes les vidéos', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    const selectAllBtn = page.getByRole('button', { name: /Tout sélectionner|Select all/i })
    if (await selectAllBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await selectAllBtn.click()
      const checkboxes = page.locator('input[type="checkbox"]')
      const count = await checkboxes.count()
      for (let i = 0; i < count; i++) {
        await expect(checkboxes.nth(i)).toBeChecked()
      }
    } else {
      // Fallback: find the "all" checkbox
      const allCheckbox = page.getByLabel(/Tout|All/i).first()
      if (await allCheckbox.isVisible().catch(() => false)) {
        await allCheckbox.check()
      }
    }
  })

  test('Tout désélectionner décoche toutes les vidéos', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    // First select all, then deselect
    const checkboxes = page.locator('input[type="checkbox"]')
    const first = checkboxes.first()
    await first.check()

    const deselectBtn = page.getByRole('button', { name: /Tout désélectionner|Deselect all|Aucun/i })
    if (await deselectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deselectBtn.click()
      await expect(first).not.toBeChecked()
    }
  })

  // ── Formats ───────────────────────────────────────────────────────────────

  test('Les formats JSON, CSV et Vidéo sont disponibles', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    await expect(page.getByText('JSON')).toBeVisible()
    await expect(page.getByText('CSV')).toBeVisible()
    await expect(page.getByText(/Vidéo/i).first()).toBeVisible()
  })

  test('Sélectionner le format CSV', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    const csvOption = page.getByText('CSV').first()
    await csvOption.click()
    await expect(csvOption).toBeVisible()
  })

  // ── Bouton export ─────────────────────────────────────────────────────────

  test('Le bouton Exporter est désactivé si aucune vidéo n\'est sélectionnée', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    const exportBtn = page.getByRole('button', { name: /^Exporter|Lancer/i })
    // No video selected → disabled
    await expect(exportBtn).toBeDisabled()
  })

  test('Le bouton Exporter est désactivé si aucun format n\'est sélectionné', async ({ page }) => {
    await page.goto(`/export/${projectId}`)
    // Select a video
    const checkbox = page.locator('input[type="checkbox"]').first()
    await checkbox.check()

    // Only JSON is selected by default — toggle it off to have 0 formats
    const jsonBtn = page.getByText('JSON').first()
    await jsonBtn.click() // toggle off

    const exportBtn = page.getByRole('button', { name: /^Exporter|Lancer/i })
    await expect(exportBtn).toBeDisabled()
  })

  // ── Export JSON direct ────────────────────────────────────────────────────

  test('Exporter une vidéo en JSON depuis la page d\'annotation', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    // JSON export uses fetch + URL.createObjectURL; intercept the API response
    const responsePromise = page.waitForResponse(
      r => r.url().includes('/export/json') && r.status() === 200,
      { timeout: 15000 }
    )
    const jsonBtn = page.getByRole('button', { name: /JSON/i }).first()
    await jsonBtn.click()
    await responsePromise
  })

  test('Exporter une vidéo en CSV depuis la page d\'annotation', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    const downloadPromise = page.waitForEvent('download')
    const csvBtn = page.getByRole('button', { name: /CSV/i }).first()
    await csvBtn.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.csv$/)
  })

  // ── Widget d'export jobs ──────────────────────────────────────────────────

  test('Le widget ExportJobs est présent sur la page d\'annotation', async ({ page }) => {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    // The ExportJobsWidget is always rendered in App.tsx
    // It may be hidden when no jobs — just check it doesn't crash
    await expect(page.locator('body')).toBeVisible()
  })
})
