// SPDX-License-Identifier: GPL-2.0-or-later

export function sizingStyles(stylesheet, textScale, systemIconSize) {
    const rules = [];
    if (textScale !== 100) {
        rules.push(`.gdx-bar, .gdx-popup { font-size: ${textScale}% !important; }`);
        // Keep the base stylesheet as the source of truth for every text size.
        for (const [, selector, declarations] of stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
            const size = declarations.match(/font-size:\s*([\d.]+)px/);
            if (size)
                rules.push(`${selector.trim()} { font-size: ${Number(size[1]) * textScale / 100}px !important; }`);
        }
    }
    if (systemIconSize !== 16)
        rules.push(`.gdx-system .system-status-icon { icon-size: ${systemIconSize}px !important; }`);
    return rules.join('\n');
}
