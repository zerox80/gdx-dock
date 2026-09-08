// SPDX-License-Identifier: GPL-2.0-or-later
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import {Controller} from './core/controller.js';

export default class GDXDockExtension extends Extension {
    enable() {
        this._controller = new Controller(this);
        try {
            this._controller.enable();
        } catch (error) {
            this.disable();
            throw error;
        }
    }

    disable() {
        this._controller?.destroy();
        this._controller = null;
    }
}
