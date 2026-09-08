import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Disposables} from '../../core/disposables.js';

test('partially initialized modules clean up in reverse order, once', () => {
    const scope = new Disposables();
    const calls = [];
    scope.add(() => calls.push('restore panel'));
    scope.add(() => calls.push('restore indicators'));
    scope.own({destroy: () => calls.push('disconnect listeners')});
    scope.destroy();
    scope.destroy();
    assert.deepEqual(calls, ['disconnect listeners', 'restore indicators', 'restore panel']);
});
