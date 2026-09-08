#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist
gnome-extensions pack --force --out-dir=dist \
    --extra-source=core --extra-source=dock --extra-source=search \
    --extra-source=services --extra-source=system --extra-source=preferences \
    --extra-source=LICENSE --podir=po
