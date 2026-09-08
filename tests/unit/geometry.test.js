import {test} from 'node:test';
import assert from 'node:assert/strict';
import {barGeometry, stripWidth} from '../../dock/geometry.js';

test('bar always touches the monitor bottom, including monitors with offsets', () => {
    for (const monitor of [
        {x: 0, y: 0, width: 1280, height: 720},
        {x: -1920, y: 320, width: 1920, height: 1080},
        {x: 2560, y: 0, width: 3840, height: 2160},
    ]) {
        for (const scale of [1, 1.25, 2]) {
            const box = barGeometry(monitor, 40, scale);
            assert.equal(box.y + box.height, monitor.y + monitor.height);
            assert.equal(box.x, monitor.x);
            assert.equal(box.width, monitor.width);
        }
    }
});
test('dock leaves room for system controls with many favorites', () => {
    assert.ok(stripWidth(1280, 210, 330, 2000) <= 1280 - 210 - 330 - 48);
    assert.equal(stripWidth(1280, 210, 330, 300), 300);
    assert.ok(stripWidth(720, 190, 300, 1200) > 0);
    assert.ok(stripWidth(720, 190, 300, 1200) <= 182);
});
