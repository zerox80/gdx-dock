// SPDX-License-Identifier: GPL-2.0-or-later
import Shell from 'gi://Shell';
import * as AppFavorites from 'resource:///org/gnome/shell/ui/appFavorites.js';
import * as ParentalControls from 'resource:///org/gnome/shell/misc/parentalControlsManager.js';
import {Disposables} from '../core/disposables.js';
import {Scheduler} from '../core/scheduler.js';
import {dockEntries, searchApps} from './search.js';

export class AppCatalog {
    constructor(settings) {
        this._scope = new Disposables();
        this.settings = settings;
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
        this._scope.connect(settings, 'changed::running-app-order', () => this._emit());
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
        const order = new Map(this.settings.get_strv('running-app-order')
            .map((id, index) => [id, index]));
        running.sort((a, b) => (order.get(a?.id) ?? order.size) - (order.get(b?.id) ?? order.size));
        return dockEntries(this.pinned, running);
    }

    moveRunningApp(id, position) {
        const ids = this.dock.filter(entry => !this.favorites.isFavorite(entry.id))
            .map(entry => entry.id);
        const index = ids.indexOf(id);
        if (index < 0 || index === position)
            return;
        ids.splice(index, 1);
        ids.splice(position, 0, id);
        // Keep the order of closed applications for their next launch, too.
        const previous = this.settings.get_strv('running-app-order');
        this.settings.set_strv('running-app-order', [...new Set([...ids, ...previous])]);
    }

    destroy() {
        this._listeners.clear();
        this._scope.destroy();
    }
}
