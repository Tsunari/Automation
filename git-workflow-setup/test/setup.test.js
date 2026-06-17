import fs from 'fs'
import path from 'path'
import os from 'os'
import { detectLanguages, detectPackageManager, detectExistingConfigs } from '../src/detector.js'
import { updatePackageJson, writeConfigurations } from '../src/writer.js'

const tempTestDir = path.resolve(os.homedir(), '.gemini/antigravity-ide/scratch/test-project-mock')

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

console.log(`${colors.bright}${colors.cyan}Running automated setup test verification...${colors.reset}\n`)

function assert(condition, message) {
  if (!condition) {
    console.error(`  ${colors.red}✘ Assertion Failed:${colors.reset} ${message}`)
    process.exit(1)
  }
  console.log(`  ${colors.green}✔ Passed:${colors.reset} ${message}`)
}

try {
  // 1. Clean and recreate mock folder
  if (fs.existsSync(tempTestDir)) {
    fs.rmSync(tempTestDir, { recursive: true, force: true })
  }
  fs.mkdirSync(tempTestDir, { recursive: true })

  // 2. Write simulated files
  fs.writeFileSync(path.join(tempTestDir, 'tsconfig.json'), '{}', 'utf8')
  fs.writeFileSync(path.join(tempTestDir, 'requirements.txt'), '', 'utf8')
  fs.writeFileSync(path.join(tempTestDir, 'go.mod'), 'module test', 'utf8')
  fs.writeFileSync(path.join(tempTestDir, 'pnpm-lock.yaml'), '', 'utf8')

  // 3. Test Auto-Detections
  const langs = detectLanguages(tempTestDir)
  assert(langs.includes('javascript'), 'Should detect JavaScript/TypeScript project files.')
  assert(langs.includes('python'), 'Should detect Python project files.')
  assert(langs.includes('go'), 'Should detect Go project files.')
  assert(!langs.includes('rust'), 'Should not detect Rust files.')

  const pm = detectPackageManager(tempTestDir)
  assert(pm === 'pnpm', 'Should detect pnpm package manager from lockfile.')

  // 4. Test Configuration Writing (Initial run)
  const defaultReleaseConfig = {
    versionSource: 'package.json',
    changelogPath: 'CHANGELOG.md',
    push: true,
    githubRelease: true,
    generateVersionJson: true,
    versionJsonPath: 'public/version.json',
    buildStep: 'pnpm run build'
  }

  updatePackageJson(tempTestDir, 'pnpm', defaultReleaseConfig)
  writeConfigurations(tempTestDir, 'pnpm', langs, defaultReleaseConfig)

  // Verify created files
  assert(fs.existsSync(path.join(tempTestDir, '.commitlintrc.json')), 'Should write commitlint configurations.')
  assert(fs.existsSync(path.join(tempTestDir, 'lint-staged.config.js')), 'Should write lint-staged script mapping.')
  assert(fs.existsSync(path.join(tempTestDir, 'release.config.json')), 'Should write release config file.')
  assert(fs.existsSync(path.join(tempTestDir, 'scripts/release.js')), 'Should write release runner script.')
  assert(fs.existsSync(path.join(tempTestDir, '.husky/commit-msg')), 'Should write husky commit-msg hook.')

  // Verify package.json script additions
  const pkg = JSON.parse(fs.readFileSync(path.join(tempTestDir, 'package.json'), 'utf8'))
  assert(pkg.scripts.release === 'node scripts/release.js', 'Should write package release script alias.')
  assert(pkg.scripts.prepare === 'husky', 'Should write prepare script command.')

  // 5. Test Config Merging (Second run / Re-run with updates)
  const configsBefore = detectExistingConfigs(tempTestDir)
  assert(configsBefore.releaseConfig !== null, 'Should detect pre-existing release config json.')

  const updatedReleaseConfig = {
    push: false,
    githubRelease: false,
    buildStep: 'pnpm test'
  }

  writeConfigurations(tempTestDir, 'pnpm', langs, updatedReleaseConfig)

  // Verify that the config fields merged modularly rather than wiping
  const mergedConfig = JSON.parse(fs.readFileSync(path.join(tempTestDir, 'release.config.json'), 'utf8'))
  assert(mergedConfig.push === false, 'Should update modified boolean toggles.')
  assert(mergedConfig.githubRelease === false, 'Should update release parameters.')
  assert(mergedConfig.buildStep === 'pnpm test', 'Should update string build commands.')
  assert(mergedConfig.versionSource === 'package.json', 'Should preserve original unmodified versionSource.')
  assert(mergedConfig.changelogPath === 'CHANGELOG.md', 'Should preserve original unmodified filenames.')

  // Clean up
  fs.rmSync(tempTestDir, { recursive: true, force: true })

  console.log(`\n${colors.bright}${colors.green}All test verifications passed successfully! 🚀${colors.reset}`)
  process.exit(0)
} catch (error) {
  console.error(`\n${colors.bright}${colors.red}Test suite execution failed:${colors.reset}`, error)
  process.exit(1)
}
