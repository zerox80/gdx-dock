// SPDX-License-Identifier: GPL-2.0-or-later
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {format} from '../../core/format.js';

test('translated messages can reorder placeholders and escape percent signs', () => {
    assert.equal(format('%2$d: %1$s (100%%)', 'Editor', 3), '3: Editor (100%)');
    assert.equal(format('%s: %d', 'Editor', 0), 'Editor: 0');
    assert.equal(format('%s', '$&'), '$&');
    assert.throws(() => format('%2$s', 'Editor'), /no matching argument/);
});
