// SPDX-License-Identifier: GPL-2.0-or-later
import Gettext from 'gettext';
export {format} from './format.js';

// GNOME initializes this domain from metadata.json in both Shell and preferences.
// Gettext follows the session language and falls back to the English source text.
export const {gettext: _} = Gettext.domain('gdx-dock');
