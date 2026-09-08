# SPDX-License-Identifier: GPL-2.0-or-later
"""Check complete catalogs and cross-check Python gettext against real GJS/GTK."""
import gettext
import json
import os
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parent.parent
os.chdir(root)


def messages(path):
    result = []
    for block in path.read_text().split('\n\n'):
        match = re.search(r'^msgid (.*?)(?=\nmsgstr)', block, re.M | re.S)
        if match:
            value = ''.join(json.loads(line) for line in match[1].splitlines())
            if value:
                result.append(value)
    return set(result)


def placeholders(value):
    result = []
    next_index = 1
    for position, kind in re.findall(r'%(?:(\d+)\$)?([sd%])', value):
        if kind == '%':
            continue
        result.append((int(position) if position else next_index, kind))
        if not position:
            next_index += 1
    return sorted(result)


available = subprocess.check_output(['locale', '-a'], text=True).splitlines()
utf8 = next((name for name in available if 'utf' in name.lower() and not name.lower().startswith('c.')), None)
if not utf8:
    raise SystemExit('Translation tests require one installed non-C UTF-8 locale.')

source = messages(Path('po/gdx-dock.pot'))
languages = sorted(p.stem for p in Path('po').glob('*.po'))
for language in languages + ['en', 'zz', 'de_DE', 'pt_BR:de']:
    catalog = gettext.translation('gdx-dock', 'locale', languages=[language.split(':')[0]], fallback=True)
    if language in languages:
        po = Path(f'po/{language}.po')
        assert messages(po) == source, f'{language}: missing or stale source messages'
        assert '#, fuzzy' not in po.read_text(), f'{language}: fuzzy translations'
        with Path(f'locale/{language}/LC_MESSAGES/gdx-dock.mo').open('rb') as stream:
            compiled = gettext.GNUTranslations(stream)
        for message in source:
            assert message in compiled._catalog, f'{language}: missing translation'
            translated = compiled.gettext(message)
            assert translated, f'{language}: empty translation'
            assert placeholders(message) == placeholders(translated), f'{language}: invalid placeholders'
    env = dict(os.environ, LC_ALL=utf8, LANGUAGE=language,
               GSETTINGS_BACKEND='memory', GSETTINGS_SCHEMA_DIR=str(root / 'schemas'))
    expected = [catalog.gettext('Open'), catalog.gettext('Icon size'), catalog.gettext('Workspace %d') % 12]
    for command in [['gjs', '-m', 'tests/i18n.js', *expected], ['gjs', '-m', 'tests/preferences.js']]:
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        if result.returncode:
            raise SystemExit(f'{language}: {result.stderr}'.replace(str(root), '<project>'))
    print(f'{language}: catalog, session language, fallback and preferences passed', flush=True)
print(f'{len(languages)} complete catalogs; {len(source)} messages each.')
