// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Disposables} from '../core/disposables.js';
import {Scheduler} from '../core/scheduler.js';
import {AppStrip} from './appStrip.js';
import {Workspaces} from './workspaces.js';
import {Launcher} from '../search/launcher.js';
import {barGeometry, stripWidth} from './geometry.js';

export class BottomBar {
    constructor(extension, settings, catalog) {
        this.settings = settings;
        this._scope = new Disposables();
        this._scheduler = this._scope.own(new Scheduler());
        this.actor = new St.Widget({name: 'gdx-dock', style_class: 'gdx-bar',
            layout_manager: new Clutter.FixedLayout(), reactive: false});
        this.left = new St.BoxLayout({style_class: 'gdx-left gdx-surface',
            y_align: Clutter.ActorAlign.CENTER});
        this.center = new St.Bin({x_expand: true, y_align: Clutter.ActorAlign.CENTER});
        this.right = new St.BoxLayout({style_class: 'gdx-right',
            y_align: Clutter.ActorAlign.CENTER});
        this.actor.add_child(this.left);
        this.actor.add_child(this.center);
        this.actor.add_child(this.right);

        this.launcher = this._scope.own(new Launcher(extension, settings, catalog));
        this.left.add_child(this.launcher.button.container);
        this.workspaces = this._scope.own(new Workspaces(settings));
        this.left.add_child(this.workspaces.actor);
        this.strip = this._scope.own(new AppStrip(catalog, settings));
        this.center.set_child(this.strip.actor);
        this._scope.connect(Main.layoutManager, 'monitors-changed', () => this.layout());
        this._scope.connect(St.ThemeContext.get_for_stage(global.stage), 'notify::scale-factor',
            () => this.layout());
        this._scope.connect(settings, 'changed', () => {
            this.applyStyle();
            if (this._mounted)
                this._track();
            this.layout();
        });
        for (const actor of [this.left, this.right, this.strip.box]) {
            this._scope.connect(actor, 'notify::allocation', () =>
                this._scheduler.schedule('layout', 0, () => this.layout()));
        }
        this._scope.add(catalog.subscribe(() => this.layout()));
        this._scope.connect(Main.overview, 'showing', () => this.strip.tooltip.hide());
        this.applyStyle();
    }

    get scale() {
        return St.ThemeContext.get_for_stage(global.stage).scale_factor;
    }

    applyStyle() {
        const opacity = this.settings.get_int('opacity') / 100;
        this.surfaceStyle = `background-color: rgba(23, 27, 35, ${opacity});`;
        this.actor.set_style(this.surfaceStyle);
        const accent = this.settings.get_string('accent');
        for (const actor of [this.actor, this.launcher.button.menu.actor]) {
            for (const name of ['mint', 'lilac', 'blue'])
                actor.remove_style_class_name(`gdx-${name}`);
            actor.add_style_class_name(`gdx-${accent}`);
        }
    }

    mount() {
        Main.layoutManager.addChrome(this.actor, {affectsStruts: true,
            trackFullscreen: !this.settings.get_boolean('show-in-fullscreen')});
        this._mounted = true;
        Main.ctrlAltTabManager.addGroup(this.actor, 'GDX Dock', 'view-app-grid-symbolic');
        this._scope.add(() => Main.ctrlAltTabManager.removeGroup(this.actor));
        this.layout();
    }

    _track() {
        const permanent = this.settings.get_boolean('show-in-fullscreen');
        Main.layoutManager.untrackChrome(this.actor);
        Main.layoutManager.trackChrome(this.actor, {affectsStruts: true,
            trackFullscreen: !permanent});
        // GNOME does not reset visibility when fullscreen tracking is turned off.
        if (permanent)
            this.actor.show();
    }

    layout() {
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor)
            return;
        const geometry = barGeometry(monitor, this.settings.get_int('icon-size'), this.scale);
        this.actor.set_width(geometry.width);
        const [, left] = this.left.get_preferred_width(-1);
        const [, right] = this.right.get_preferred_width(-1);
        const [, natural] = this.strip.box.get_preferred_width(-1);
        const width = stripWidth(geometry.width, left, right, natural + 20 * this.scale, this.scale);
        this.strip.actor.width = width;
        const [, leftHeight] = this.left.get_preferred_height(left);
        const [, rightHeight] = this.right.get_preferred_height(right);
        const [, centerHeight] = this.strip.actor.get_preferred_height(width);
        // Enlarged text and system controls must remain inside the reserved bar.
        geometry.height = Math.max(geometry.height,
            Math.ceil(Math.max(leftHeight, rightHeight, centerHeight) + 8 * this.scale));
        geometry.y = monitor.y + monitor.height - geometry.height;
        this.actor.set_position(geometry.x, geometry.y);
        this.actor.set_size(geometry.width, geometry.height);
        const contentHeight = geometry.height;
        this.left.set_position(12 * this.scale, Math.round((contentHeight - leftHeight) / 2));
        this.right.set_position(geometry.width - right - 12 * this.scale,
            Math.round((contentHeight - rightHeight) / 2));
        const centerX = Math.max(left + 24 * this.scale,
            Math.min((geometry.width - width) / 2, geometry.width - right - 24 * this.scale - width));
        this.center.set_position(Math.round(centerX), Math.round((contentHeight - centerHeight) / 2));
        this.center.set_size(width, centerHeight);
        this.applyStyle();
    }

    destroy() {
        this._scope.destroy();
        if (this._mounted)
            Main.layoutManager.removeChrome(this.actor);
        this.actor.destroy();
    }
}
