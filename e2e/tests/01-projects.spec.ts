/**
 * Scénarios : Gestion des projets
 *
 * Couvre : création, recherche, navigation, suppression, état vide, compteurs.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Proj-${Date.now()}`

test.describe('01 — Gestion des projets', () => {
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

  // ── Navigation ────────────────────────────────────────────────────────────

  test('La page /projects se charge et affiche le titre', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByText('Gestion des Projets')).toBeVisible()
    await expect(page.getByRole('button', { name: /Nouveau projet/ })).toBeVisible()
  })

  test('La route racine redirige vers /projects', async ({ page }) => {
    await page.goto('/')
    await page.waitForURL('**/projects')
    await expect(page.getByText('Gestion des Projets')).toBeVisible()
  })

  // ── Création ──────────────────────────────────────────────────────────────

  test('Créer un projet via le formulaire', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /Nouveau projet/ }).click()

    await expect(page.getByText('Créer un nouveau projet')).toBeVisible()

    const name = `${RUN}-Form`
    await page.getByLabel('Nom du projet').fill(name)
    await page.getByRole('button', { name: /Créer le projet/ }).click()

    await page.waitForURL(/\/projects\/[a-z0-9-]+/)
    await page.goto('/projects')
    await expect(page.getByText(name)).toBeVisible()
  })

  test('Créer un projet avec la touche Entrée', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /Nouveau projet/ }).click()

    const name = `${RUN}-Enter`
    await page.getByLabel('Nom du projet').fill(name)
    await page.getByLabel('Nom du projet').press('Enter')

    await page.waitForURL(/\/projects\/[a-z0-9-]+/)
    await page.goto('/projects')
    await expect(page.getByText(name)).toBeVisible()
  })

  test('Le bouton Créer est désactivé si le nom est vide', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /Nouveau projet/ }).click()

    const createBtn = page.getByRole('button', { name: /Créer le projet/ })
    await expect(createBtn).toBeDisabled()

    await page.getByLabel('Nom du projet').fill('x')
    await expect(createBtn).toBeEnabled()
  })

  test('Annuler la création avec la touche Échap', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /Nouveau projet/ }).click()
    await expect(page.getByText('Créer un nouveau projet')).toBeVisible()

    await page.getByLabel('Nom du projet').press('Escape')
    await expect(page.getByText('Créer un nouveau projet')).not.toBeVisible()
  })

  test('Annuler la création avec le bouton Annuler', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /Nouveau projet/ }).click()
    await page.getByRole('button', { name: 'Annuler' }).click()

    await expect(page.getByText('Créer un nouveau projet')).not.toBeVisible()
  })

  // ── Recherche ─────────────────────────────────────────────────────────────

  test('Rechercher un projet par nom', async ({ page }) => {
    const name = `${RUN}-Search`
    await api.createProject(name)

    await page.goto('/projects')
    await page.getByPlaceholder('Rechercher…').fill(name)
    await expect(page.getByText(name)).toBeVisible()
  })

  test('Recherche sans résultat masque les projets non correspondants', async ({ page }) => {
    const name = `${RUN}-Visible`
    await api.createProject(name)

    await page.goto('/projects')
    await page.getByPlaceholder('Rechercher…').fill('XZXZXZ_introuvable_XZXZ')
    await expect(page.getByText(name)).not.toBeVisible()
  })

  test('Effacer la recherche restaure tous les projets', async ({ page }) => {
    const name = `${RUN}-Restore`
    await api.createProject(name)

    await page.goto('/projects')
    await page.getByPlaceholder('Rechercher…').fill('XZXZXZ_introuvable_XZXZ')
    await page.getByPlaceholder('Rechercher…').clear()
    await expect(page.getByText(name)).toBeVisible()
  })

  // ── Navigation vers le détail ─────────────────────────────────────────────

  test('Cliquer sur une carte projet ouvre la page détail', async ({ page }) => {
    const name = `${RUN}-Click`
    const proj = await api.createProject(name)

    await page.goto('/projects')
    await page.getByText(name).first().click()

    await page.waitForURL(`**/projects/${proj.id}`)
    await expect(page.getByText(name).first()).toBeVisible()
  })

  // ── Suppression ───────────────────────────────────────────────────────────

  test('Supprimer un projet après confirmation', async ({ page }) => {
    const name = `${RUN}-Del`
    await api.createProject(name)

    await page.goto('/projects')
    await expect(page.getByText(name)).toBeVisible({ timeout: 8000 })

    // Accept dialog automatically
    page.on('dialog', (d) => d.accept())

    // Hovering the project name triggers onMouseEnter on the parent card
    const nameEl = page.getByText(name).first()
    await nameEl.hover()

    const deleteBtn = page.getByRole('button', { name: 'Supprimer le projet' }).first()
    await deleteBtn.waitFor({ state: 'visible', timeout: 5000 })
    await deleteBtn.click()

    await expect(page.getByText(name)).not.toBeVisible({ timeout: 8000 })
  })

  test('Annuler la suppression conserve le projet', async ({ page }) => {
    const name = `${RUN}-NoDel`
    await api.createProject(name)

    await page.goto('/projects')
    await expect(page.getByText(name)).toBeVisible({ timeout: 8000 })

    // Dismiss dialog
    page.on('dialog', (d) => d.dismiss())

    const nameEl = page.getByText(name).first()
    await nameEl.hover()

    const deleteBtn = page.getByRole('button', { name: 'Supprimer le projet' }).first()
    await deleteBtn.waitFor({ state: 'visible', timeout: 5000 })
    await deleteBtn.click()

    await expect(page.getByText(name).first()).toBeVisible()
  })

  // ── Compteurs header ──────────────────────────────────────────────────────

  test('Les compteurs Projets et Vidéos sont visibles dans l\'en-tête', async ({ page }) => {
    await page.goto('/projects')
    // Counter labels are in the header (not in the main content)
    await expect(page.locator('header').getByText('Projets', { exact: true })).toBeVisible()
    await expect(page.locator('header').getByText('Vidéos', { exact: true })).toBeVisible()
  })

  test('Le compteur de projets filtrés est affiché sous le titre', async ({ page }) => {
    await page.goto('/projects')
    // "N projet(s)" appears below the title
    await expect(page.locator('text=/\\d+ projet/i')).toBeVisible()
  })
})
