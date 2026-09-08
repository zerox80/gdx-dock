// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Disposables} from '../core/disposables.js';

export class Notifications {
    constructor(bar) {
        this.bar = bar;
        this._scope = new Disposables();
    }

    enable() {
        // GNOME owns the banner's y animation. A separate translation positions
        // its animation origin above our dock, including expanding notifications.
        const tray = Main.messageTray;
        const banner = tray._bannerBin;
        if (!banner)
            return;
        const saved = {translation: banner.translation_y, alignment: banner.x_align,
            margin: banner.margin_right};
        this._scope.add(() => {
            banner.translation_y = saved.translation;
            banner.x_align = saved.alignment;
            banner.margin_right = saved.margin;
            banner.remove_style_class_name('gdx-notification');
        });
        banner.add_style_class_name('gdx-notification');
        const position = () => {
            banner.x_align = Clutter.ActorAlign.END;
            banner.margin_right = 12 * this.bar.scale;
            banner.translation_y = Math.max(0, tray.height - banner.height - this.bar.actor.height - 10 * this.bar.scale);
        };
        this._scope.connect(banner, 'notify::allocation', position);
        this._scope.connect(tray, 'notify::allocation', position);
        this._scope.connect(this.bar.actor, 'notify::allocation', position);
        position();
    }

    destroy() {
        this._scope.destroy();
    }
}
