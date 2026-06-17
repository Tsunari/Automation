/**
 * Generates commitlintrc configuration template content.
 */
export function getCommitlintTemplate() {
  return `{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "header-max-length": [0, "always"],
    "body-max-line-length": [0, "always"],
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
        "other"
      ]
    ]
  }
}`
}

/**
 * Generates prettierrc configuration template content.
 */
export function getPrettierTemplate() {
  return `{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}`
}

/**
 * Generates husky commit-msg hook script.
 */
export function getHuskyCommitMsg(packageManager) {
  const runner = packageManager === 'npm' ? 'npx' : `${packageManager} exec`
  return `${runner} commitlint --edit "$1"`
}

/**
 * Generates husky pre-commit hook script.
 */
export function getHuskyPreCommit(packageManager) {
  const runner = packageManager === 'npm' ? 'npx' : `${packageManager} exec`
  return `${runner} lint-staged`
}

/**
 * Generates lint-staged configuration mapping custom formatters per detected language.
 * @param {string[]} languages
 */
export function getLintStagedTemplate(languages) {
  const rules = []

  if (languages.includes('javascript') || languages.includes('general')) {
    rules.push("  '*.{js,jsx,ts,tsx,json,css,html,md}': ['prettier --write']")
  } else {
    // If not a JS/TS project, still format markdown and json using prettier
    rules.push("  '*.{json,md,yml,yaml}': ['prettier --write']")
  }

  if (languages.includes('python')) {
    rules.push("  '*.py': ['black']")
  }

  if (languages.includes('go')) {
    rules.push("  '*.go': ['gofmt -w', 'go vet']")
  }

  if (languages.includes('rust')) {
    rules.push("  '*.rs': ['rustfmt']")
  }

  // Typecheck script rule if TS compiler is configured
  if (languages.includes('javascript')) {
    rules.push("  '**/*.{ts,tsx}': () => 'tsc --noEmit'")
  }

  return `export default {
${rules.join(',\n')}
}
`
}

/**
 * Generates the release configuration template.
 */
export function getReleaseConfigTemplate(pm, lang) {
  const hasBuild = lang.includes('javascript') ? 'npm run build' : null
  const source = lang.includes('javascript') ? 'package.json' : 'version.json'

  return `{
  "versionSource": "${source}",
  "changelogPath": "CHANGELOG.md",
  "push": true,
  "githubRelease": true,
  "generateVersionJson": ${lang.includes('javascript')},
  "versionJsonPath": "public/version.json",
  "buildStep": ${hasBuild ? `"${hasBuild}"` : 'null'}
}`
}

/**
 * Generates a generalized scripts/generate-version.js file.
 */
export function getGenerateVersionTemplate() {
  return `import fs from 'fs'
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
    console.error(\`Version source file not found at \${config.versionSource}\`)
    process.exit(1)
  }

  const pkgJson = JSON.parse(fs.readFileSync(sourcePath, 'utf8'))
  const version = pkgJson.version

  let changelog = ''
  if (fs.existsSync(changelogPath)) {
    let rawChangelog = fs.readFileSync(changelogPath, 'utf8')
    changelog = rawChangelog.replace(/^#\\s+Changelog\\s*$/gim, '')
    changelog = changelog.replace(/\\s*\\(\\[[a-f0-9]+\\]\\(https?:\\/\\/[^\\)]+\\)\\)/gi, '')
    changelog = changelog.replace(/##\\s+\\[([^\\]]+)\\]\\((?:https?:\\/\\/[^\\)]+)\\)/gi, '## $1')
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
  console.log(\`Successfully generated \${config.versionJsonPath} for v\${version}\`)
} catch (error) {
  console.error('Failed to generate version info:', error)
  process.exit(1)
}
`
}

/**
 * Generates the generalized scripts/release.js CLI release prompt engine.
 */
export function getReleaseJsTemplate() {
  return `import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import * as p from '@clack/prompts'

const args = process.argv.slice(2)
const autoYes = args.includes('--yes') || args.includes('-y')

const colors = {
  reset: '\\x1b[0m',
  bright: '\\x1b[1m',
  dim: '\\x1b[2m',
  yellow: '\\x1b[33m',
  cyan: '\\x1b[36m',
  green: '\\x1b[32m',
  red: '\\x1b[31m',
}

// 1. Read release.config.json
const configPath = path.resolve(process.cwd(), 'release.config.json')
if (!fs.existsSync(configPath)) {
  console.error('Error: release.config.json not found in workspace root.')
  process.exit(1)
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

const getBranchName = () => {
  try {
    return execSync('git branch --show-current', { encoding: 'utf-8' }).trim()
  } catch (e) {
    return ''
  }
}

const isGitClean = () => {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim()
    return status === ''
  } catch (e) {
    return false
  }
}

const getLastTag = () => {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim()
  } catch (e) {
    return ''
  }
}

const getFirstCommit = () => {
  try {
    return execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf-8' }).trim()
  } catch (e) {
    return ''
  }
}

const getCommitsSinceLastTag = (range) => {
  try {
    const log = execSync(\`git log \${range} --pretty=format:"%h|%s"\`, { encoding: 'utf-8' }).trim()
    if (!log) return []
    return log.split('\\n').map((line) => {
      const parts = line.split('|')
      return { hash: parts[0], subject: parts.slice(1).join('|') }
    })
  } catch (e) {
    return []
  }
}

const getRemoteRepoUrl = () => {
  try {
    const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf-8' }).trim()
    const match = remoteUrl.match(/github\\.com[:/]([^/]+)\\/([^.]+)(?:\\.git)?/)
    if (match) {
      return \`https://github.com/\${match[1]}/\${match[2]}\`
    }
  } catch (e) {
    // ignore
  }
  return null
}

const getHashLink = (hash, repoUrl) => {
  if (repoUrl) {
    return \`[\${hash.slice(0, 7)}](\${repoUrl}/commit/\${hash})\`
  }
  return hash.slice(0, 7)
}

const parseCommitSubject = (subject) => {
  const typeRegex =
    /(?:^|\\s+)(feat|fix|perf|docs|refactor|style|test|build|chore|ci|revert|other)(?:\\(([^)]+)\\))?(!)?:\\s+/gi
  const parts = []
  let match
  const matches = []

  while ((match = typeRegex.exec(subject)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: match[1].toLowerCase(),
      scope: match[2] || null,
      breaking: !!match[3],
    })
  }

  if (matches.length === 0) return null

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const msgStart = current.index + current.length
    const msgEnd = next ? next.index : subject.length
    const message = subject.slice(msgStart, msgEnd).trim()

    parts.push({
      type: current.type,
      scope: current.scope,
      breaking: current.breaking,
      message,
    })
  }

  return parts
}

const parseCommits = (commits, repoUrl) => {
  const groups = {
    breaking: [],
    feat: [],
    fix: [],
    perf: [],
    docs: [],
    refactor: [],
    other: [],
  }

  let recommendedType = 'patch'

  commits.forEach((commit) => {
    let fullMsg = commit.subject
    try {
      fullMsg = execSync(\`git show --no-patch --format="%s%n%b" \${commit.hash}\`, {
        encoding: 'utf-8',
      })
    } catch (e) {}

    const isCommitBreaking =
      fullMsg.includes('BREAKING CHANGE') ||
      fullMsg.includes('BREAKING CHANGES') ||
      /\\w+(\\([^)]+\\))?!:/.test(commit.subject)
    const hashLink = getHashLink(commit.hash, repoUrl)

    const parsedParts = parseCommitSubject(commit.subject)

    if (parsedParts) {
      parsedParts.forEach((part) => {
        const itemIsBreaking = isCommitBreaking || part.breaking

        if (itemIsBreaking) {
          recommendedType = 'major'
        } else if (recommendedType !== 'major') {
          if (part.type === 'feat') {
            recommendedType = 'minor'
          }
        }

        const parsedItem = {
          hash: commit.hash,
          hashLink,
          scope: part.scope,
          message: part.message,
        }

        if (itemIsBreaking) {
          groups.breaking.push(parsedItem)
        } else if (groups[part.type]) {
          groups[part.type].push(parsedItem)
        } else {
          groups.other.push(parsedItem)
        }
      })
    } else {
      const itemIsBreaking = isCommitBreaking
      if (itemIsBreaking) {
        recommendedType = 'major'
      }

      const parsedItem = {
        hash: commit.hash,
        hashLink,
        scope: null,
        message: commit.subject,
      }

      if (itemIsBreaking) {
        groups.breaking.push(parsedItem)
      } else {
        groups.other.push(parsedItem)
      }
    }
  })

  return { groups, recommendedType }
}

const semver = (version, type) => {
  const parts = version.split('.').map(Number)
  if (type === 'patch') parts[2]++
  else if (type === 'minor') {
    parts[1]++
    parts[2] = 0
  } else if (type === 'major') {
    parts[0]++
    parts[1] = 0
    parts[2] = 0
  }
  return parts.join('.')
}

const generateChangelogEntry = (newVersion, lastVersion, groups, repoUrl) => {
  const date = new Date().toISOString().split('T')[0]
  let entry = ''

  if (repoUrl && lastVersion) {
    entry += \`## [\${newVersion}](\${repoUrl}/compare/\${lastVersion}...\${newVersion}) (\${date})\\n\\n\`
  } else {
    entry += \`## \${newVersion} (\${date})\\n\\n\`
  }

  if (groups.breaking && groups.breaking.length > 0) {
    entry += \`### ⚠ BREAKING CHANGES\\n\\n\`
    groups.breaking.forEach((item) => {
      entry += \`* \${item.message} (\${item.hashLink})\\n\`
    })
    entry += '\\n'
  }

  const categoryTitles = {
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance Improvements',
    docs: 'Documentation',
    refactor: 'Code Refactoring',
    other: 'Other Changes',
  }

  Object.keys(categoryTitles).forEach((type) => {
    const list = groups[type]
    if (list && list.length > 0) {
      entry += \`### \${categoryTitles[type]}\\n\\n\`
      list.forEach((item) => {
        const scopePrefix = item.scope ? \`**\${item.scope}**: \` : ''
        entry += \`* \${scopePrefix}\${item.message} (\${item.hashLink})\\n\`
      })
      entry += '\\n'
    }
  })

  return entry
}

const updateChangelogFile = (changelogPath, entry) => {
  let existingContent = ''
  if (fs.existsSync(changelogPath)) {
    existingContent = fs.readFileSync(changelogPath, 'utf8')
  }

  // Normalize line endings to avoid CRLF mismatch on Windows
  existingContent = existingContent.replace(/\\r\\n/g, '\\n')
  entry = entry.replace(/\\r\\n/g, '\\n')

  const header = '# Changelog\\n\\n'
  let body = existingContent.trim()
  if (body.startsWith('# Changelog')) {
    body = body.slice('# Changelog'.length).trim()
  }

  const newContent = header + entry.trim() + '\\n\\n' + body
  fs.writeFileSync(changelogPath, newContent.trim() + '\\n', 'utf8')
}

const run = async () => {
  p.intro(
    \`\${colors.bright}\${colors.cyan}Release Orchestrator\${autoYes ? \` \${colors.dim}(--yes mode)\` : ''}\${colors.reset}\`,
  )

  const currentBranch = getBranchName()
  if (currentBranch !== 'main' && currentBranch !== 'master') {
    if (autoYes) {
      p.log.warn(\`On branch '\${currentBranch}' instead of release branch. Continuing anyway (--yes).\`)
    } else {
      const shouldContinue = await p.confirm({
        message: \`You are on branch '\${currentBranch}' instead of main/master. Do you want to continue anyway?\`,
        initialValue: false,
      })
      if (p.isCancel(shouldContinue) || !shouldContinue) {
        p.cancel('Release aborted.')
        process.exit(0)
      }
    }
  }

  if (!isGitClean()) {
    p.log.error('Git working directory is not clean. Please commit or stash your changes.')
    p.outro('Release aborted.')
    process.exit(1)
  }

  p.log.success('Working directory is clean.')

  // Read current version
  const sourcePath = path.resolve(process.cwd(), config.versionSource)
  if (!fs.existsSync(sourcePath)) {
    p.log.error(\`Version source file not found at \${config.versionSource}\`)
    process.exit(1)
  }

  const sourceContent = fs.readFileSync(sourcePath, 'utf8')
  let currentVersion = ''
  let parsedSource = null

  if (config.versionSource.endsWith('.json')) {
    parsedSource = JSON.parse(sourceContent)
    currentVersion = parsedSource.version
  } else {
    // Treat as raw text version file
    currentVersion = sourceContent.trim()
  }

  const s = p.spinner()
  s.start('Analyzing commits since last release tag...')

  const lastTag = getLastTag()
  let commitsRange = 'HEAD'
  if (lastTag) {
    commitsRange = \`\${lastTag}..HEAD\`
  } else {
    const firstCommit = getFirstCommit()
    if (firstCommit) {
      commitsRange = \`\${firstCommit}^..HEAD\`
    }
  }

  const commits = getCommitsSinceLastTag(commitsRange)
  const repoUrl = getRemoteRepoUrl()
  const { groups, recommendedType } = parseCommits(commits, repoUrl)

  s.stop(
    \`Analysis complete. Found \${commits.length} commits since \${lastTag || 'initial baseline'}.\`,
  )

  if (commits.length === 0) {
    if (autoYes) {
      p.log.warn('No new commits found since last tag. Forcing release (--yes).')
    } else {
      const force = await p.confirm({
        message: 'No new commits found since last tag. Do you want to force a release anyway?',
        initialValue: false,
      })
      if (p.isCancel(force) || !force) {
        p.cancel('Release cancelled.')
        process.exit(0)
      }
    }
  } else {
    console.log(\`\\n\${colors.dim}❯ Commits parsed:\${colors.reset}\`)
    commits.slice(0, 8).forEach((c) => {
      console.log(\`  • \${colors.cyan}\${c.hash.slice(0, 7)}\${colors.reset} - \${c.subject}\`)
    })
    if (commits.length > 8) {
      console.log(\`  \${colors.dim}... and \${commits.length - 8} more.\${colors.reset}\`)
    }
    console.log()
  }

  const options = [
    {
      value: 'patch',
      label: \`v\${semver(currentVersion, 'patch')}\`,
      hint: recommendedType === 'patch' ? 'Recommended' : '',
    },
    {
      value: 'minor',
      label: \`v\${semver(currentVersion, 'minor')}\`,
      hint: recommendedType === 'minor' ? 'Recommended' : '',
    },
    {
      value: 'major',
      label: \`v\${semver(currentVersion, 'major')}\`,
      hint: recommendedType === 'major' ? 'Recommended' : '',
    },
    { value: 'custom', label: 'Custom Version...', hint: 'Enter manually' },
  ]

  const versionType = await p.select({
    message: \`Select release version (Current: v\${currentVersion}):\`,
    options: options,
    initialValue: recommendedType,
  })

  if (p.isCancel(versionType)) {
    p.cancel('Release aborted.')
    process.exit(0)
  }

  let newVersion
  if (versionType === 'custom') {
    const customInput = await p.text({
      message: 'Enter custom version number:',
      placeholder: 'e.g. 1.0.0',
      validate(value) {
        if (!/^\\d+\\.\\d+\\.\\d+(-.+)?$/.test(value)) {
          return 'Please enter a valid Semantic Version (e.g. 1.0.0)'
        }
      },
    })
    if (p.isCancel(customInput)) {
      p.cancel('Release aborted.')
      process.exit(0)
    }
    newVersion = customInput
  } else {
    newVersion = semver(currentVersion, versionType)
  }

  const changelogEntry = generateChangelogEntry(newVersion, lastTag, groups, repoUrl)
  console.log(\`\\n\${colors.dim}--- Changelog Preview v\${newVersion} ---\${colors.reset}\`)
  console.log(changelogEntry.trim())
  console.log(\`\${colors.dim}-----------------------------------------\${colors.reset}\\n\`)

  if (!autoYes) {
    const proceed = await p.confirm({
      message: \`Confirm release v\${newVersion}?\`,
      initialValue: true,
    })

    if (p.isCancel(proceed) || !proceed) {
      p.cancel('Release cancelled.')
      process.exit(0)
    }
  }

  // Step 7: Apply Version and Changelog changes
  const s2 = p.spinner()
  s2.start('Updating version manifest files and CHANGELOG.md...')
  
  if (config.versionSource.endsWith('.json')) {
    parsedSource.version = newVersion
    fs.writeFileSync(sourcePath, JSON.stringify(parsedSource, null, 2) + '\\n', 'utf8')
  } else {
    fs.writeFileSync(sourcePath, newVersion + '\\n', 'utf8')
  }

  const changelogPath = path.resolve(process.cwd(), config.changelogPath)
  updateChangelogFile(changelogPath, changelogEntry)
  s2.stop('Version files updated.')

  // Step 8: Optional pre-build steps
  if (config.buildStep) {
    const sBuild = p.spinner()
    sBuild.start(\`Executing build validation: \${config.buildStep}...\`)
    try {
      execSync(config.buildStep, { stdio: 'pipe' })
      sBuild.stop('Build verification passed!')
    } catch (e) {
      sBuild.stop('Build step validation failed!')
      p.log.error(e.message)
      process.exit(1)
    }
  }

  // Step 9: Git Commit & Tag locally
  const s3 = p.spinner()
  s3.start('Creating git release tag...')
  const releaseTagName = \`v\${newVersion}\`
  try {
    execSync(\`git add \${config.versionSource} \${config.changelogPath}\`, { stdio: 'pipe' })
    
    // Add version JSON if generated
    if (config.generateVersionJson) {
      try {
        execSync(\`node scripts/generate-version.js\`, { stdio: 'pipe' })
        execSync(\`git add \${config.versionJsonPath}\`, { stdio: 'pipe' })
      } catch (err) {}
    }

    execSync(\`git commit -m "chore(main): release \${releaseTagName}"\`, { stdio: 'pipe' })
    execSync(\`git tag -a \${releaseTagName} -m "Release \${releaseTagName}"\`, { stdio: 'pipe' })
    s3.stop(\`Local release tag created: \${releaseTagName}\`)
  } catch (e) {
    s3.stop('Failed to create git release tag.')
    p.log.error(e.message)
    process.exit(1)
  }

  // Step 10: Push to origin
  let shouldPush = autoYes && config.push
  if (!autoYes && config.push) {
    const pushConfirm = await p.confirm({
      message: 'Push commits and tags to remote origin?',
      initialValue: true,
    })
    if (!p.isCancel(pushConfirm)) {
      shouldPush = pushConfirm
    }
  }

  if (shouldPush) {
    const s4 = p.spinner()
    s4.start('Pushing tags to origin...')
    try {
      const currentBranchName = getBranchName()
      execSync(\`git push origin \${currentBranchName} --tags\`, { stdio: 'pipe' })
      s4.stop('Pushed commits and tags successfully!')
    } catch (e) {
      s4.stop('Failed to push tags to remote origin.')
      p.log.warn(\`Manual retry required: git push origin \${getBranchName()} --tags\`)
    }

    // Step 11: Create GitHub Release via gh CLI
    let shouldRelease = autoYes && config.githubRelease
    if (!autoYes && config.githubRelease) {
      const releaseConfirm = await p.confirm({
        message: 'Create official GitHub Release via gh CLI?',
        initialValue: true,
      })
      if (!p.isCancel(releaseConfirm)) {
        shouldRelease = releaseConfirm
      }
    }

    if (shouldRelease) {
      const s5 = p.spinner()
      s5.start('Creating GitHub Release...')
      const tempNotesPath = path.resolve(process.cwd(), 'temp_release_notes.md')
      try {
        fs.writeFileSync(tempNotesPath, changelogEntry, 'utf8')
        execSync(
          \`gh release create \${releaseTagName} --title "\${releaseTagName}" --notes-file temp_release_notes.md\`,
          { stdio: 'pipe' },
        )
        s5.stop('GitHub Release published!')
      } catch (e) {
        s5.stop('GitHub Release creation failed.')
        p.log.warn('Could not publish release. Verify gh CLI auth status.')
      } finally {
        if (fs.existsSync(tempNotesPath)) {
          fs.unlinkSync(tempNotesPath)
        }
      }
    }
  }

  p.outro(\`\${colors.green}Release \${releaseTagName} process completed! 🎉\${colors.reset}\`)
}

run().catch((e) => {
  p.log.error(\`Process crashed: \${e.message}\`)
  process.exit(1)
})
`
}
