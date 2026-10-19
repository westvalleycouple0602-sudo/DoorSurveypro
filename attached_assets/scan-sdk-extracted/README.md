# DoorSurvey Scan SDK (with CI)

This repo is set up to publish private packages to npm under the `@doorsurvey` scope.

## 1) One-time setup
1. Create an **npm Access Token** with automation scope.
2. In GitHub → Repo → **Settings → Secrets and variables → Actions**, add:
   - `NPM_TOKEN` = your npm token
3. (Optional) Restrict who can create releases/tags.

## 2) Versioning & Release
- Bump versions for all packages:
  ```bash
  npm run version:bump
  git commit -am "chore: bump versions"
  git tag v$(node -e "console.log(require('./packages/scan-react/package.json').version)")
  git push origin main --tags
  ```
- The **Publish** workflow triggers on the tag and publishes all workspaces with `publishConfig.access=restricted`.

## 3) Local dev
```bash
npm i
npm run build
npm run dev:server   # server on 5175
npm run dev:app      # example console on 5174
```

> Edit `.npmrc.example` and copy to `~/.npmrc` for local publish.


## GitHub Packages (GHPR) publishing

> IMPORTANT: GitHub requires your package scope to match your GitHub org/user.
> If your GitHub org is `acme`, your package names must be like `@acme/scan-core`.
> Adjust the scope in `packages/*/package.json` if your org is not **@doorsurvey**.

### Secrets
- Uses GitHub's built-in `GITHUB_TOKEN` for publishing to GH Packages (no setup needed).

### Local setup (optional)
Copy `.npmrc.github.example` to your user `~/.npmrc` and set `GITHUB_TOKEN` in your shell for local publish.
