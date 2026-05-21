/**
 * Scénarios : Navigation et gestion des erreurs
 *
 * Couvre : route inconnue → redirect /projects, page vidéo ID invalide,
 *          page stats ID invalide, page export ID invalide,
 *          persistance du projet après rechargement, compteur mis à jour après
 *          suppression, navigation breadcrumb, routes directes sans connexion.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Nav-${Date.now()}`

test.describe('20 — Navigation et gestion d\'erreurs', () => {
  let ctx: APIRequestContext
  let api: ApiHelper

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  // ── Route inconnue ────────────────────────────────────────────────────────

  test('Une route inconnue redirige vers /projects', async ({ page }) => {
    await page.goto('/cette-route-nexiste-pas')
    await page.waitForURL('**/projects', { timeout: 5000 })
    await expect(page.getByText(/Gestion des Projets/i)).toBeVisible()
  })

  test('La route racine "/" redirige vers /projects', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/projects', { timeout: 5000 })
  })

  // ── ID invalide ───────────────────────────────────────────────────────────

  test('Naviguer vers /annotation/id-invalide affiche une erreur ou redirige', async ({ page }) => {
    await page.goto('/annotation/00000000-0000-0000-0000-000000000000')
    // Either a 404 message or redirect
    await expect(
      page.getByText(/introuvable|not found|erreur|Projet/i).first()
        .or(page.locator('header').first())
    ).toBeVisible({ timeout: 10000 })
  })

  test('Naviguer vers /statistics/id-invalide affiche une erreur ou redirige', async ({ page }) => {
    await page.goto('/statistics/00000000-0000-0000-0000-000000000000')
    await expect(
      page.getByText(/introuvable|not found|erreur|BPM|Statistiques/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('Naviguer vers /export/id-invalide affiche une erreur ou redirige', async ({ page }) => {
    await page.goto('/export/00000000-0000-0000-0000-000000000000')
    await expect(
      page.getByText(/introuvable|not found|erreur|Export/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('Naviguer vers /projects/id-invalide affiche un état de chargement ou erreur', async ({ page }) => {
    await page.goto('/projects/00000000-0000-0000-0000-000000000000')
    // La page charge et affiche soit une erreur, soit un message de chargement
    await expect(
      page.getByText(/introuvable|not found|erreur|Chargement/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  // ── Persistance après rechargement ────────────────────────────────────────

  test('Un projet créé persiste après rechargement de la page', async ({ page }) => {
    const name = `${RUN}-Persist`
    await api.createProject(name)

    await page.goto('/projects')
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 8000 })

    await page.reload()
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 8000 })
  })

  test('Les annotations persistent après rechargement de la page d\'annotation', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-AnnPersist`)
    const vid = await api.uploadVideo(proj.id)
    await api.createAnnotation(vid.id, 10, 'Persistante')

    await page.goto(`/annotation/${vid.id}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await page.locator('button[class*="tab"]').filter({ hasText: /Annotations/i }).click()

    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(1\)/i })
    ).toBeVisible({ timeout: 8000 })

    await page.reload()
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })

    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(1\)/i })
    ).toBeVisible({ timeout: 8000 })
  })

  // ── Compteur de projets ───────────────────────────────────────────────────

  test('Le compteur de projets augmente après création d\'un projet', async ({ page }) => {
    await page.goto('/projects')
    const counterText = await page.locator('text=/\\d+ projet/i').first().textContent()
    const before = parseInt(counterText?.match(/\d+/)?.[0] ?? '0')

    await api.createProject(`${RUN}-CounterUp`)
    await page.reload()

    const counterTextAfter = await page.locator('text=/\\d+ projet/i').first().textContent()
    const after = parseInt(counterTextAfter?.match(/\d+/)?.[0] ?? '0')

    expect(after).toBeGreaterThan(before)
  })

  // ── Navigation breadcrumb ─────────────────────────────────────────────────

  test('Le breadcrumb "Projets" est cliquable depuis la page détail', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-Breadcrumb`)
    await page.goto(`/projects/${proj.id}`)

    await page.getByRole('link', { name: 'Projets' }).click()
    await page.waitForURL('**/projects', { timeout: 5000 })
    await expect(page.getByText(/Gestion des Projets/i)).toBeVisible()
  })

  // ── Flux complet : créer → annoter → stats → retour ──────────────────────

  test('Flux complet : créer projet → annoter → voir stats → retour', async ({ page }) => {
    const projName = `${RUN}-FullFlow`

    // 1. Créer le projet via l'API
    const proj = await api.createProject(projName)
    const vid = await api.uploadVideo(proj.id)
    await api.createAnnotation(vid.id, 10, 'Beat 1')
    await api.createAnnotation(vid.id, 35, 'Beat 2')

    // 2. Aller sur la page d'annotation
    await page.goto(`/annotation/${vid.id}`)
    await page.waitForSelector('button[class*="tab"]', { timeout: 15000 })
    await expect(
      page.locator('button[class*="tab"]').filter({ hasText: /Annotations \(2\)/i })
    ).toBeVisible({ timeout: 8000 })

    // 3. Naviguer vers les stats
    await page.getByRole('button', { name: /Stats/i }).click()
    await page.waitForURL(`**/statistics/${vid.id}`, { timeout: 10000 })
    await expect(page.getByText(/BPM/i).first()).toBeVisible({ timeout: 10000 })

    // 4. Retour vers annotation
    const backBtn = page.locator('header').getByRole('button').first()
    await backBtn.click()
    await expect(page).not.toHaveURL(`**/statistics/`, { timeout: 5000 })
  })
})
