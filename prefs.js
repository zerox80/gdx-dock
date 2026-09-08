// SPDX-License-Identifier: GPL-2.0-or-later
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import {buildPreferences} from './preferences/page.js';

export default class GDXDockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.set_default_size(620, 700);
        buildPreferences(window, this.getSettings());
    }
}
