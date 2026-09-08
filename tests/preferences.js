// Run with GSETTINGS_BACKEND=memory; creates widgets without showing a window.
import Gettext from 'gettext';
import GLib from 'gi://GLib';
import {_} from '../core/i18n.js';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import {buildPreferences} from '../preferences/page.js';

Gettext.bindtextdomain('gdx-dock', GLib.build_filenamev([GLib.get_current_dir(), 'locale']));
Adw.init();
const settings = new Gio.Settings({schema_id: 'org.gnome.shell.extensions.gdx-dock'});
const window = new Adw.PreferencesWindow();
buildPreferences(window, settings);
function descendants(widget) {
    const children = [];
    for (let child = widget.get_first_child(); child; child = child.get_next_sibling())
        children.push(child, ...descendants(child));
    return children;
}
const widgets = descendants(window);
const size = widgets.find(widget => widget instanceof Adw.SpinRow && widget.title === _('Icon size'));
if (!size || size.value !== 40)
    throw new Error('Preferences did not bind the icon-size default');
size.value = 48;
if (settings.get_int('icon-size') !== 48)
    throw new Error('Changing preferences did not update settings');
settings.set_int('icon-size', 36);
if (size.value !== 36)
    throw new Error('Settings did not update preferences');
const accent = widgets.find(widget => widget instanceof Adw.ComboRow);
accent.selected = 1;
if (settings.get_string('accent') !== 'lilac')
    throw new Error('Accent selection failed');
const shortcuts = widgets.filter(widget => widget instanceof Adw.EntryRow);
const extra = shortcuts.find(row => row.title === _('Additional search shortcut'));
const overview = shortcuts.find(row => row.title === _('Overview shortcut'));
if (extra.text !== '' || overview.text !== '<Super>w')
    throw new Error('Shortcut defaults do not match Windows-only launcher and Super+W overview');
overview.text = '<Control><Super>space';
overview.emit('apply');
if (settings.get_strv('gdx-toggle-overview')[0] !== '<Control><Super>space')
    throw new Error('Overview shortcut cannot be customized');
extra.text = 'a';
extra.emit('apply');
if (settings.get_strv('open-launcher').length !== 0 || !extra.has_css_class('error'))
    throw new Error('An unmodified letter must not be registered as global shortcut');
window.destroy();
print('GDX Dock preferences: construction and two-way bindings passed.');
