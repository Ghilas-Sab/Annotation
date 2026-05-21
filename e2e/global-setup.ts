import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

export default async function globalSetup() {
  const fixturesDir = path.join(__dirname, 'fixtures')
  const tinyVideoPath = path.join(fixturesDir, 'tiny.mp4')

  if (!existsSync(fixturesDir)) {
    mkdirSync(fixturesDir, { recursive: true })
  }

  if (!existsSync(tinyVideoPath)) {
    console.log('[setup] Génération de la vidéo de test...')
    try {
      execSync(
        `ffmpeg -f lavfi -i color=c=black:size=320x240:rate=25 -t 2 -pix_fmt yuv420p -y "${tinyVideoPath}"`,
        { stdio: 'pipe' }
      )
      console.log('[setup] Vidéo de test générée :', tinyVideoPath)
    } catch {
      console.error('[setup] ffmpeg indisponible. Fournissez e2e/fixtures/tiny.mp4 manuellement.')
      process.exit(1)
    }
  } else {
    console.log('[setup] Vidéo de test déjà présente :', tinyVideoPath)
  }
}
