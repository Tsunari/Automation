import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import {
  getCommitlintTemplate,
  getPrettierTemplate,
  getHuskyCommitMsg,
  getHuskyPreCommit,
  getLintStagedTemplate,
  getReleaseConfigTemplate,
  getGenerateVersionTemplate,
  getReleaseJsTemplate,
} from './templates.js'

/**
 * Ensures a directory exists.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

/**
 * Safely merges user options into package.json scripts and devDependencies.
 */
export function updatePackageJson(projectPath, packageManager, releaseConfig) {
  const pkgPath = path.join(projectPath, 'package.json')

  if (!fs.existsSync(pkgPath)) {
    // Scaffold minimal package.json if missing
    fs.writeFileSync(
      pkgPath,
      JSON.stringify(
        {
          name: path.basename(projectPath),
          version: '1.0.0',
          private: true,
          type: 'module',
        },
        null,
        2,
      ) + '\n',
      'utf8',
    )
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

  // 1. Core scripts
  pkg.scripts = pkg.scripts || {}
  pkg.scripts.release = 'node scripts/release.js'
  pkg.scripts.prepare = 'husky'

  const anyGenVer =
    releaseConfig.generateVersionJson ||
    (releaseConfig.projects && releaseConfig.projects.some((p) => p.generateVersionJson))

  if (anyGenVer) {
    if (pkg.scripts.build) {
      if (!pkg.scripts.build.includes('generate-version.js')) {
        pkg.scripts.build = `node scripts/generate-version.js && ${pkg.scripts.build}`
      }
    } else {
      pkg.scripts.build = 'node scripts/generate-version.js'
    }
  }

  // 2. Add empty devDependencies block if missing
  pkg.devDependencies = pkg.devDependencies || {}

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
}

/**
 * Writes boilerplate configuration files idempotently.
 */
export function writeConfigurations(projectPath, packageManager, languages, releaseConfig) {
  const checkAndWrite = (relPath, content) => {
    const fullPath = path.join(projectPath, relPath)
    ensureDir(path.dirname(fullPath))
    fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8')
  }

  // 1. Commitlint & Prettier (Always overwritten to keep clean syntax standards)
  checkAndWrite('.commitlintrc.json', getCommitlintTemplate())
  checkAndWrite('.prettierrc', getPrettierTemplate())

  // 2. lint-staged (Overwrite)
  checkAndWrite('lint-staged.config.js', getLintStagedTemplate(languages))

  // 3. Husky Hooks (Always force update to ensure scripts resolve the selected package manager)
  checkAndWrite('.husky/commit-msg', getHuskyCommitMsg(packageManager))
  checkAndWrite('.husky/pre-commit', getHuskyPreCommit(packageManager))

  // Make Husky hook files executable on Unix
  try {
    execSync(
      `chmod +x "${path.join(projectPath, '.husky/commit-msg')}" "${path.join(projectPath, '.husky/pre-commit')}"`,
      { stdio: 'ignore' },
    )
  } catch (e) {
    // Ignore on Windows
  }

  // 4. release.config.json (Safe Merge to preserve custom versions/filenames)
  const configPath = path.join(projectPath, 'release.config.json')
  let mergedConfig = releaseConfig
  if (fs.existsSync(configPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      mergedConfig = { ...existing, ...releaseConfig }
    } catch (e) {
      // Ignore corrupt JSON
    }
  }
  checkAndWrite('release.config.json', JSON.stringify(mergedConfig, null, 2))

  // 5. Release execution scripts
  checkAndWrite('scripts/release.js', getReleaseJsTemplate())
  const anyGenVer =
    mergedConfig.generateVersionJson ||
    (mergedConfig.projects && mergedConfig.projects.some((p) => p.generateVersionJson))

  if (anyGenVer) {
    checkAndWrite('scripts/generate-version.js', getGenerateVersionTemplate())
  } else {
    // Clean up generate-version if feature disabled
    const genVerPath = path.join(projectPath, 'scripts/generate-version.js')
    if (fs.existsSync(genVerPath)) {
      fs.unlinkSync(genVerPath)
    }
  }

  // 6. Generic version file placeholder if not standard package.json source
  if (mergedConfig.versionSource === 'version.json') {
    const versionFilePath = path.join(projectPath, 'version.json')
    if (!fs.existsSync(versionFilePath)) {
      checkAndWrite('version.json', '1.0.0')
    }
  }
}

/**
 * Installs all required packages and initializes Husky.
 */
export function installDependencies(projectPath, packageManager) {
  let installCmd = 'pnpm add -D'
  if (packageManager === 'yarn') {
    installCmd = 'yarn add -D'
  } else if (packageManager === 'npm') {
    installCmd = 'npm install --save-dev'
  }

  const deps = [
    'husky',
    'lint-staged',
    'prettier',
    '@commitlint/cli',
    '@commitlint/config-conventional',
  ]

  // Execute package manager installation
  execSync(`${installCmd} ${deps.join(' ')}`, { cwd: projectPath, stdio: 'pipe' })

  // Initialize Husky hooks locally
  try {
    const runPrepareCmd =
      packageManager === 'npm' ? 'npm run prepare' : `${packageManager} run prepare`
    execSync(runPrepareCmd, { cwd: projectPath, stdio: 'pipe' })
  } catch (err) {
    // If Husky setup fails (e.g. not in Git repository yet), run manual creation
    try {
      execSync('npx husky init', { cwd: projectPath, stdio: 'pipe' })
    } catch (e) {
      throw new Error(`Failed to compile Husky hooks: ${err.message}`)
    }
  }
}
