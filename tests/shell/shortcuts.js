import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

export async function checkShortcuts(launcher, input, assert) {
    // Queue typing directly after Super, without chord()'s settling delay.
    for (const query of ['g', 'gdx', 'gdx test']) {
        input.tap(Clutter.KEY_Super_L);
        await input.typeText(query);
        assert(launcher.button.menu.isOpen && launcher.entry.get_text() === query,
            `typing immediately after Super preserves "${query}" (got "${launcher.entry.get_text()}")`);
        await input.chord(Clutter.KEY_Escape);
    }

    launcher.button.menu.open();
    assert(global.stage.get_key_focus() === launcher.entry.clutter_text,
        'opening the launcher focuses search synchronously');
    launcher._tabs.get('all').grab_key_focus();
    await Scripting.sleep(200);
    assert(global.stage.get_key_focus() === launcher._tabs.get('all'),
        'opening the launcher does not steal focus back after keyboard navigation');
    await input.chord(Clutter.KEY_Escape);

    await input.chord(Clutter.KEY_Super_L);
    assert(launcher.button.menu.isOpen && !Main.overview.visible, 'Super alone opens GDX launcher');
    assert(global.stage.get_key_focus() === launcher.entry.clutter_text, 'Super focuses app search for typing');
    await input.typeText('gdx');
    assert(launcher.entry.get_text() === 'gdx' && launcher._shown.length === 1,
        'typing after Super filters the installed app list');
    await input.chord(Clutter.KEY_Super_L);
    assert(!launcher.button.menu.isOpen && !Main.overview.visible, 'Super again closes GDX launcher');
    await input.chord(Clutter.KEY_Super_L, Clutter.KEY_w);
    assert(Main.overview.visible && !launcher.button.menu.isOpen, 'Super+W opens GNOME overview');
    await input.chord(Clutter.KEY_Super_L);
    await Scripting.sleep(200);
    assert(launcher.button.menu.isOpen && !Main.overview.visible, 'Super switches from overview to app menu');
    await input.chord(Clutter.KEY_Super_L, Clutter.KEY_w);
    assert(Main.overview.visible && !launcher.button.menu.isOpen, 'Super+W switches from app menu to overview');
    await input.chord(Clutter.KEY_Super_L, Clutter.KEY_w);
    assert(!Main.overview.visible, 'Super+W closes overview again');
    await input.chord(Clutter.KEY_Super_L);
    await input.chord(Clutter.KEY_Escape);
    assert(!launcher.button.menu.isOpen, 'Escape closes app menu');
    assert(!Main.layoutManager.overviewGroup.visible, 'returning from overview fully hides its actors');
}
