// Executed INSIDE an isolated GNOME Shell 50 test compositor.
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {Input} from './input.js';
import {checkShortcuts} from './shortcuts.js';

function assert(condition, message) {
    if (!condition)
        throw new Error(`GDX Dock test failed: ${message}`);
    console.log(`[GDX Dock test] PASS: ${message}`);
}

export async function run() {
    const path = Gio.File.new_for_uri(import.meta.url).get_parent().get_parent().get_parent().get_path();
    const runtime = Gio.File.new_for_path(GLib.get_user_runtime_dir());
    assert(runtime.get_basename() === 'runtime' &&
        runtime.get_parent().get_basename().startsWith('gdx-dock-test-'),
        'test compositor uses its own runtime directory');
    const input = new Input();
    await Scripting.sleep(1800);
    Main.overview.hide();
    await Scripting.sleep(400);
    const extension = Main.extensionManager.lookup('gdx-dock@local');
    assert(extension?.state === 1, `extension active (state=${extension?.state}; errors=${extension?.error})`);
    const state = extension.stateObj;
    const controller = state._controller;
    const bar = controller.bar;
    const monitor = Main.layoutManager.primaryMonitor;
    const language = GLib.get_language_names()[0].split('_')[0];
    const expectedHint = {de: 'Nach einer App suchen…', ar: 'ابحث عن تطبيق…', en: 'Search for an app…'}[language];
    if (expectedHint)
        assert(bar.launcher.entry.hint_text === expectedHint, 'launcher follows the session language');
    assert(bar.actor.mapped, 'bottom bar is mapped');
    assert(Math.abs(bar.actor.y + bar.actor.height - monitor.y - monitor.height) < 2,
        'bar touches bottom edge');
    assert(!Main.layoutManager.panelBox.visible, 'top panel hidden');
    assert(Main.panel._rightBox.get_parent() === bar.right, 'native system controls borrowed');
    assert(bar.right.width > 100 && bar.right.height > 20 && Main.panel._rightBox.mapped,
        'system area has a visible allocation');
    assert(bar.right.x + bar.right.width <= monitor.width && bar.right.x > monitor.width / 2,
        'system controls remain within the right screen edge');
    assert(Main.panel.statusArea.dateMenu.container.get_parent() === Main.panel._rightBox,
        'clock in bottom system group');
    assert(Main.panel.statusArea.quickSettings.menu._boxPointer._userArrowSide === St.Side.BOTTOM,
        'quick settings opens upwards');
    const area = Main.layoutManager.getWorkAreaForMonitor(monitor.index);
    assert(area.y === monitor.y && area.height <= monitor.height - bar.actor.height,
        'space reserved below windows, no top reservation');

    const screenshot = new Shell.Screenshot();
    const capture = async name => {
        const stream = Gio.File.new_for_path(`${path}/artifacts/${name}.png`)
            .replace(null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
        await screenshot.screenshot(false, stream);
        stream.close(null);
    };
    await capture('desktop');
    await checkShortcuts(bar.launcher, input, assert);
    await input.click(bar.launcher.button);
    assert(bar.launcher.button.menu.isOpen, 'pointer click opens launcher');
    assert(bar.launcher._rows.length > 0, 'launcher lists installed apps');
    const [, launcherY] = bar.launcher.button.menu.actor.get_transformed_position();
    await capture('launcher');
    console.log(`[GDX Dock test] Launcher geometry: ${JSON.stringify({y: launcherY, height: bar.launcher.button.menu.actor.height, contentHeight: bar.launcher.content.height, scrollHeight: bar.launcher.scroll.height})}`);
    assert(launcherY >= monitor.y, 'launcher fits within top screen edge');
    await input.click(bar.launcher._tabs.get('pinned'));
    assert(bar.launcher._filter === 'pinned', 'pointer click switches launcher filter');
    assert(bar.launcher.button.menu.isOpen, 'switching filter keeps launcher open');
    await input.click(bar.launcher._tabs.get('all'));
    bar.launcher.entry.set_text('GDX Test App');
    await Scripting.sleep(200);
    assert(bar.launcher._shown.length === 1, 'fixture app available in launcher');
    await input.click(bar.launcher._rows[0].get_first_child());
    await Scripting.sleep(1000);
    const fixtureApp = controller.catalog.system.lookup_app('org.example.GDXDockTest.desktop');
    assert(fixtureApp.get_windows().length > 0, 'pointer click launches a real application');
    assert(fixtureApp.get_windows().includes(global.display.focus_window), 'launched app receives focus');
    await input.click(bar.launcher.button);
    bar.launcher.entry.set_text('this-app-does-not-exist-735');
    await Scripting.sleep(200);
    assert(bar.launcher._rows.length === 0, 'empty search does not launch unrelated apps');
    bar.launcher.button.menu.close();

    Main.panel.statusArea.quickSettings.menu.open();
    await Scripting.sleep(350);
    assert(Main.panel.statusArea.quickSettings.menu.isOpen, 'native quick settings opens');
    await capture('quick-settings');
    Main.panel.statusArea.quickSettings.menu.close();
    Main.panel.statusArea.dateMenu.menu.open();
    await Scripting.sleep(250);
    assert(Main.panel.statusArea.dateMenu.menu.isOpen, 'native calendar opens');
    Main.panel.statusArea.dateMenu.menu.close();

    const source = MessageTray.getSystemSource();
    const notification = new MessageTray.Notification({source, title: 'Everything in one place.',
        body: 'GDX Dock brings apps and system controls to the bottom.',
        isTransient: true, forFeedback: true});
    source.addNotification(notification);
    await Scripting.sleep(450);
    const banner = Main.messageTray._bannerBin;
    const [, bannerY] = banner.get_transformed_position();
    console.log(`[GDX Dock test] Banner geometry: ${JSON.stringify({y: bannerY, height: banner.height,
        translation: banner.translation_y, trayHeight: Main.messageTray.height,
        trayY: Main.messageTray.y, barY: bar.actor.y, mapped: banner.mapped})}`);
    await capture('notification');
    assert(bannerY > monitor.y + monitor.height / 2 && bannerY + banner.height <= bar.actor.y,
        'notification appears above dock in lower half of screen');
    notification.destroy();
    await Scripting.sleep(250);

    await Scripting.createTestWindow({maximized: true});
    await Scripting.waitTestWindows();
    await Scripting.sleep(300);
    const window = global.get_window_actors().map(actor => actor.meta_window)
        .find(window => window.get_wm_class() === 'org.gnome.Shell.PerfHelper' || window.get_wm_class() === 'Gnome-shell-perf-helper');
    if (window)
        Main.activateWindow(window);
    await Scripting.sleep(200);
    assert(window && global.display.focus_window === window, 'real test application has focus');
    const frame = window.get_frame_rect();
    assert(frame.y >= monitor.y && frame.y + frame.height <= bar.actor.y + 1,
        'maximized application does not overlap dock');
    const app = Shell.WindowTracker.get_default().get_window_app(window);
    const appButton = bar.strip._buttons.get(app.get_id());
    const fixtureButton = bar.strip._buttons.get(fixtureApp.get_id());
    assert(appButton !== undefined, 'running application appears in dock');
    assert(appButton.actor.has_style_class_name('focused'), 'focused app has focus indicator');
    assert(appButton.runningBar.mapped && appButton.runningBar.width >= 18,
        'focused app has a visible running bar');
    assert(fixtureButton.runningBar.mapped && fixtureButton.actor.has_style_class_name('running') &&
        !fixtureButton.actor.has_style_class_name('focused'), 'background app keeps a visible running bar');
    const idle = [...bar.strip._buttons.values()].find(button => !button.entry.app.get_windows().length);
    assert(idle && !idle.runningBar.visible, 'unopened pinned app has no running bar');
    await input.click(appButton.actor, Clutter.BUTTON_SECONDARY);
    await Scripting.sleep(150);
    assert(appButton.menu.menu.isOpen, 'app context menu opens');
    appButton.menu.menu.close();
    await Scripting.sleep(250);
    Main.activateWindow(window);
    await Scripting.sleep(150);
    await capture('click-target');
    await input.click(appButton.actor);
    await Scripting.sleep(200);
    assert(window.minimized, 'click minimizes focused single window');
    assert(appButton.runningBar.mapped, 'minimized app keeps its running bar');
    await input.click(appButton.actor);
    await Scripting.sleep(200);
    assert(!window.minimized, 'second click restores application');
    assert(appButton.actor.has_style_class_name('focused'), 'focus highlight survives releasing the mouse');
    await input.click(fixtureButton.actor);
    assert(fixtureApp.get_windows().includes(global.display.focus_window), 'dock click switches to background application');
    assert(fixtureButton.actor.has_style_class_name('focused') && !appButton.actor.has_style_class_name('focused') &&
        appButton.runningBar.mapped, 'focus moves while both running bars remain visible');
    await input.click(fixtureButton.actor, Clutter.BUTTON_MIDDLE);
    await Scripting.sleep(800);
    assert(fixtureApp.get_windows().length === 2, 'middle click opens a second real application window');
    assert(fixtureButton.count.mapped && fixtureButton.count.text === '2', 'two windows show a visible number badge');
    await capture('running-apps');
    await input.click(appButton.actor);
    await input.click(bar.launcher.button);
    bar.launcher.entry.set_text('GDX Test App');
    await Scripting.sleep(150);
    await input.click(bar.launcher._rows[0].get_first_child());
    assert(fixtureApp.get_windows().includes(global.display.focus_window) && fixtureApp.get_windows().length === 2,
        'launcher click focuses an existing app without opening another window');
    await input.click(appButton.actor);
    await input.chord(Clutter.KEY_Super_L);
    bar.launcher.entry.set_text('GDX Test App');
    await input.chord(Clutter.KEY_Return);
    assert(!bar.launcher.button.menu.isOpen && fixtureApp.get_windows().includes(global.display.focus_window),
        'Enter opens the current search result before search debounce finishes');
    await input.chord(Clutter.KEY_Super_L);
    bar.launcher.entry.set_text('no-such-app-735');
    await input.chord(Clutter.KEY_Return);
    assert(bar.launcher.button.menu.isOpen && bar.launcher._shown.length === 0,
        'Enter never activates a stale result for an unmatched query');
    await input.chord(Clutter.KEY_Escape);
    await input.click(appButton.actor);
    await input.chord(Clutter.KEY_Alt_L, Clutter.KEY_Tab);
    assert(fixtureApp.get_windows().includes(global.display.focus_window), 'Alt+Tab still switches applications');
    await input.chord(Clutter.KEY_Super_L, Clutter.KEY_Tab);
    assert(global.display.focus_window === window && !bar.launcher.button.menu.isOpen,
        'Super+Tab still switches applications without opening launcher');
    const extraWindow = fixtureApp.get_windows()[0];
    extraWindow.delete(global.get_current_time());
    await Scripting.sleep(200);
    assert(!fixtureButton.count.visible && fixtureButton.runningBar.mapped, 'closing one of two windows hides count and keeps running bar');
    window.make_fullscreen();
    await Scripting.sleep(250);
    assert(bar.actor.mapped, 'permanent dock remains in fullscreen');
    controller.settings.set_boolean('show-in-fullscreen', false);
    await Scripting.sleep(150);
    assert(!bar.actor.mapped, 'optional fullscreen hiding works');
    window.unmake_fullscreen();
    controller.settings.set_boolean('show-in-fullscreen', true);
    await Scripting.destroyTestWindows();
    await Scripting.sleep(250);
    assert(bar.actor.mapped, 'switching back to permanent restores dock visibility');
    for (const fixtureWindow of fixtureApp.get_windows())
        fixtureWindow.delete(global.get_current_time());
    await Scripting.sleep(250);
    assert(!bar.strip._buttons.has(fixtureApp.get_id()), 'closing last window removes unpinned app from dock');

    const savedFavorites = global.settings.get_strv('favorite-apps');
    const extraApps = controller.catalog.entries.filter((_entry, index) => index % 2 === 0)
        .slice(0, 14).map(entry => entry.id);
    global.settings.set_strv('favorite-apps', [...new Set([...savedFavorites, ...extraApps])]);
    await Scripting.sleep(250);
    console.log(`[GDX Dock test] Overflow: ${JSON.stringify({apps: bar.strip._buttons.size,
        upper: bar.strip.actor.hadjustment.upper, page: bar.strip.actor.hadjustment.page_size,
        boxWidth: bar.strip.box.width, boxPreferred: bar.strip.box.get_preferred_width(-1),
        stripWidth: bar.strip.actor.width, children: bar.strip.box.get_children().slice(0, 3).map(actor =>
            ({width: actor.width, preferred: actor.get_preferred_width(-1)}))})}`);
    await capture('overflow');
    assert(bar.strip.actor.hadjustment.upper > bar.strip.actor.hadjustment.page_size,
        'many pinned apps overflow into a scrollable dock');
    assert(bar.center.x + bar.center.width < bar.right.x,
        'overflow never covers system controls');
    const buttons = [...bar.strip._buttons.values()].sort((a, b) => a.actor.x - b.actor.x);
    for (const edge of [buttons.at(-1), buttons[0]]) {
        edge.actor.grab_key_focus();
        await Scripting.sleep(150);
        const [itemX] = edge.actor.get_transformed_position();
        const [viewportX] = bar.strip.actor.get_transformed_position();
        console.log(`[GDX Dock test] Focus visibility: ${JSON.stringify({itemX, viewportX,
            width: edge.actor.width, viewportWidth: bar.strip.actor.width,
            value: bar.strip.actor.hadjustment.value, x: edge.actor.x})}`);
        assert(itemX >= viewportX && itemX + edge.actor.width <= viewportX + bar.strip.actor.width,
            'keyboard focus scrolls either edge into view in the current text direction');
    }
    global.settings.set_strv('favorite-apps', savedFavorites);
    await Scripting.sleep(200);

    function descendants(actor) {
        return actor.get_children().flatMap(child => [child, ...descendants(child)]);
    }
    const clockLabel = descendants(Main.panel._rightBox).find(actor => actor.has_style_class_name?.('clock'));
    const statusIcon = descendants(Main.panel._rightBox).find(actor =>
        actor instanceof St.Icon && actor.has_style_class_name('system-status-icon'));
    assert(clockLabel && statusIcon, 'native clock and status icon are available for sizing checks');
    const defaultClockSize = clockLabel.get_theme_node().get_font().get_size();
    const defaultStatusSize = statusIcon.get_theme_node().get_length('icon-size');
    controller.settings.set_int('text-scale', 150);
    controller.settings.set_int('system-icon-size', 32);
    await Scripting.sleep(350);
    console.log(`[GDX Dock test] Sizing: ${JSON.stringify({before: defaultClockSize, after: clockLabel.get_theme_node().get_font().get_size(), icon: statusIcon.get_theme_node().get_length('icon-size')})}`);
    assert(clockLabel.get_theme_node().get_font().get_size() >= defaultClockSize * 1.49,
        'text setting enlarges the native clock live');
    assert(statusIcon.get_theme_node().get_length('icon-size') === 32 * bar.scale,
        'system icon setting enlarges the right-hand indicators live');
    assert(bar.right.y >= 0 && bar.right.y + bar.right.height <= bar.actor.height,
        'enlarged system controls fit inside the dock');
    await input.click(bar.launcher.button);
    await Scripting.sleep(250);
    const [, enlargedY] = bar.launcher.button.menu.actor.get_transformed_position();
    assert(enlargedY >= monitor.y, 'enlarged launcher fits inside the monitor');
    await capture('larger-text-and-system-icons');
    bar.launcher.button.menu.close();
    const sizingFile = controller.sizing._file;
    controller.settings.reset('text-scale');
    controller.settings.reset('system-icon-size');
    await Scripting.sleep(250);
    assert(clockLabel.get_theme_node().get_font().get_size() === defaultClockSize &&
        statusIcon.get_theme_node().get_length('icon-size') === defaultStatusSize,
    'reset restores the original text and system icon sizes');
    assert(!St.ThemeContext.get_for_stage(global.stage).get_theme().get_custom_stylesheets()
        .some(file => file.equal(sizingFile)), 'default sizes unload the sizing overrides');

    controller.settings.set_int('icon-size', 52);
    await Scripting.sleep(250);
    assert(bar.actor.height === 90 * bar.scale, 'settings resize dock live');
    controller.settings.set_int('icon-size', 40);

    for (let i = 0; i < 3; i++) {
        state.disable();
        await Scripting.sleep(150);
        assert(Main.layoutManager.panelBox.visible, `disable ${i + 1} restores top panel`);
        assert(!sizingFile.query_exists(null), 'disable removes the temporary sizing stylesheet');
        assert(Main.panel._rightBox.get_parent() === Main.panel, 'system actors restored');
        assert(Main.panel.statusArea.dateMenu.container.get_parent() === Main.panel._centerBox,
            'clock restored');
        await input.chord(Clutter.KEY_Super_L);
        assert(Main.overview.visible, `disable ${i + 1} restores GNOME Super key`);
        Main.overview.hide();
        await Scripting.sleep(300);
        state.enable();
        await Scripting.sleep(200);
        assert(state._controller.bar.actor.mapped, `enable ${i + 1} recreates dock`);
        await input.chord(Clutter.KEY_Super_L);
        assert(state._controller.bar.launcher.button.menu.isOpen && !Main.overview.visible,
            `enable ${i + 1} handles Super exactly once`);
        await input.chord(Clutter.KEY_Super_L);
    }
    input.destroy();
    console.log('[GDX Dock test] ALL CHECKS PASSED');
}
