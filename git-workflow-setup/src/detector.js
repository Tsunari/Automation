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
