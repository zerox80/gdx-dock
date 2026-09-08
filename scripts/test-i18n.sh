#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/translations.sh compile
glib-compile-schemas --strict schemas
python3 tests/catalogs.py
