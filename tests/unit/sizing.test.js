// SPDX-License-Identifier: GPL-2.0-or-later
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sizingStyles} from '../../core/sizing.js';

const stylesheet = readFileSync(new URL('../../stylesheet.css', import.meta.url), 'utf8');

test('default sizing adds no overrides and text and system icons scale independently', () => {
    assert.equal(sizingStyles(stylesheet, 100, 16), '');
    const text = sizingStyles(stylesheet, 150, 16);
    assert.match(text, /\.gdx-system \.clock \{ font-size: 19\.5px !important;/);
    assert.match(text, /\.gdx-title \{ font-size: 34\.5px !important;/);
    assert.doesNotMatch(text, /icon-size:/);
    const icons = sizingStyles(stylesheet, 100, 32);
    assert.equal(icons, '.gdx-system .system-status-icon { icon-size: 32px !important; }');
    assert.doesNotMatch(icons, /font-size:/);
});
