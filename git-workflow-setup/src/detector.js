import fs from 'fs'
import path from 'path'

/**
 * Scans the project directory to detect files matching standard language structures.
 * @param {string} projectPath
 * @returns {string[]} Detected languages
 */
export function detectLanguages(projectPath) {
  const languages = []

  const checkFile = (file) => fs.existsSync(path.join(projectPath, file))

  // 1. TS/JS
  if (
    checkFile('package.json') ||
    checkFile('tsconfig.json') ||
    checkFile('vite.config.ts') ||
    checkFile('vite.config.js') ||
    checkFile('eslint.config.js')
  ) {
    languages.push('javascript')
  }

  // 2. Python
  if (
    checkFile('requirements.txt') ||
    checkFile('pyproject.toml') ||
    checkFile('setup.py') ||
    checkFile('Pipfile') ||
    checkFile('poetry.lock')
  ) {
    languages.push('python')
  }

  // 3. Go
  if (checkFile('go.mod') || checkFile('go.sum')) {
    languages.push('go')
  }

  // 4. Rust
  if (checkFile('Cargo.toml') || checkFile('Cargo.lock')) {
    languages.push('rust')
  }

  return languages.length > 0 ? languages : ['general']
}

/**
 * Scans the project directory for standard lockfiles to determine the package manager.
 * @param {string} projectPath
 * @returns {'pnpm' | 'yarn' | 'npm' | null} Detected package manager
 */
export function detectPackageManager(projectPath) {
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) {
    return 'yarn'
  }
  if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) {
    return 'npm'
  }
  return null
}

/**
 * Scans for existing git-workflow configuration files.
 * @param {string} projectPath
 * @returns {object} Maps file names to metadata or parsed configs
 */
export function detectExistingConfigs(projectPath) {
  const configs = {
    releaseConfig: null,
    commitlint: false,
    lintStaged: false,
    prettier: false,
    husky: false,
  }

  // 1. release.config.json
  const releaseConfigPath = path.join(projectPath, 'release.config.json')
  if (fs.existsSync(releaseConfigPath)) {
    try {
      configs.releaseConfig = JSON.parse(fs.readFileSync(releaseConfigPath, 'utf8'))
    } catch (e) {
      // Corrupt or invalid JSON, treat as null
    }
  }

  // 2. Others
  configs.commitlint = fs.existsSync(path.join(projectPath, '.commitlintrc.json'))
  configs.lintStaged = fs.existsSync(path.join(projectPath, 'lint-staged.config.js'))
  configs.prettier = fs.existsSync(path.join(projectPath, '.prettierrc'))
  configs.husky = fs.existsSync(path.join(projectPath, '.husky'))

  return configs
}

/**
 * Intelligently detects the build step for the workspace.
 * @param {string} projectPath
 * @param {string} packageManager
 * @param {string[]} languages
 * @returns {string | null} Suggested build step or null
 */
export function detectBuildStep(projectPath, packageManager, languages) {
  // Check package.json for build scripts if JS/TS
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
      if (pkg.scripts && pkg.scripts.build) {
        const pm = packageManager || 'pnpm'
        return `${pm} run build`
      }
      if (pkg.scripts && pkg.scripts.compile) {
        const pm = packageManager || 'pnpm'
        return `${pm} run compile`
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Check language spec files
  if (languages.includes('rust') && fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
    return 'cargo build'
  }
  if (languages.includes('go') && fs.existsSync(path.join(projectPath, 'go.mod'))) {
    return 'go build'
  }

  return null
}

/**
 * Scans subdirectories for package structures (package.json, go.mod, Cargo.toml) to pre-populate monorepo projects.
 * @param {string} projectPath
 * @returns {object[]} Pre-populated project configuration blocks
 */
export function scanSubProjects(projectPath) {
  const projects = []

  // 1. Add the root project itself
  const hasRootPackageJson = fs.existsSync(path.join(projectPath, 'package.json'))
  projects.push({
    name: 'automation',
    path: '.',
    versionSource: hasRootPackageJson ? 'package.json' : 'version.json',
    changelogPath: 'CHANGELOG.md',
    generateVersionJson: hasRootPackageJson,
    versionJsonPath: 'public/version.json',
    buildStep: hasRootPackageJson ? 'pnpm run build' : null,
    workflowVersion: '1.0.0',
  })

  // 2. Scan sub-directories
  try {
    const entries = fs.readdirSync(projectPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name
        if (
          name.startsWith('.') ||
          name === 'node_modules' ||
          name === 'public' ||
          name === 'scripts'
        ) {
          continue
        }

        const subDirPath = path.join(projectPath, name)
        const hasPkgJson = fs.existsSync(path.join(subDirPath, 'package.json'))
        const hasGoMod = fs.existsSync(path.join(subDirPath, 'go.mod'))
        const hasCargo = fs.existsSync(path.join(subDirPath, 'Cargo.toml'))

        if (hasPkgJson || hasGoMod || hasCargo) {
          projects.push({
            name,
            path: name,
            versionSource: hasPkgJson ? `${name}/package.json` : `${name}/version.json`,
            changelogPath: `${name}/CHANGELOG.md`,
            generateVersionJson: false,
          })
        }
      }
    }
  } catch (e) {
    // ignore
  }

  return projects
}
