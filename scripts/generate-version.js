import fs from 'fs'
import path from 'path'

const configPath = path.resolve(process.cwd(), 'release.config.json')

try {
  if (!fs.existsSync(configPath)) {
    console.error('release.config.json not found')
    process.exit(1)
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  const sourcePath = path.resolve(process.cwd(), config.versionSource)
  const changelogPath = path.resolve(process.cwd(), config.changelogPath)
  const outputPath = path.resolve(process.cwd(), config.versionJsonPath)

  if (!fs.existsSync(sourcePath)) {
    console.error(`Version source file not found at ${config.versionSource}`)
    process.exit(1)
  }

  const pkgJson = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  const version = pkgJson.version

  let changelog = ''
  if (fs.existsSync(changelogPath)) {
    let rawChangelog = fs.readFileSync(changelogPath, 'utf8')
    changelog = rawChangelog.replace(/^#\s+Changelog\s*$/gim, '')
    changelog = changelog.replace(/\s*\(\[[a-f0-9]+\]\(https?:\/\/[^\)]+\)\)/gi, '')
    changelog = changelog.replace(/##\s+\[([^\]]+)\]\((?:https?:\/\/[^\)]+)\)/gi, '## $1')
    changelog = changelog.trim()
  }

  const publicDir = path.dirname(outputPath)
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const versionInfo = {
    version,
    buildTime: new Date().toISOString(),
    changelog,
  }

  fs.writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2), 'utf8')
  console.log(`Successfully generated ${config.versionJsonPath} for v${version}`)
} catch (error) {
  console.error('Failed to generate version info:', error)
  process.exit(1)
}
