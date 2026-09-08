// SPDX-License-Identifier: GPL-2.0-or-later
import GLib from 'gi://GLib';

export class Scheduler {
    constructor() {
        this._sources = new Map();
    }

    schedule(key, delay, callback) {
        this.cancel(key);
        const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
            this._sources.delete(key);
            callback();
            return GLib.SOURCE_REMOVE;
        });
        this._sources.set(key, id);
    }

    cancel(key) {
        const id = this._sources.get(key);
        if (id) {
            GLib.source_remove(id);
            this._sources.delete(key);
        }
    }

    destroy() {
        for (const id of this._sources.values())
            GLib.source_remove(id);
        this._sources.clear();
    }
}
