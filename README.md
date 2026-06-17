# Automation Utilities Monorepo

Welcome to the central automation monorepo. This repository houses various standalone developer tooling, pipelines, and script configurations designed to streamline local environments and automate releases.

## Projects

### 1. [git-workflow-setup](git-workflow-setup/)
An interactive, language-agnostic CLI installer that bootstraps standard Git linting, Prettier formatting, Conventional Commits formatting rules, Husky hooks, and TUI release pipelines into any target codebase.

#### Features
- **Auto-Detection**: Scans target workspaces for programming languages (JavaScript/TypeScript, Python, Go, Rust) and lockfiles (`pnpm`, `npm`, `yarn`).
- **Dynamic Formatters**: Automatically configures language-native tools (e.g. `black` for Python, `gofmt` for Go, `rustfmt` for Rust, `prettier` for frontend assets).
- **Safe Merges**: Re-running the tool updates configurations modularly instead of overwriting custom developer settings (such as existing `release.config.json` preferences).
- **CLI Release Engine**: Installs a standalone prompt wizard (`release.js`) that automates version updates, changelog drafting, local tags, pushes, and GitHub Releases.

---

## Installation & Usage

You can execute the workflow setup CLI tool on **any directory** immediately using npm's execution runner:

```bash
npx github:Tsunari/Automation
```

### Local Dev Setup
If you want to clone this repository and inspect the tool locally:
1. Clone this repository:
   ```bash
   git clone https://github.com/Tsunari/Automation.git
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Run the CLI tool:
   ```bash
   node git-workflow-setup/src/index.js
   ```

---

## License
GNU General Public License v3 (GPL-3.0-only)
