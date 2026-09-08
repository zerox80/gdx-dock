#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
bash scripts/pack.sh
mkdir -p artifacts
fixture_data="$(mktemp -d -t gdx-dock-test-XXXXXX)"
trap 'rm -rf -- "$fixture_data"' EXIT
mkdir -p "$fixture_data/applications"
mkdir -m 700 "$fixture_data/runtime"
printf '[Desktop Entry]\nType=Application\nName=GDX Test App\nExec=gjs -m "%s/tests/shell/testApp.js"\nIcon=utilities-terminal\nTerminal=false\n' "$PWD" \
    > "$fixture_data/applications/org.example.GDXDockTest.desktop"
# Keep portal FUSE mounts and compositor sockets out of the real session.
# gnome-shell-test-tool isolates XDG data/config/cache, but not runtime files.
XDG_DATA_DIRS="$fixture_data:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}" \
    XDG_RUNTIME_DIR="$fixture_data/runtime" \
    XDG_DATA_HOME="$fixture_data/data" \
    XDG_CONFIG_HOME="$fixture_data/config" \
    XDG_CACHE_HOME="$fixture_data/cache" \
    GDK_BACKEND=wayland GTK_A11Y=none dbus-run-session -- gnome-shell-test-tool --headless \
    --extra-filter=org.gnome.Shell.PerfHelper --extra-filter=org.example.GDXDockTest \
    --extension "$PWD/dist/gdx-dock@local.shell-extension.zip" \
    "$PWD/tests/shell/smoke.js" 2>&1 | python3 scripts/sanitize-log.py | tee artifacts/shell-test.log
if grep -Eq 'JS ERROR|Gjs-CRITICAL|St-CRITICAL|Script failed|\[GDX Dock\] Cleanup' artifacts/shell-test.log; then
    printf '%s\n' 'The Shell test contains runtime errors. See artifacts/shell-test.log.' >&2
    exit 1
fi
