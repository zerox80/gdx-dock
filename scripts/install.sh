#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/check.sh
bash scripts/pack.sh
gnome-extensions install --force dist/gdx-dock@local.shell-extension.zip
# Carry settings across the previous project name on the first installation.
if command -v dconf >/dev/null 2>&1; then
    current_settings=$(dconf dump /org/gnome/shell/extensions/gdx-dock/)
    if [[ -z "$current_settings" ]]; then
        previous_settings=$(dconf dump /org/gnome/shell/extensions/beauty-dock/)
        if [[ -n "$previous_settings" ]]; then
            printf '%s\n' "$previous_settings" |
                sed 's/^beauty-toggle-overview=/gdx-toggle-overview=/' |
                dconf load /org/gnome/shell/extensions/gdx-dock/
        fi
    fi
fi
printf '%s\n' 'GDX Dock is installed.' \
    'Log out and back in to load the new or updated version.' \
    'Then run: bash scripts/activate.sh'
