// SPDX-License-Identifier: GPL-2.0-or-later
import Gettext from 'gettext';
import GLib from 'gi://GLib';
import {_, format} from '../core/i18n.js';

Gettext.setlocale(Gettext.LocaleCategory.ALL, '');
Gettext.bindtextdomain('gdx-dock', GLib.build_filenamev([GLib.get_current_dir(), 'locale']));
if (_('Open') !== ARGV[0] || _('Icon size') !== ARGV[1])
    throw new Error('Gettext did not select the expected session language');
if (format(_('Workspace %d'), 12) !== ARGV[2])
    throw new Error('Translated workspace placeholder did not render correctly');
if (_('Untranslated fallback test') !== 'Untranslated fallback test')
    throw new Error('Missing messages must fall back to their English source');
print('Gettext session language and fallback passed.');
