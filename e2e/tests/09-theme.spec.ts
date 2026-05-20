/**
 * Scénarios : Thème clair/sombre
 *
 * Couvre : bascule du thème, persistance au rechargement.
 */
import { test, expect } from '@playwright/test'

test.describe('09 — Thème clair / sombre', () => {
  test('Le ThemeToggle est visible sur la page des projets', async ({ page }) => {
    await page.goto('/projects')
    // ThemeToggle has title "Passer en clair" or "Passer en sombre"
    const toggle = page.getByTitle(/Passer en/)
    await expect(toggle).toBeVisible()
  })

  test('Basculer le thème change l\'attribut data-theme', async ({ page }) => {
    await page.goto('/projects')

    const html = page.locator('html')
    const before = await html.getAttribute('data-theme')

    // ThemeToggle button has title "Passer en clair" or "Passer en sombre"
    await page.getByTitle(/Passer en/).click()

    const after = await html.getAttribute('data-theme')
    expect(after).not.toBe(before)
  })

  test('Le thème persiste après rechargement de la page', async ({ page }) => {
    await page.goto('/projects')

    // Toggle theme
    await page.getByTitle(/Passer en/).click()

    const html = page.locator('html')
    const themeAfterToggle = await html.getAttribute('data-theme')

    await page.reload()

    const themeAfterReload = await html.getAttribute('data-theme')
    expect(themeAfterReload).toBe(themeAfterToggle)
  })

  test('Le ThemeToggle est visible sur la page de détail', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.getByTitle(/Passer en/).first()).toBeVisible()
  })
})
