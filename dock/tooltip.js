// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Scheduler} from '../core/scheduler.js';

export class Tooltip {
    constructor() {
        this._scheduler = new Scheduler();
        this.actor = new St.Label({style_class: 'gdx-tooltip', visible: false});
        Main.layoutManager.addTopChrome(this.actor);
    }

    show(source, text) {
        this._scheduler.schedule('show', 320, () => {
            if (!source.mapped || !source.hover)
                return;
            this.actor.text = text;
            this.actor.show();
            const [x, y] = source.get_transformed_position();
            const [, width] = this.actor.get_preferred_width(-1);
            const [, height] = this.actor.get_preferred_height(width);
            const monitor = Main.layoutManager.findMonitorForActor(source);
            this.actor.set_position(Math.max(monitor.x + 8,
                Math.min(x + (source.width - width) / 2, monitor.x + monitor.width - width - 8)),
            y - height - 10);
            this.actor.opacity = 0;
            this.actor.ease({opacity: 255, duration: 120, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
        });
    }

    hide() {
        this._scheduler.cancel('show');
        this.actor.remove_all_transitions();
        this.actor.hide();
    }

    destroy() {
        this._scheduler.destroy();
        Main.layoutManager.removeChrome(this.actor);
        this.actor.destroy();
    }
}
