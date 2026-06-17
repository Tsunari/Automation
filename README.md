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

You can execute the setup wizard directly from GitHub on **any repository** using `npx` (npm's execution runner):

```bash
npx github:Tsunari/Automation
```

### Running Locally & Offline (Avoiding Re-downloading)

If you have cloned this repository locally and want to run the installer instantly without fetching it from GitHub every time:

1. **Option A: Execute from Local Path**
   You can run `npx` and point it directly to the local `git-workflow-setup` folder inside your cloned repo path:

   ```bash
   npx C:/Users/Tunahan/.vscode/GitReps/Automation/git-workflow-setup
   ```

2. **Option B: Link Globally (Recommended)**
   Link the executable to your global node environment:
   ```bash
   cd C:/Users/Tunahan/.vscode/GitReps/Automation/git-workflow-setup
   pnpm link --global
   ```
   Now, you can run the setup tool directly in any codebase instantly from anywhere:
   ```bash
   git-workflow-setup
   ```

### Updates & Repairs

- **To upgrade** your configuration files to the latest script versions:
  ```bash
  npx github:Tsunari/Automation --update
  ```
- **To force-refresh/repair** your hook and script files back to template defaults:
  ```bash
  npx github:Tsunari/Automation --repair
  ```

---

## Running Specific Monorepo Projects

When this monorepo expands to house multiple different automation utilities, you can expose them in the root `package.json` under `"bin"`:

```json
  "bin": {
    "git-workflow-setup": "./git-workflow-setup/src/index.js",
    "docker-helper": "./docker-helper/src/index.js"
  }
```

To call a specific utility, use `npx`'s package (`-p`) flag:

```bash
# Executing Git pipeline setup:
npx -p github:Tsunari/Automation git-workflow-setup

# Executing another tool (e.g. docker-helper):
npx -p github:Tsunari/Automation docker-helper
```

---

## License

GNU General Public License v3 (GPL-3.0-only)
