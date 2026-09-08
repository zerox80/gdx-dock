// SPDX-License-Identifier: GPL-2.0-or-later
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Disposables} from '../core/disposables.js';

// This is the only module that borrows GNOME's panel actors. Native Wi-Fi,
// audio, Bluetooth, power, calendar, privacy and input-source menus stay intact.
export class NativePanel {
    constructor(bar) {
        this.bar = bar;
        this._scope = new Disposables();
        this._menus = new Map();
    }

    _borrow(actor, destination, index = -1) {
        const parent = actor.get_parent();
        const oldIndex = parent.get_children().indexOf(actor);
        parent.remove_child(actor);
        destination.insert_child_at_index(actor, index);
        this._scope.add(() => {
            actor.get_parent()?.remove_child(actor);
            parent.insert_child_at_index(actor, oldIndex);
        });
    }

    enable() {
        const panelBox = Main.layoutManager.panelBox;
        const panel = Main.panel;
        const tracked = Main.layoutManager._trackedActors.find(data => data.actor === panelBox);
        const trackParams = {
            affectsStruts: tracked?.affectsStruts ?? true,
            trackFullscreen: tracked?.trackFullscreen ?? true,
        };
        const visible = panelBox.visible;
        Main.layoutManager.untrackChrome(panelBox);
        panelBox.hide();
        this._scope.add(() => {
            panelBox.visible = visible;
            Main.layoutManager.trackChrome(panelBox, trackParams);
        });

        const right = panel._rightBox;
        this._borrow(right, this.bar.right);
        const oldStyle = right.get_style();
        right.add_style_class_name('gdx-system gdx-surface');
        this._scope.add(() => {
            right.remove_style_class_name('gdx-system');
            right.remove_style_class_name('gdx-surface');
            right.set_style(oldStyle);
        });
        const date = panel.statusArea.dateMenu?.container;
        if (date)
            this._borrow(date, right, 0);
        this._scope.connect(right, 'child-added', () => this._syncMenus());
        this._syncMenus();
        this.bar.applyStyle();

        // Avoid a second dock inside the overview; the bottom bar remains usable.
        const dash = Main.overview.dash;
        if (dash) {
            const original = {visible: dash.visible, height: dash.height};
            dash.hide();
            dash.set_height(0);
            this._scope.add(() => {
                dash.set_height(-1);
                dash.visible = original.visible;
            });
        }
    }

    _syncMenus() {
        for (const indicator of Object.values(Main.panel.statusArea)) {
            if (!Main.panel._rightBox.contains(indicator.container))
                continue;
            const menu = indicator.menu;
            const pointer = menu?._boxPointer;
            if (!pointer || this._menus.has(menu))
                continue;
            const side = pointer._userArrowSide;
            this._menus.set(menu, side);
            pointer.updateArrowSide(St.Side.BOTTOM);
            menu.actor.add_style_class_name('gdx-popup');
            const id = menu.actor.connect('destroy', () => this._menus.delete(menu));
            this._scope.add(() => {
                if (!this._menus.has(menu))
                    return;
                menu.close();
                menu.actor.disconnect(id);
                pointer.updateArrowSide(side);
                menu.actor.remove_style_class_name('gdx-popup');
            });
        }
    }

    destroy() {
        this._scope.destroy();
        this._menus.clear();
    }
}
