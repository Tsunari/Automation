#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import * as p from '@clack/prompts'
import {
  detectLanguages,
  detectPackageManager,
  detectExistingConfigs,
  detectBuildStep
} from './detector.js'
import {
  updatePackageJson,
  writeConfigurations,
  installDependencies
} from './writer.js'

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
}

async function run() {
  p.intro(
    `${colors.bright}${colors.cyan}Git Pipeline & Release Initializer${colors.reset}`
  )

  const targetPath = process.cwd()
  p.log.info(`Target workspace: ${colors.bright}${targetPath}${colors.reset}`)

  // 1. Initialize Git sanity checks
  if (!fs.existsSync(path.join(targetPath, '.git'))) {
    p.log.warn('Warning: This workspace is not a Git repository. Husky hooks might fail to bind.')
    const proceed = await p.confirm({
      message: 'Do you want to initialize Git and continue anyway?',
      initialValue: true,
    })
    if (p.isCancel(proceed) || !proceed) {
      p.cancel('Setup aborted.')
      process.exit(0)
    }
    // Try to run git init
    try {
      import('child_process').then(({ execSync }) => {
        execSync('git init', { cwd: targetPath, stdio: 'ignore' })
        p.log.success('Initialized Git repository.')
      })
    } catch (e) {
      p.log.error('Failed to run git init.')
    }
  }

  // 2. Perform Workspace Auto-Detections
  const detectedLanguages = detectLanguages(targetPath)
  const detectedPm = detectPackageManager(targetPath)
  const existingConfigs = detectExistingConfigs(targetPath)

  // 3. Prompt for Language verification/selection
  const selectedLanguages = await p.multiselect({
    message: 'Select project languages (detected selections highlighted):',
    options: [
      { value: 'javascript', label: 'JavaScript / TypeScript' },
      { value: 'python', label: 'Python' },
      { value: 'go', label: 'Go' },
      { value: 'rust', label: 'Rust' },
      { value: 'general', label: 'General Project (Markdown/JSON)' },
    ],
    required: true,
    initialValues: detectedLanguages,
  })

  if (p.isCancel(selectedLanguages)) {
    p.cancel('Setup aborted.')
    process.exit(0)
  }

  // 4. Prompt for Package Manager
  let pm = detectedPm
  if (detectedPm) {
    p.log.info(`Detected active package manager: ${colors.bright}${detectedPm}${colors.reset} (found lockfile)`)
  } else {
    pm = await p.select({
      message: 'No lockfile found. Choose preferred package manager to run setup dev dependencies:',
      options: [
        { value: 'pnpm', label: 'pnpm (Recommended)', hint: 'Fast, link-optimized' },
        { value: 'npm', label: 'npm', hint: 'Default Node.js package manager' },
        { value: 'yarn', label: 'yarn', hint: 'Classic yarn dependencies manager' },
      ],
      initialValue: 'pnpm',
    })

    if (p.isCancel(pm)) {
      p.cancel('Setup aborted.')
      process.exit(0)
    }
  }

  // 5. Prompt for Release Configurations (Load existing configs if available)
  const initialReleaseConfig = existingConfigs.releaseConfig || {}
  
  if (existingConfigs.releaseConfig) {
    p.log.info(`${colors.green}ℹ Existing release.config.json found.${colors.reset} Merging options modularly.`)
  }

  const generateVersionJson = await p.confirm({
    message: 'Integrate automatic frontend metadata compiler? (scripts/generate-version.js)',
    initialValue: initialReleaseConfig.generateVersionJson ?? selectedLanguages.includes('javascript'),
  })

  if (p.isCancel(generateVersionJson)) {
    p.cancel('Setup aborted.')
    process.exit(0)
  }

  const push = await p.confirm({
    message: 'Enable automatic push of commits/tags to origin on local releases?',
    initialValue: initialReleaseConfig.push ?? true,
  })

  if (p.isCancel(push)) {
    p.cancel('Setup aborted.')
    process.exit(0)
  }

  const githubRelease = await p.confirm({
    message: 'Publish releases to GitHub via CLI (gh release create)?',
    initialValue: initialReleaseConfig.githubRelease ?? true,
  })

  if (p.isCancel(githubRelease)) {
    p.cancel('Setup aborted.')
    process.exit(0)
  }

  const hasBuildStep = initialReleaseConfig.buildStep !== undefined
  const detectedBuildStep = detectBuildStep(targetPath, pm, selectedLanguages)
  const buildStepInput = await p.text({
    message: 'Command to execute for build validation (press Enter to skip):',
    placeholder: 'e.g. pnpm run build',
    initialValue: hasBuildStep ? (initialReleaseConfig.buildStep || '') : (detectedBuildStep || ''),
  })

  if (p.isCancel(buildStepInput)) {
    p.cancel('Setup aborted.')
    process.exit(0)
  }

  const buildStep = buildStepInput.trim() === '' ? null : buildStepInput.trim()

  const finalReleaseConfig = {
    versionSource: initialReleaseConfig.versionSource || (selectedLanguages.includes('javascript') ? 'package.json' : 'version.json'),
    changelogPath: initialReleaseConfig.changelogPath || 'CHANGELOG.md',
    push,
    githubRelease,
    generateVersionJson,
    versionJsonPath: initialReleaseConfig.versionJsonPath || 'public/version.json',
    buildStep
  }

  // 6. Execution phase with beautiful spinners
  const s = p.spinner()
  s.start('Writing configuration and script templates...')
  try {
    updatePackageJson(targetPath, pm, finalReleaseConfig)
    writeConfigurations(targetPath, pm, selectedLanguages, finalReleaseConfig)
    s.stop(`${colors.green}✔ Configuration and script files generated!${colors.reset}`)
  } catch (error) {
    s.stop(`${colors.red}✘ Failed to write configuration templates:${colors.reset} ${error.message}`)
    process.exit(1)
  }

  const s2 = p.spinner()
  s2.start(`Installing pipeline dependencies and registering Git hooks using ${pm}...`)
  try {
    installDependencies(targetPath, pm)
    s2.stop(`${colors.green}✔ Dependencies installed & Git hooks registered!${colors.reset}`)
  } catch (error) {
    s2.stop(`${colors.red}✘ Installation process failed:${colors.reset} ${error.message}`)
    p.log.warn(`Manual recovery: Check your package manager installation for ${pm}.`)
    process.exit(1)
  }

  // 7. Successful Completion outro
  p.outro(`${colors.green}${colors.bright}Git Pipeline setup completed successfully! 🎉${colors.reset}\n`)
  
  console.log(`${colors.dim}❯ Commands to run next:${colors.reset}`)
  console.log(`  • Stage files and run a commit: ${colors.cyan}git add . && git commit -m "feat: bootstrap workflow"${colors.reset}`)
  console.log(`  • Run the release wizard: ${colors.cyan}${pm === 'npm' ? 'npm run' : pm} release${colors.reset}\n`)
}

run().catch((e) => {
  console.error(`\n${colors.red}Error: Setup crashed unexpectedly:${colors.reset} ${e.message}`)
  process.exit(1)
})
