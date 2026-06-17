import fs from 'fs'
import path from 'path'

const configPath = path.resolve(process.cwd(), 'release.config.json')

try {
  if (!fs.existsSync(configPath)) {
    console.error('release.config.json not found')
    process.exit(1)
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

  const args = process.argv.slice(2)
  const targetProjectName = args[0]

  // Resolve config to project or root
  let projectConfig = config
  if (config.projects && Array.isArray(config.projects)) {
    if (targetProjectName) {
      projectConfig =
        config.projects.find((p) => p.name === targetProjectName) || config.projects[0]
    } else {
      projectConfig = config.projects[0]
    }
  }

  const sourcePath = path.resolve(process.cwd(), projectConfig.versionSource)
  const changelogPath = path.resolve(process.cwd(), projectConfig.changelogPath)

  if (!projectConfig.versionJsonPath) {
    console.error('No versionJsonPath defined in configuration.')
    process.exit(1)
  }
  const outputPath = path.resolve(process.cwd(), projectConfig.versionJsonPath)

  if (!fs.existsSync(sourcePath)) {
    console.error(`Version source file not found at ${projectConfig.versionSource}`)
    process.exit(1)
  }

  // Handle version source reading
  let version = ''
  if (projectConfig.versionSource.endsWith('.json')) {
    const jsonContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
    version = jsonContent.version
  } else {
    version = fs.readFileSync(sourcePath, 'utf8').trim()
  }

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
  console.log(`Successfully generated ${projectConfig.versionJsonPath} for v${version}`)
} catch (error) {
  console.error('Failed to generate version info:', error)
  process.exit(1)
}
