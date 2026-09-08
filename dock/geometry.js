// SPDX-License-Identifier: GPL-2.0-or-later
export function barGeometry(monitor, iconSize, scale = 1) {
    const height = Math.round((iconSize + 38) * scale);
    return {x: monitor.x, y: monitor.y + monitor.height - height,
        width: monitor.width, height};
}

export function stripWidth(width, left, right, natural, scale = 1) {
    const available = Math.max(1, width - left - right - 48 * scale);
    // Center relative to the screen while both wings have enough room.
    const centered = width - 2 * Math.max(left, right) - 48 * scale;
    return Math.max(1, Math.min(natural, centered >= 180 * scale ? centered : available));
}
