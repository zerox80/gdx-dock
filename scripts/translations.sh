#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-update}" in
    update)
        mkdir -p po
        xgettext --language=JavaScript --from-code=UTF-8 --keyword=_ \
            --package-name='GDX Dock' --package-version=1.2.0 \
            --copyright-holder='GDX Dock contributors' \
            --msgid-bugs-address='https://github.com/zerox80/gdx-dock/issues' \
            --output=po/gdx-dock.pot core/*.js dock/*.js search/*.js preferences/*.js
        for catalog in po/*.po; do
            msgmerge --update --backup=none "$catalog" po/gdx-dock.pot
        done
        ;;
    compile)
        for catalog in po/*.po; do
            language=${catalog##*/}
            language=${language%.po}
            mkdir -p "locale/$language/LC_MESSAGES"
            msgfmt --check --check-format "$catalog" -o "locale/$language/LC_MESSAGES/gdx-dock.mo"
        done
        ;;
    *) printf '%s\n' 'Usage: bash scripts/translations.sh [update|compile]' >&2; exit 2 ;;
esac
