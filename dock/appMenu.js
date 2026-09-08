// SPDX-License-Identifier: GPL-2.0-or-later
import {_} from '../core/i18n.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {appWindows, activateApp} from '../services/windows.js';

export class AppMenu {
    constructor(button, entry, catalog) {
        this.entry = entry;
        this.catalog = catalog;
        this.menu = new PopupMenu.PopupMenu(button, 0.5, St.Side.BOTTOM);
        this.menu.actor.add_style_class_name('gdx-popup');
        Main.uiGroup.add_child(this.menu.actor);
        this.menu.actor.hide();
        this._manager = new PopupMenu.PopupMenuManager(button);
        this._manager.addMenu(this.menu);
    }

    open() {
        this.menu.removeAll();
        const {app, id, name} = this.entry;
        const title = new PopupMenu.PopupMenuItem(name, {reactive: false, can_focus: false});
        title.add_style_class_name('gdx-menu-title');
        this.menu.addMenuItem(title);
        const windows = appWindows(app);
        for (const window of windows) {
            this.menu.addAction(window.get_title() || name,
                () => Main.activateWindow(window));
        }
        if (windows.length)
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addAction(_('Open'), () => activateApp(app));
        if (app.can_open_new_window())
            this.menu.addAction(_('New window'), () => activateApp(app, {newWindow: true}));
        const info = app.get_app_info();
        for (const action of info?.list_actions() ?? []) {
            this.menu.addAction(info.get_action_name(action), () =>
                app.launch_action(action, global.get_current_time(), -1));
        }
        if (info) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            const pinned = this.catalog.favorites.isFavorite(id);
            this.menu.addAction(pinned ? _('Unpin from dock') : _('Pin to dock'), () => {
                if (pinned)
                    this.catalog.favorites.removeFavorite(id);
                else
                    this.catalog.favorites.addFavorite(id);
            });
            if (pinned) {
                const index = this.catalog.pinned.findIndex(entry => entry.id === id);
                const rtl = this.menu.actor.get_text_direction() === Clutter.TextDirection.RTL;
                if (index > 0)
                    this.menu.addAction(rtl ? _('Move right') : _('Move left'), () =>
                        this.catalog.favorites.moveFavoriteToPos(id, index - 1));
                if (index < this.catalog.pinned.length - 1)
                    this.menu.addAction(rtl ? _('Move left') : _('Move right'), () =>
                        this.catalog.favorites.moveFavoriteToPos(id, index + 1));
            }
        }
        if (windows.length) {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            this.menu.addAction(_('Close all windows'), () => {
                for (const window of appWindows(app))
                    window.delete(global.get_current_time());
            });
        }
        this.menu.open();
    }

    destroy() {
        this.menu.destroy();
    }
}
