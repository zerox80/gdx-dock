// SPDX-License-Identifier: GPL-2.0-or-later
import {_} from '../core/i18n.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

export function buildPreferences(window, settings) {
    const page = new Adw.PreferencesPage({title: 'GDX Dock', icon_name: 'view-app-grid-symbolic'});
    const look = new Adw.PreferencesGroup({title: _('Appearance'),
        description: _('Changes apply immediately.')});
    const size = new Adw.SpinRow({title: _('Icon size'), subtitle: _('Small to large'),
        adjustment: new Gtk.Adjustment({lower: 28, upper: 56, step_increment: 2, page_increment: 4})});
    settings.bind('icon-size', size, 'value', Gio.SettingsBindFlags.DEFAULT);
    look.add(size);
    const opacity = new Adw.SpinRow({title: _('Opacity'), subtitle: _('Percent'),
        adjustment: new Gtk.Adjustment({lower: 65, upper: 100, step_increment: 1, page_increment: 5})});
    settings.bind('opacity', opacity, 'value', Gio.SettingsBindFlags.DEFAULT);
    look.add(opacity);
    const accents = ['mint', 'lilac', 'blue'];
    const accent = new Adw.ComboRow({title: _('Accent color'),
        model: Gtk.StringList.new([_('Mint'), _('Lilac'), _('Blue')]),
        selected: Math.max(0, accents.indexOf(settings.get_string('accent')))});
    accent.connect('notify::selected', () => settings.set_string('accent', accents[accent.selected]));
    const accentChanged = settings.connect('changed::accent', () => {
        accent.selected = Math.max(0, accents.indexOf(settings.get_string('accent')));
    });
    window.connect('close-request', () => {
        settings.disconnect(accentChanged);
        return false;
    });
    look.add(accent);
    page.add(look);

    const behavior = new Adw.PreferencesGroup({title: _('Behavior')});
    for (const [key, title, subtitle] of [
        ['show-workspaces', _('Show workspaces'), _('Switch workspaces beside the launcher')],
        ['show-in-fullscreen', _('Always visible'), _('Show the dock over fullscreen windows')],
        ['click-to-minimize', _('Click to minimize'), _('When a single window is already focused')],
        ['animate', _('Animations'), _('Raise app icons on hover')],
    ]) {
        const row = new Adw.SwitchRow({title, subtitle});
        settings.bind(key, row, 'active', Gio.SettingsBindFlags.DEFAULT);
        behavior.add(row);
    }
    page.add(behavior);
    const keys = new Adw.PreferencesGroup({title: _('Keyboard and mouse'),
        description: _('Right-click: app menu. Middle-click: new window. Scroll: switch windows.')});
    keys.add(new Adw.ActionRow({title: _('Super key: app menu'),
        subtitle: _('Press Super to toggle search. Super + W opens the GNOME overview by default.')}));
    for (const [setting, title] of [
        ['open-launcher', _('Additional search shortcut')],
        ['gdx-toggle-overview', _('Overview shortcut')],
    ]) {
        const shortcut = new Adw.EntryRow({title,
            text: settings.get_strv(setting)[0] ?? '', show_apply_button: true});
        shortcut.connect('apply', () => {
            const value = shortcut.text.trim();
            const [valid, key, modifiers] = Gtk.accelerator_parse(value);
            if (!value || (valid && key && modifiers)) {
                settings.set_strv(setting, value ? [value] : []);
                shortcut.remove_css_class('error');
            } else {
                shortcut.add_css_class('error');
            }
        });
        keys.add(shortcut);
    }
    keys.add(new Adw.ActionRow({title: _('Custom shortcuts'),
        subtitle: _('Example: &lt;Super&gt;w. Leave blank to disable the shortcut. Super alone always opens the app menu.')}));
    page.add(keys);
    window.add(page);
}
