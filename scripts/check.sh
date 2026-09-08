#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
shopt -s globstar nullglob
files=(core/**/*.js dock/**/*.js search/**/*.js services/**/*.js system/**/*.js preferences/**/*.js tests/**/*.js)
for file in "${files[@]}"; do
    node --check "$file"
done
node --check extension.js
node --check prefs.js
glib-compile-schemas --strict --dry-run schemas
node --test tests/unit/*.test.js

python3 tests/portability.py
