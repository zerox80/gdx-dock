#!/usr/bin/env bash
set -euo pipefail
uuid='gdx-dock@zerox80.github.io'
extension_state() {
    local info line
    info=$(LC_ALL=C gnome-extensions info "$1") || return
    while IFS= read -r line; do
        if [[ "$line" =~ ^[[:space:]]*State:[[:space:]]*([A-Z_]+)[[:space:]]*$ ]]; then
            printf '%s\n' "${BASH_REMATCH[1]}"
            return 0
        fi
    done <<< "$info"
    printf '%s\n' "GNOME did not return a readable status for $1." >&2
    return 1
}

if ! initial_state=$(extension_state "$uuid"); then
    printf '%s\n' 'Please log out and back in after the first installation.' >&2
    exit 1
fi
if [[ "$initial_state" == 'OUT_OF_DATE' ]]; then
    printf '%s\n' 'This GDX Dock version does not support the installed GNOME version.' >&2
    exit 1
fi
# Only change competing docks after GNOME has discovered GDX Dock.
enabled_output=$(gnome-extensions list --enabled)
mapfile -t enabled <<< "$enabled_output"
changed=()
restore_on_error() {
    trap - ERR
    gnome-extensions disable "$uuid" || true
    for other in "${changed[@]}"; do
        gnome-extensions enable "$other" || true
    done
}
trap restore_on_error ERR
for other in gdx-dock@local beauty-dock@local dash-to-panel@jderose9.github.com dash-to-dock@micxgx.gmail.com ubuntu-dock@ubuntu.com; do
    for active in "${enabled[@]}"; do
        if [[ "$active" == "$other" ]]; then
            gnome-extensions disable "$other"
            changed+=("$other")
            # The CLI changes GSettings before GNOME finishes the lifecycle call.
            for ((attempt = 0; attempt < 40; attempt++)); do
                other_state=$(extension_state "$other")
                case "$other_state" in
                    ACTIVE|ACTIVATING|DEACTIVATING) sleep 0.2 ;;
                    *) break ;;
                esac
            done
            case "$other_state" in
                ACTIVE|ACTIVATING|DEACTIVATING)
                    printf '%s\n' "$other did not stop in time; restoring the previous dock." >&2
                    false
                    ;;
            esac
        fi
    done
done
gnome-extensions enable "$uuid"

# GNOME 50 keeps a failed extension in ERROR for the rest of the session;
# toggling it cannot retry enable(), and ReloadExtension is no longer supported.
if [[ "$initial_state" == 'ERROR' ]]; then
    trap - ERR
    printf '%s\n' \
        'GDX Dock is ready for the next login; competing docks are disabled.' \
        'GNOME still holds the previous startup error. Please log out and back in.' \
        'GDX Dock will start automatically. No further toggling in Extensions is needed.'
    exit 0
fi

for ((attempt = 0; attempt < 40; attempt++)); do
    state=$(extension_state "$uuid")
    case "$state" in
        ACTIVE)
            trap - ERR
            printf '%s\n' 'GDX Dock is active. App menu: Super. GNOME overview: Super + W.'
            exit 0
            ;;
        ERROR|OUT_OF_DATE) break ;;
    esac
    sleep 0.2
done
printf '%s\n' "GDX Dock failed to start (GNOME status: $state); restoring previous docks." >&2
false
