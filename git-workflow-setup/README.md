# git-workflow-setup

A modular CLI package manager wrapper that bootstraps developer tooling pipelines.

## Folder Architecture

```text
git-workflow-setup/
├── package.json      # Binary scripts, Clack dependencies
├── README.md         # Documentation
├── src/
│   ├── index.js      # CLI orchestration & Clack TUI wizard
│   ├── detector.js   # Project workspace language & lockfile scanner
│   ├── templates.js  # Config templates registry (Husky, Prettier, Release scripts)
│   └── writer.js     # Idempotent write & installation actions
└── test/
    └── setup.test.js # Automated verification test suite
```

## Setup Configurations

This tool installs the following stack in your target workspace:
- **Husky hooks**: Configured to intercept commits:
  - `pre-commit`: Runs `lint-staged`.
  - `commit-msg`: Evaluates conventional formats using `commitlint`.
- **Prettier**: Pre-configured standard lint rules.
- **Release CLI**: Bootstrapped as `scripts/release.js` which reads the generated `release.config.json` to toggle optional features (such as builds, git pushes, and GitHub Releases).
