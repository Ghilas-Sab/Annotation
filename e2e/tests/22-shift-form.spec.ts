/**
 * Scénarios : Décalage global des annotations (ShiftForm)
 *
 * Couvre : ouverture onglet "Décaler tout", champ #shift-frames, validation
 *          (vide = disabled, 0 = disabled), décalage positif, décalage négatif,
 *          texte du bouton reflète la valeur, reset après soumission.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Shift-${Date.now()}`

test.describe('22 — Décalage global des annotations (ShiftForm)', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Shift`)
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  test.beforeEach(async () => {
    await api.clearAnnotations(videoId)
    await api.createAnnotation(videoId, 10, 'A')
    await api.createAnnotation(videoId, 25, 'B')
  })

  async function goToShiftTab(page: import('@playwright/test').Page) {
    await page.goto(`/annotation/${videoId}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('button[class*="tab"]').filter({ hasText: /Décaler/i }).click()
    await expect(page.locator('#shift-frames')).toBeVisible({ timeout: 8000 })
  }

  // ── Affichage du formulaire ───────────────────────────────────────────────

  test('L\'onglet Décaler tout affiche le formulaire ShiftForm', async ({ page }) => {
    await goToShiftTab(page)
    await expect(page.getByText(/Décaler toutes les annotations/i)).toBeVisible()
  })

  test('Le champ de décalage est visible avec placeholder "ex: 5 ou -3"', async ({ page }) => {
    await goToShiftTab(page)
    const input = page.locator('#shift-frames')
    await expect(input).toBeVisible()
    const ph = await input.getAttribute('placeholder')
    expect(ph).toMatch(/5|−3|-3/)
  })

  test('Le texte informatif "Positif = avancer · Négatif = reculer" est présent', async ({ page }) => {
    await goToShiftTab(page)
    await expect(page.getByText(/Positif.*avancer|Négatif.*reculer/i)).toBeVisible()
  })

  // ── Validation ────────────────────────────────────────────────────────────

  test('Le bouton est désactivé quand le champ est vide', async ({ page }) => {
    await goToShiftTab(page)
    const btn = page.getByRole('button', { name: /Décaler/i }).last()
    await expect(btn).toBeDisabled()
  })

  test('Le bouton est désactivé si la valeur est 0', async ({ page }) => {
    await goToShiftTab(page)
    await page.locator('#shift-frames').fill('0')
    const btn = page.getByRole('button', { name: /Décaler/i }).last()
    await expect(btn).toBeDisabled()
  })

  test('Le bouton est actif après saisie d\'une valeur non nulle', async ({ page }) => {
    await goToShiftTab(page)
    await page.locator('#shift-frames').fill('5')
    const btn = page.getByRole('button', { name: /Décaler/i }).last()
    await expect(btn).toBeEnabled()
  })

  // ── Texte dynamique du bouton ─────────────────────────────────────────────

  test('Le bouton affiche "Décaler de +5 frames" après saisie de 5', async ({ page }) => {
    await goToShiftTab(page)
    await page.locator('#shift-frames').fill('5')
    await expect(
      page.getByRole('button', { name: 'Décaler de +5 frames' })
    ).toBeVisible({ timeout: 3000 })
  })

  test('Le bouton affiche "Décaler de -3 frames" après saisie de -3', async ({ page }) => {
    await goToShiftTab(page)
    await page.locator('#shift-frames').fill('-3')
    await expect(
      page.getByRole('button', { name: 'Décaler de -3 frames' })
    ).toBeVisible({ timeout: 3000 })
  })

  // ── Décalage positif ──────────────────────────────────────────────────────

  test('Un décalage positif de 5 frames avance les annotations', async ({ page }) => {
    await goToShiftTab(page)

    const before = await api.listAnnotations(videoId)
    const frame0Before = before.find(a => a.frame_number === 10)?.frame_number ?? 10

    await page.locator('#shift-frames').fill('5')
    await page.getByRole('button', { name: 'Décaler de +5 frames' }).click()

    // Attendre que l'opération se termine
    await page.waitForTimeout(1500)

    const after = await api.listAnnotations(videoId)
    const frames = after.map(a => a.frame_number)
    // Au moins une annotation a avancé de 5 frames
    expect(frames.some(f => f === frame0Before + 5)).toBe(true)
  })

  // ── Décalage négatif ──────────────────────────────────────────────────────

  test('Un décalage négatif de -5 frames recule les annotations', async ({ page }) => {
    // Créer des annotations suffisamment avancées pour ne pas dépasser frame 0
    await api.clearAnnotations(videoId)
    await api.createAnnotation(videoId, 20, 'C')
    await api.createAnnotation(videoId, 40, 'D')

    await goToShiftTab(page)

    await page.locator('#shift-frames').fill('-5')
    await page.getByRole('button', { name: 'Décaler de -5 frames' }).click()

    await page.waitForTimeout(1500)

    const after = await api.listAnnotations(videoId)
    const frames = after.map(a => a.frame_number)
    expect(frames.some(f => f === 15)).toBe(true)
  })

  // ── Reset après soumission ────────────────────────────────────────────────

  test('Le champ est réinitialisé à vide après soumission', async ({ page }) => {
    await goToShiftTab(page)
    await page.locator('#shift-frames').fill('3')
    await page.getByRole('button', { name: 'Décaler de +3 frames' }).click()

    // Après soumission, le champ doit être vide
    await expect(page.locator('#shift-frames')).toHaveValue('', { timeout: 5000 })
  })
})
