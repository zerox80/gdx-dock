// SPDX-License-Identifier: GPL-2.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {SizingTheme} from './sizingTheme.js';
import {Disposables} from './disposables.js';
import {Keybindings} from './keybindings.js';
import {AppCatalog} from '../services/appCatalog.js';
import {BottomBar} from '../dock/bottomBar.js';
import {NativePanel} from '../system/nativePanel.js';
import {Notifications} from '../system/notifications.js';

export class Controller {
    constructor(extension) {
        this.extension = extension;
        this._scope = new Disposables();
    }

    enable() {
        // Two panel owners cannot safely reparent the same GNOME actors.
        const conflicts = ['beauty-dock@local', 'dash-to-panel@jderose9.github.com', 'ubuntu-dock@ubuntu.com',
            'dash-to-dock@micxgx.gmail.com'];
        const active = conflicts.filter(uuid =>
            Main.extensionManager.lookup(uuid)?.state === 1);
        if (active.length)
            throw new Error(`Disable the other dock extension first: ${active.join(', ')}`);

        this.settings = this.extension.getSettings();
        this.sizing = this._scope.own(new SizingTheme(this.extension, this.settings));
        this.sizing.enable();
        this.catalog = this._scope.own(new AppCatalog(this.settings));
        this.bar = this._scope.own(new BottomBar(this.extension, this.settings, this.catalog));
        this.bar.mount();
        this.native = this._scope.own(new NativePanel(this.bar));
        this.native.enable();
        this.notifications = this._scope.own(new Notifications(this.bar));
        this.notifications.enable();
        this.bar.layout();

        this.keybindings = this._scope.own(new Keybindings(this.settings, this.bar.launcher));
        this.keybindings.enable();
    }

    destroy() {
        this._scope.destroy();
    }
}
