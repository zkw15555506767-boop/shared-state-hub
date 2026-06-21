# Publishing Notes

Before publishing, confirm local generated files are not staged:

```bash
git status --ignored --short
```

Ignored by default:

- `.mcp.json`
- `.claude/settings.local.json`
- `*.db`
- `*.db-shm`
- `*.db-wal`
- `*.log`
- `*.pid`
- `*.bak-*`
- `node_modules/`

## Initialize

```bash
git init -b main
git add .
git commit -m "Initial shared state hub prototype"
```

## Create GitHub Repo

```bash
gh repo create zkw15555506767-boop/shared-state-hub \
  --public \
  --source=. \
  --remote=origin \
  --description "Local-first shared state hub for AI coding agents"
```

## Push

```bash
git push -u origin main
```

If GitHub CLI auth is invalid:

```bash
gh auth login -h github.com
```

If network/DNS is blocked in the current environment, run the `gh repo create` and `git push` commands in a normal local Terminal.

## Publish to npm

After the GitHub release is ready, publish the CLI package so users can run a single installation command:

```bash
npm login
npm publish
```

The published package exposes:

```bash
npx shared-state-hub setup
```

It copies a stable local runtime before registering the macOS background service, so the service does not depend on an `npx` cache directory.
