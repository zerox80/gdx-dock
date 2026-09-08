# SPDX-License-Identifier: GPL-2.0-or-later
"""Keep machine-specific directory names out of saved test logs."""
from pathlib import Path
import sys

replacements = [(str(Path.cwd()), '<project>'), (str(Path.home()), '<home>')]
for line in sys.stdin:
    for original, replacement in replacements:
        line = line.replace(original, replacement)
    sys.stdout.write(line)
    sys.stdout.flush()
