// SPDX-License-Identifier: GPL-2.0-or-later
import Shell from 'gi://Shell';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import * as ParentalControls from 'resource:///org/gnome/shell/misc/parentalControlsManager.js';
import {Disposables} from '../core/disposables.js';
import {Scheduler} from '../core/scheduler.js';
import {dockEntries, searchApps} from './search.js';

export class AppCatalog {
    constructor() {
        this._scope = new Disposables();
        this._scheduler = this._scope.own(new Scheduler());
        this._listeners = new Set();
        this.system = Shell.AppSystem.get_default();
        this.favorites = AppFavorites.getAppFavorites();
        this.parental = ParentalControls.getDefault();
        this.entries = [];
        this._scope.connect(this.system, 'installed-changed', () => this.reload());
        this._scope.connect(this.parental, 'app-filter-changed', () => this.reload());
        this._scope.connect(this.system, 'app-state-changed', () => this._emit());
        this._scope.connect(this.favorites, 'changed', () => this._emit());
        this.reload();
    }

    reload() {
        this.entries = this.system.get_installed()
            .filter(info => info.should_show() && this.parental.shouldShowApp(info))
            .map(info => ({
                id: info.get_id(),
                name: info.get_display_name(),
                description: info.get_description() ?? '',
                keywords: (info.get_keywords() ?? []).join(' '),
                app: this.system.lookup_app(info.get_id()),
            })).filter(entry => entry.app);
        this._byId = new Map(this.entries.map(entry => [entry.id, entry]));
        this._emit();
    }

    _emit() {
        this._scheduler.schedule('changed', 30, () => {
            for (const callback of this._listeners)
                callback();
        });
    }

    subscribe(callback) {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    search(query) {
        return searchApps(this.entries, query);
    }

    get pinned() {
        return this.favorites.getFavorites().map(app => this._byId.get(app.get_id())).filter(Boolean);
    }

    get dock() {
        const running = this.system.get_running().map(app => {
            const info = app.get_app_info();
            if (info && !this.parental.shouldShowApp(info))
                return null;
            return this._byId.get(app.get_id()) ?? {
                id: app.get_id(), name: app.get_name(), app,
            };
        });
        return dockEntries(this.pinned, running);
    }

    destroy() {
        this._listeners.clear();
        this._scope.destroy();
    }
}
