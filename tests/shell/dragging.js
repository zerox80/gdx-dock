// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

function edge(actor, end, rtl) {
    const [x, y] = actor.get_transformed_position();
    const [width, height] = actor.get_transformed_size();
    return [x + (end !== rtl ? width - 4 : 4), y + height / 2];
}

export async function checkDragging(bar, input, fixtureApp, assert, capture) {
    const {strip} = bar;
    const {catalog} = strip;
    const rtl = strip.box.get_text_direction() === Clutter.TextDirection.RTL;
    const savedFavorites = global.settings.get_strv('favorite-apps');
    const savedRunning = strip.settings.get_strv('running-app-order');
    const idle = catalog.entries.filter(entry => !entry.app.get_windows().length).slice(0, 2);
    const id = fixtureApp.get_id();
    const button = () => strip._buttons.get(id);
    const orderIs = expected => global.settings.get_strv('favorite-apps').join() === expected.join();
    const focusWindow = fixtureApp.get_windows()[0];
    Main.activateWindow(focusWindow);
    try {
        assert(idle.length === 2, 'two idle applications available for drag fixtures');
        global.settings.set_strv('favorite-apps', [idle[0].id, id, idle[1].id]);
        await Scripting.sleep(200);
        await input.beginDrag(button().actor);
        assert(strip.drag.source === button(), 'holding the primary button and moving starts dragging');
        await input.moveTo(...edge(strip._buttons.get(idle[1].id).actor, true, rtl));
        assert(strip.drag._marker.visible, 'dragging shows the insertion marker');
        assert(orderIs([idle[0].id, id, idle[1].id]), 'drag preview does not change saved favorites');
        await capture('app-drag');
        await input.endDrag();
        assert(orderIs([idle[0].id, idle[1].id, id]), 'drop moves a pinned app to the end');
        assert(!strip.drag.source && !strip.drag._marker.visible, 'drop removes drag state and marker');
        assert(global.display.focus_window === focusWindow && !focusWindow.minimized &&
            fixtureApp.get_windows().length === 1, 'dragging never launches, minimizes or activates a window');

        await input.beginDrag(button().actor);
        await input.moveTo(...edge(strip._buttons.get(idle[0].id).actor, false, rtl));
        await input.endDrag();
        assert(orderIs([id, idle[0].id, idle[1].id]), 'same app can immediately be dragged back to the start');

        await input.beginDrag(button().actor);
        await input.moveTo(global.stage.width / 2, global.stage.height / 2);
        assert(!strip.drag._marker.visible, 'leaving the dock hides the insertion marker');
        await input.endDrag();
        assert(orderIs([id, idle[0].id, idle[1].id]), 'dropping outside the dock preserves favorites');
        await input.beginDrag(button().actor);
        await input.moveTo(...edge(strip._buttons.get(idle[1].id).actor, true, rtl));
        await input.chord(Clutter.KEY_Escape);
        await input.endDrag();
        assert(orderIs([id, idle[0].id, idle[1].id]) && !strip.drag.source,
            'Escape cancels a repeated drag without saving or leaving a grab');

        global.settings.set_strv('favorite-apps', idle.map(entry => entry.id));
        await Scripting.sleep(200);
        const other = catalog.dock.find(entry => entry.id !== id && !catalog.favorites.isFavorite(entry.id));
        assert(other, 'another running app is available for reordering');
        await input.beginDrag(button().actor);
        await input.moveTo(...edge(strip._buttons.get(other.id).actor, true, rtl));
        await input.endDrag();
        assert(catalog.dock.at(-1).id === id && !catalog.favorites.isFavorite(id),
            'running apps can be moved without being pinned');
        await input.beginDrag(button().actor);
        await input.moveTo(...edge(strip._buttons.get(other.id).actor, false, rtl));
        await input.endDrag();
        assert(catalog.dock.filter(entry => !catalog.favorites.isFavorite(entry.id))[0].id === id &&
            strip.settings.get_strv('running-app-order')[0] === id, 'running app order is saved in settings');

        await input.beginDrag(button().actor);
        await input.moveTo(...edge(strip._buttons.get(idle[0].id).actor, false, rtl));
        await input.endDrag();
        assert(orderIs([id, idle[0].id, idle[1].id]) &&
            catalog.dock.filter(entry => entry.id === id).length === 1,
        'dragging a running app into the pinned section pins it once at the drop position');
        // Clear GNOME's transient pin notification before the rest of the suite.
        for (const source of Main.messageTray.getSources()) {
            for (const notification of [...source.notifications])
                notification.destroy();
        }
    } finally {
        if (strip.drag.source) {
            await input.chord(Clutter.KEY_Escape);
            await input.endDrag();
        }
        global.settings.set_strv('favorite-apps', savedFavorites);
        strip.settings.set_strv('running-app-order', savedRunning);
        await Scripting.sleep(250);
    }
}

export async function checkDragScrolling(bar, input, assert) {
    const {strip} = bar;
    const saved = global.settings.get_strv('favorite-apps');
    const rtl = strip.box.get_text_direction() === Clutter.TextDirection.RTL;
    const adjustment = strip.actor.hadjustment;
    adjustment.value = 0;
    await Scripting.sleep(100);
    const id = strip.catalog.pinned[0].id;
    const button = strip._buttons.get(id);
    await input.beginDrag(button.actor);
    await input.moveTo(...edge(strip.actor, true, rtl));
    for (let i = 0; i < 40 && adjustment.value < adjustment.upper - adjustment.page_size - 1; i++)
        await Scripting.sleep(100);
    assert(adjustment.value > 0 && strip.drag.source === button,
        'holding a dragged app at the trailing edge automatically scrolls the dock');
    await input.endDrag();
    assert(strip.catalog.pinned.at(-1).id === id, 'edge scrolling allows dropping after the last app');

    await input.beginDrag(button.actor);
    await input.moveTo(...edge(strip.actor, false, rtl));
    for (let i = 0; i < 40 && adjustment.value > 1; i++)
        await Scripting.sleep(100);
    await input.endDrag();
    assert(strip.catalog.pinned[0].id === id && adjustment.value <= 1,
        'dragging at the opposite edge scrolls back and moves the app to the start');
    assert(global.settings.get_strv('favorite-apps').join() === saved.join(),
        'moving to both ends preserves every other favorite and its order');
}
