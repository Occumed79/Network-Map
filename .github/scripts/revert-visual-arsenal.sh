#!/usr/bin/env bash
set -euo pipefail

INSTALL_COMMIT="${INSTALL_COMMIT:-}"

cleanup_files() {
  rm -f VISUAL_ARSENAL.md
  rm -f VISUAL_STACK_POLICY.md
  rm -f .github/workflows/install-visual-arsenal.yml
  rm -f .github/workflows/install-visual-libraries.yml
  rm -f .github/workflows/install-visual-libraries-v2.yml
  rm -f .github/workflows/revert-visual-arsenal.yml
  rm -f .github/scripts/install-visual-arsenal.sh
  rm -f .github/scripts/install-visual-arsenal-v2.sh
}

if [[ -n "$INSTALL_COMMIT" ]] && git cat-file -e "$INSTALL_COMMIT^{commit}" 2>/dev/null; then
  echo "Reverting visualization dependency changes introduced by $INSTALL_COMMIT"

  mapfile -t manifests < <(git diff-tree --no-commit-id --name-only -r "$INSTALL_COMMIT" | grep -E '(^|/)package\.json$' || true)

  for manifest in "${manifests[@]}"; do
    [[ -f "$manifest" ]] || continue
    before=$(mktemp)
    after=$(mktemp)
    if ! git show "${INSTALL_COMMIT}^:${manifest}" > "$before" 2>/dev/null; then
      printf '{}\n' > "$before"
    fi
    git show "${INSTALL_COMMIT}:${manifest}" > "$after"

    node - "$manifest" "$before" "$after" <<'NODE'
const fs = require('fs');
const [currentPath, beforePath, afterPath] = process.argv.slice(2);
const current = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));
const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

for (const section of sections) {
  const cur = current[section] || {};
  const pre = before[section] || {};
  const post = after[section] || {};

  for (const [name, postVersion] of Object.entries(post)) {
    const existedBefore = Object.prototype.hasOwnProperty.call(pre, name);
    const existsNow = Object.prototype.hasOwnProperty.call(cur, name);
    if (!existsNow) continue;

    if (!existedBefore) {
      delete cur[name];
      continue;
    }

    const beforeVersion = pre[name];
    if (beforeVersion !== postVersion && cur[name] === postVersion) {
      cur[name] = beforeVersion;
    }
  }

  if (Object.keys(cur).length) current[section] = cur;
  else delete current[section];
}

fs.writeFileSync(currentPath, JSON.stringify(current, null, 2) + '\n');
NODE
    rm -f "$before" "$after"
  done

  mapfile -t lockfiles < <(git diff-tree --no-commit-id --name-only -r "$INSTALL_COMMIT" | grep -E '(^|/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|bun\.lock)$' || true)
  for lockfile in "${lockfiles[@]}"; do
    if [[ -z "$(git log --format=%H "${INSTALL_COMMIT}..HEAD" -- "$lockfile" | head -n 1)" ]]; then
      git checkout "${INSTALL_COMMIT}^" -- "$lockfile" 2>/dev/null || true
    else
      echo "Later changes detected in $lockfile; attempting lockfile regeneration."
      dir=$(dirname "$lockfile")
      base=$(basename "$lockfile")
      set +e
      case "$base" in
        pnpm-lock.yaml)
          corepack enable
          (cd "$dir" && pnpm install --lockfile-only --ignore-scripts --no-frozen-lockfile)
          ;;
        package-lock.json)
          (cd "$dir" && npm install --package-lock-only --ignore-scripts --legacy-peer-deps)
          ;;
        yarn.lock)
          corepack enable
          (cd "$dir" && yarn install --ignore-scripts)
          ;;
        bun.lock|bun.lockb)
          if ! command -v bun >/dev/null 2>&1; then
            curl -fsSL https://bun.sh/install | bash
            export PATH="$HOME/.bun/bin:$PATH"
          fi
          (cd "$dir" && bun install --ignore-scripts)
          ;;
      esac
      set -e
    fi
  done
fi

cleanup_files

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
if ! git diff --cached --quiet; then
  git commit -m 'Revert account-wide visualization preload'
  git push origin HEAD:main
else
  echo 'Nothing left to revert.'
fi
