// SPDX-License-Identifier: GPL-2.0-or-later
import {_, format} from '../core/i18n.js';
import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as ShellEntry from 'resource:///org/gnome/shell/ui/shellEntry.js';
import {Disposables} from '../core/disposables.js';
import {Scheduler} from '../core/scheduler.js';
import {activateApp} from '../services/windows.js';

const LauncherButton = GObject.registerClass(
class GDXLauncherButton extends PanelMenu.Button {
    _init() {
        super._init(0, _('Search apps'));
        this.add_style_class_name('gdx-launcher-button');
        const box = new St.BoxLayout({style_class: 'gdx-launcher-label',
            y_align: Clutter.ActorAlign.CENTER});
        box.add_child(new St.Icon({icon_name: 'view-app-grid-symbolic', icon_size: 21}));
        box.add_child(new St.Label({text: _('Apps'), y_align: Clutter.ActorAlign.CENTER}));
        this.add_child(box);
        this.menu._boxPointer.updateArrowSide(St.Side.BOTTOM);
        this.menu.actor.add_style_class_name('gdx-popup gdx-launcher-popup');
    }
});

export class Launcher {
    constructor(extension, settings, catalog) {
        this._scope = new Disposables();
        this._scheduler = this._scope.own(new Scheduler());
        this.catalog = catalog;
        this.settings = settings;
        this._filter = 'all';
        this._selected = 0;
        this._rows = [];
        this.button = new LauncherButton();
        Main.panel.menuManager.addMenu(this.button.menu);

        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
        item.add_style_class_name('gdx-launcher-item');
        this.content = new St.BoxLayout({style_class: 'gdx-launcher-content',
            orientation: Clutter.Orientation.VERTICAL, x_expand: true});
        item.add_child(this.content);
        this.button.menu.addMenuItem(item);

        const heading = new St.BoxLayout({style_class: 'gdx-search-heading'});
        const title = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL, x_expand: true});
        title.add_child(new St.Label({text: _('A great start.'), style_class: 'gdx-title'}));
        title.add_child(new St.Label({text: _('Your apps. One place.'), style_class: 'gdx-subtitle'}));
        heading.add_child(title);
        const prefs = new St.Button({style_class: 'gdx-icon-button', can_focus: true,
            accessible_name: _('GDX Dock settings'),
            child: new St.Icon({icon_name: 'emblem-system-symbolic', icon_size: 19})});
        prefs.connect('clicked', () => {
            this.button.menu.close();
            extension.openPreferences();
        });
        heading.add_child(prefs);
        this.content.add_child(heading);

        this.entry = new St.Entry({style_class: 'gdx-search-entry',
            hint_text: _('Search for an app…'), can_focus: true, x_expand: true,
            primary_icon: new St.Icon({icon_name: 'system-search-symbolic', icon_size: 18})});
        this.entry.clutter_text.set_single_line_mode(true);
        ShellEntry.addContextMenu(this.entry);
        this.content.add_child(this.entry);
        const tabs = new St.BoxLayout({style_class: 'gdx-filters'});
        this._tabs = new Map();
        for (const [id, label] of [['all', _('All apps')], ['pinned', _('Pinned')], ['running', _('Running')]]) {
            const button = new St.Button({label, style_class: 'gdx-filter', can_focus: true});
            button.connect('clicked', () => {
                this._filter = id;
                this.render();
            });
            tabs.add_child(button);
            this._tabs.set(id, button);
        }
        this.content.add_child(tabs);
        this.resultLabel = new St.Label({style_class: 'gdx-result-label'});
        this.content.add_child(this.resultLabel);
        this.scroll = new St.ScrollView({style_class: 'gdx-results-scroll',
            hscrollbar_policy: St.PolicyType.NEVER, vscrollbar_policy: St.PolicyType.AUTOMATIC,
            overlay_scrollbars: true, x_expand: true});
        this.results = new St.BoxLayout({style_class: 'gdx-results',
            orientation: Clutter.Orientation.VERTICAL, x_expand: true});
        this.scroll.set_child(this.results);
        this.content.add_child(this.scroll);

        const footer = new St.BoxLayout({style_class: 'gdx-search-footer'});
        footer.add_child(new St.Label({text: _('Up/Down: Select; Enter: Open'), x_expand: true}));
        footer.add_child(new St.Label({text: _('Super · App menu')}));
        this.content.add_child(footer);
        this._scope.connect(this.entry.clutter_text, 'text-changed', () =>
            this._scheduler.schedule('search', 70, () => this.render()));
        this._scope.connect(this.entry.clutter_text, 'activate', () => this.activateSelected());
        this._scope.connect(this.entry.clutter_text, 'key-press-event', (_actor, event) => {
            const key = event.get_key_symbol();
            if (key === Clutter.KEY_Down || key === Clutter.KEY_Up) {
                this.select(this._selected + (key === Clutter.KEY_Down ? 1 : -1));
                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
        this._scope.connect(this.button.menu, 'open-state-changed', (_menu, open) => {
            if (!open)
                return;
            this.entry.set_text('');
            this.render();
            this.fitToMonitor();
            // GNOME 50 has already mapped the menu and taken its modal grab.
            // Accept the next key immediately, including during the animation.
            this.entry.grab_key_focus();
        });
        this._scope.connect(settings, 'changed', () => {
            this._scheduler.schedule('fit', 0, () => this.fitToMonitor());
        });
        this._scope.add(catalog.subscribe(() => {
            if (this.button.menu.isOpen)
                this.render();
        }));
        this._scope.connect(Main.overview, 'hidden', () => {
            if (this._openAfterOverview) {
                this._openAfterOverview = false;
                this.button.menu.open();
            }
        });
    }

    fitToMonitor() {
        if (!this.button.menu.isOpen)
            return;
        const monitor = Main.layoutManager.primaryMonitor;
        if (!monitor)
            return;
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        const textScale = this.settings.get_int('text-scale') / 100;
        const width = Math.max(220, Math.min(440 * textScale, monitor.width / scale - 40));
        this.content.set_style(`width: ${width}px;`);
        const height = Math.max(80, Math.min(320,
            monitor.height / scale - this.settings.get_int('icon-size') - 400));
        this.scroll.set_style(`height: ${height}px;`);
        // Measure translated fonts rather than assuming Latin line heights.
        const [, buttonY] = this.button.get_transformed_position();
        const availableHeight = Math.max(80, (buttonY - monitor.y - 24) / scale);
        const [, preferredHeight] = this.button.menu.actor.get_preferred_height(-1);
        const overflow = Math.max(0, preferredHeight / scale - availableHeight);
        this.scroll.set_style(`height: ${Math.max(40, height - overflow)}px;`);
    }

    toggle() {
        if (this.button.menu.isOpen || this._openAfterOverview)
            this.close();
        else if (Main.overview.visible) {
            this._openAfterOverview = true;
            Main.overview.hide();
        } else {
            this.button.menu.open();
        }
    }

    close() {
        this._openAfterOverview = false;
        this.button.menu.close();
    }

    render() {
        this._renderedQuery = this.entry.get_text();
        const query = this.entry.get_text().trim();
        const pinned = new Set(this.catalog.pinned.map(entry => entry.id));
        const running = new Set(this.catalog.system.get_running().map(app => app.get_id()));
        let entries = this.catalog.search(query);
        if (this._filter === 'pinned')
            entries = entries.filter(entry => pinned.has(entry.id));
        else if (this._filter === 'running')
            entries = entries.filter(entry => running.has(entry.id));
        else if (!query)
            entries.sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
        for (const [id, button] of this._tabs) {
            if (id === this._filter)
                button.add_style_pseudo_class('checked');
            else
                button.remove_style_pseudo_class('checked');
        }
        this.resultLabel.text = query ? format(_('Results: %d'), entries.length) : format(_('Apps: %d'), entries.length);
        this.results.destroy_all_children();
        this._rows = [];
        this._shown = entries.slice(0, 80);
        for (const [index, entry] of this._shown.entries()) {
            const row = new St.BoxLayout({style_class: 'gdx-result-row', x_expand: true});
            const button = new St.Button({style_class: 'gdx-result', can_focus: true,
                x_expand: true, accessible_name: entry.name});
            const box = new St.BoxLayout({style_class: 'gdx-result-content', x_expand: true});
            box.add_child(entry.app.create_icon_texture(32));
            const labels = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
                x_expand: true, y_align: Clutter.ActorAlign.CENTER});
            const name = new St.Label({text: entry.name, style_class: 'gdx-result-name', x_expand: true});
            name.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            labels.add_child(name);
            const description = new St.Label({text: entry.description || (running.has(entry.id) ? _('Running') : _('Application')),
                style_class: 'gdx-result-description', x_expand: true});
            description.clutter_text.ellipsize = Pango.EllipsizeMode.END;
            labels.add_child(description);
            box.add_child(labels);
            button.set_child(box);
            button.connect('clicked', () => this.launch(entry));
            button.connect('key-focus-in', () => this.select(index, false));
            row.add_child(button);
            const pin = new St.Button({style_class: 'gdx-pin', can_focus: true,
                accessible_name: format(_('%s: %s'), entry.name, pinned.has(entry.id) ? _('Unpin from dock') : _('Pin to dock')),
                child: new St.Icon({icon_name: pinned.has(entry.id) ? 'starred-symbolic' : 'non-starred-symbolic', icon_size: 16})});
            if (pinned.has(entry.id))
                pin.add_style_pseudo_class('checked');
            pin.connect('clicked', () => {
                if (this.catalog.favorites.isFavorite(entry.id))
                    this.catalog.favorites.removeFavorite(entry.id);
                else
                    this.catalog.favorites.addFavorite(entry.id);
            });
            row.add_child(pin);
            this.results.add_child(row);
            this._rows.push(row);
        }
        if (!entries.length) {
            const empty = new St.BoxLayout({orientation: Clutter.Orientation.VERTICAL,
                style_class: 'gdx-no-results'});
            empty.add_child(new St.Icon({icon_name: 'system-search-symbolic', icon_size: 32}));
            empty.add_child(new St.Label({text: query ? _('No matching apps.') : _('Nothing here yet.'),
                x_align: Clutter.ActorAlign.CENTER}));
            empty.add_child(new St.Label({text: query ? _('Try another name or search term.') : _('Use the star to pin apps to your dock.'),
                style_class: 'gdx-subtitle', x_align: Clutter.ActorAlign.CENTER}));
            this.results.add_child(empty);
        }
        if (entries.length > 80)
            this.results.add_child(new St.Label({text: _('Search to find more apps.'), style_class: 'gdx-subtitle'}));
        this.scroll.vadjustment.value = 0;
        this.select(0, false);
    }

    select(index, scroll = true) {
        if (!this._rows.length)
            return;
        this._selected = (index + this._rows.length) % this._rows.length;
        this._rows.forEach((row, rowIndex) => {
            if (rowIndex === this._selected)
                row.add_style_pseudo_class('selected');
            else
                row.remove_style_pseudo_class('selected');
        });
        if (scroll) {
            const row = this._rows[this._selected];
            const adjustment = this.scroll.vadjustment;
            if (row.y < adjustment.value)
                adjustment.value = row.y;
            else if (row.y + row.height > adjustment.value + adjustment.page_size)
                adjustment.value = row.y + row.height - adjustment.page_size;
        }
    }

    activateSelected() {
        // Enter must always use the current query, even before the debounce fires.
        this._scheduler.cancel('search');
        if (this._renderedQuery !== this.entry.get_text()) {
            this.render();
        }
        const entry = this._shown[this._selected];
        if (entry)
            this.launch(entry);
    }

    launch(entry) {
        this.button.menu.close();
        activateApp(entry.app);
    }

    destroy() {
        this._openAfterOverview = false;
        this._scope.destroy();
        Main.panel.menuManager.removeMenu(this.button.menu);
        this.button.destroy();
    }
}
