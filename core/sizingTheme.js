// SPDX-License-Identifier: GPL-2.0-or-later
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import {Disposables} from './disposables.js';
import {sizingStyles} from './sizing.js';

export class SizingTheme {
    constructor(extension, settings) {
        this._scope = new Disposables();
        this._settings = settings;
        const [, contents] = extension.dir.get_child('stylesheet.css').load_contents(null);
        this._source = new TextDecoder().decode(contents);
        this._context = St.ThemeContext.get_for_stage(global.stage);
    }

    enable() {
        for (const key of ['text-scale', 'system-icon-size'])
            this._scope.connect(this._settings, `changed::${key}`, () => this.update());
        this._scope.connect(this._context, 'notify::theme', () => this.update());
        this.update();
    }

    update() {
        const theme = this._context.get_theme();
        const css = sizingStyles(this._source, this._settings.get_int('text-scale'),
            this._settings.get_int('system-icon-size'));
        if (theme === this._theme && css === this._css)
            return;
        this._unload();
        this._css = css;
        if (!css)
            return;
        if (!this._directory) {
            this._directory = Gio.File.new_for_path(GLib.dir_make_tmp('gdx-dock-style-XXXXXX'));
            this._file = this._directory.get_child('sizing.css');
        }
        this._file.replace_contents(new TextEncoder().encode(css), null, false,
            Gio.FileCreateFlags.PRIVATE, null);
        theme.load_stylesheet(this._file);
        this._theme = theme;
    }

    _unload() {
        if (this._theme)
            this._theme.unload_stylesheet(this._file);
        this._theme = null;
    }

    destroy() {
        this._scope.destroy();
        this._unload();
        this._file?.delete(null);
        this._directory?.delete(null);
    }
}
