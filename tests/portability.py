# SPDX-License-Identifier: GPL-2.0-or-later
"""Reject personal filesystem paths and emoji in publishable project files."""
from pathlib import Path
import re
import subprocess

root = Path(__file__).resolve().parent.parent
files = subprocess.check_output(
    ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root
).decode().split('\0')
# Match user directories, not generic documentation such as $HOME or relative paths.
personal_path = re.compile(r'/(?:home|Users)/[\w.-]+|[A-Za-z]:\\Users\\[\w.-]+')
emoji = re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u20E3]')
problems = []
for name in sorted(set(filter(None, files))):
    path = root / name
    if not path.is_file():
        continue
    try:
        content = path.read_text()
    except UnicodeDecodeError:
        continue
    for line_number, line in enumerate(content.splitlines(), 1):
        if personal_path.search(line):
            problems.append(f'{name}:{line_number}: personal filesystem path')
        if emoji.search(line):
            problems.append(f'{name}:{line_number}: emoji or decorative symbol')
if problems:
    raise SystemExit('\n'.join(problems))
print('No personal filesystem paths or emoji in publishable project files.')
