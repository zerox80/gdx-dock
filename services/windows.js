// SPDX-License-Identifier: GPL-2.0-or-later
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export function appWindows(app) {
    return app.get_windows().filter(window => !window.skip_taskbar);
}

export function activateApp(app, {newWindow = false, minimize = false, cycle = false} = {}) {
    const windows = appWindows(app);
    if (newWindow && app.can_open_new_window()) {
        app.open_new_window(-1);
    } else if (!windows.length) {
        app.activate();
    } else {
        const focused = global.display.focus_window;
        if (minimize && windows.length === 1 && windows[0] === focused)
            windows[0].minimize();
        else if (cycle && windows.length > 1 && windows.includes(focused))
            cycleWindows(app, 1);
        else
            Main.activateWindow(windows[0]);
    }
    Main.overview.hide();
}

export function cycleWindows(app, direction) {
    // Stable ordering: MRU order changes every time a window is activated.
    const windows = appWindows(app).sort((a, b) => a.get_stable_sequence() - b.get_stable_sequence());
    if (!windows.length)
        return;
    const current = windows.indexOf(global.display.focus_window);
    const index = current < 0 ? 0 : (current + direction + windows.length) % windows.length;
    Main.activateWindow(windows[index]);
}
