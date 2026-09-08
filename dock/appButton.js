// SPDX-License-Identifier: GPL-2.0-or-later
import {_, format} from '../core/i18n.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import {Disposables} from '../core/disposables.js';
import {AppMenu} from './appMenu.js';
import {activateApp, appWindows, cycleWindows} from '../services/windows.js';

export class AppButton {
    constructor(entry, catalog, settings, tooltip) {
        this.entry = entry;
        this._scope = new Disposables();
        this.actor = new St.Button({
            style_class: 'gdx-app', can_focus: true, track_hover: true,
            style: `min-width: ${settings.get_int('icon-size')}px;`,
            accessible_name: entry.name,
            button_mask: St.ButtonMask.ONE | St.ButtonMask.TWO | St.ButtonMask.THREE,
        });
        const content = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
            y_align: Clutter.ActorAlign.CENTER});
        const stack = new St.Widget({layout_manager: new Clutter.BinLayout()});
        stack.add_child(content);
        this.icon = entry.app.create_icon_texture(settings.get_int('icon-size'));
        content.add_child(this.icon);
        this.indicators = new St.BoxLayout({style_class: 'gdx-indicators',
            x_align: Clutter.ActorAlign.CENTER});
        content.add_child(this.indicators);
        this.runningBar = new St.Widget({style_class: 'gdx-running-bar', visible: false,
            y_align: Clutter.ActorAlign.CENTER});
        this.indicators.add_child(this.runningBar);
        this.count = new St.Label({style_class: 'gdx-window-count', visible: false,
            x_expand: true, y_expand: true,
            x_align: Clutter.ActorAlign.END, y_align: Clutter.ActorAlign.START});
        stack.add_child(this.count);
        this.actor.set_child(stack);
        this.menu = this._scope.own(new AppMenu(this.actor, entry, catalog));
        this._scope.connect(this.actor, 'clicked', (_actor, button) => {
            tooltip.hide();
            if (button === 3)
                this.menu.open();
            else
                activateApp(entry.app, {newWindow: button === 2,
                    minimize: settings.get_boolean('click-to-minimize')});
        });
        this._scope.connect(this.actor, 'key-press-event', (_actor, event) => {
            if (event.get_key_symbol() === Clutter.KEY_Menu ||
                (event.get_key_symbol() === Clutter.KEY_F10 &&
                event.get_state() & Clutter.ModifierType.SHIFT_MASK)) {
                this.menu.open();
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this._scope.connect(this.actor, 'scroll-event', (_actor, event) => {
            const direction = event.get_scroll_direction();
            if (direction === Clutter.ScrollDirection.SMOOTH)
                return Clutter.EVENT_PROPAGATE;
            cycleWindows(entry.app, direction === Clutter.ScrollDirection.UP ? -1 : 1);
            return Clutter.EVENT_STOP;
        });
        this._scope.connect(this.actor, 'notify::hover', () => {
            if (this.actor.hover)
                tooltip.show(this.actor, entry.name);
            else
                tooltip.hide();
            if (settings.get_boolean('animate')) {
                this.icon.ease({translation_y: this.actor.hover ? -3 : 0,
                    duration: 160, mode: Clutter.AnimationMode.EASE_OUT_QUAD});
            }
        });
        this._scope.connect(entry.app, 'windows-changed', () => this.update());
        this._scope.connect(global.display, 'notify::focus-window', () => this.update());
        this.update();
    }

    update() {
        const windows = appWindows(this.entry.app);
        this.runningBar.visible = windows.length > 0;
        this.count.text = String(windows.length);
        this.count.visible = windows.length > 1;
        if (windows.length)
            this.actor.add_style_class_name('running');
        else
            this.actor.remove_style_class_name('running');
        const focused = this.entry.app.get_windows().includes(global.display.focus_window);
        if (focused)
            this.actor.add_style_class_name('focused');
        else
            this.actor.remove_style_class_name('focused');
        this.actor.accessible_name = windows.length ? format(_('%s — windows: %d'), this.entry.name, windows.length) : this.entry.name;
    }

    destroy() {
        this._scope.destroy();
        this.actor.destroy();
    }
}
