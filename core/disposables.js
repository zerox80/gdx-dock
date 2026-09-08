// SPDX-License-Identifier: GPL-2.0-or-later
// Reverse-order disposal also makes partially completed enable() reversible.
export class Disposables {
    constructor() {
        this._callbacks = [];
    }

    add(callback) {
        this._callbacks.push(callback);
        return callback;
    }

    connect(object, signal, callback) {
        const id = object.connect(signal, callback);
        this.add(() => object.disconnect(id));
        return id;
    }

    own(object) {
        this.add(() => object.destroy());
        return object;
    }

    destroy() {
        for (const callback of this._callbacks.splice(0).reverse()) {
            try {
                callback();
            } catch (error) {
                console.error(`[GDX Dock] Cleanup: ${error.message}`);
            }
        }
    }
}
