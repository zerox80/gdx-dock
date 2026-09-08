// SPDX-License-Identifier: GPL-2.0-or-later
import GObject from 'gi://GObject';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Disposables} from './disposables.js';

export class Keybindings {
    constructor(settings, launcher) {
        this.settings = settings;
        this.launcher = launcher;
        this._scope = new Disposables();
    }

    enable() {
        // GNOME 50 connects its overview to the overlay-key signal. Blocking
        // that handler preserves Mutter's modifier/chord detection for Super.
        const original = GObject.signal_handler_find(global.display, {signalId: 'overlay-key'});
        if (!original)
            throw new Error('GNOMEs Windows-Tastenbelegung konnte nicht gefunden werden.');
        GObject.signal_handler_block(global.display, original);
        this._scope.add(() => {
            if (GObject.signal_handler_is_connected(global.display, original))
                GObject.signal_handler_unblock(global.display, original);
        });

        const modes = Shell.ActionMode.NORMAL | Shell.ActionMode.OVERVIEW | Shell.ActionMode.POPUP;
        const previousModes = Main.wm._allowedKeybindings['overlay-key'];
        Main.wm.allowKeybinding('overlay-key', (previousModes ?? 0) | modes);
        this._scope.add(() => {
            if (previousModes === undefined)
                delete Main.wm._allowedKeybindings['overlay-key'];
            else
                Main.wm.allowKeybinding('overlay-key', previousModes);
        });
        this._scope.connect(global.display, 'overlay-key', () => {
            if (!(Main.actionMode & modes) || Main.sessionMode.isLocked)
                return;
            if (Main.actionMode === Shell.ActionMode.POPUP && !this.launcher.button.menu.isOpen)
                return;
            this.launcher.toggle();
        });

        this._add('open-launcher', modes, () => this.launcher.toggle());
        this._add('gdx-toggle-overview', modes, () => {
            this.launcher.close();
            Main.overview.toggle();
        });
    }

    _add(name, modes, callback) {
        Main.wm.addKeybinding(name, this.settings, Meta.KeyBindingFlags.IGNORE_AUTOREPEAT,
            modes, callback);
        this._scope.add(() => Main.wm.removeKeybinding(name));
    }

    destroy() {
        this._scope.destroy();
    }
}
