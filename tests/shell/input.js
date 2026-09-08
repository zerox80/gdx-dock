// Virtual devices deliver actual Clutter pointer/key events to the test compositor.
// They never interact with the user's desktop or emit widget signals directly.
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';

export class Input {
    constructor() {
        const seat = global.stage.context.get_backend().get_default_seat();
        this.seat = seat;
        this.pointer = seat.create_virtual_device(Clutter.InputDeviceType.POINTER_DEVICE);
        this.keyboard = seat.create_virtual_device(Clutter.InputDeviceType.KEYBOARD_DEVICE);
        // Keep overview animations from re-triggering the hot corner at (0, 0).
        this.seat.warp_pointer(global.stage.width / 2, global.stage.height / 2);
        this.pointer.notify_absolute_motion(GLib.get_monotonic_time(),
            global.stage.width / 2, global.stage.height / 2);
    }

    async click(actor, button = Clutter.BUTTON_PRIMARY) {
        const [x, y] = actor.get_transformed_position();
        const [width, height] = actor.get_transformed_size();
        this.seat.warp_pointer(x + width / 2, y + height / 2);
        this.pointer.notify_absolute_motion(GLib.get_monotonic_time(), x + width / 2, y + height / 2);
        await Scripting.sleep(60);
        this.pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.PRESSED);
        await Scripting.sleep(60);
        this.pointer.notify_button(GLib.get_monotonic_time(), button, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(250);
    }

    async chord(...keys) {
        for (const key of keys) {
            this.keyboard.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.PRESSED);
            await Scripting.sleep(30);
        }
        for (const key of [...keys].reverse()) {
            this.keyboard.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.RELEASED);
            await Scripting.sleep(30);
        }
        await Scripting.sleep(300);
    }

    async moveTo(x, y) {
        this.seat.warp_pointer(x, y);
        this.pointer.notify_absolute_motion(GLib.get_monotonic_time(), x, y);
        await Scripting.sleep(80);
    }

    async beginDrag(actor) {
        const [x, y] = actor.get_transformed_position();
        const [width, height] = actor.get_transformed_size();
        await this.moveTo(x + width / 2, y + height / 2);
        this.pointer.notify_button(GLib.get_monotonic_time(),
            Clutter.BUTTON_PRIMARY, Clutter.ButtonState.PRESSED);
        await Scripting.sleep(220);
        await this.moveTo(x + width / 2 + 20, y + height / 2);
    }

    async endDrag() {
        this.pointer.notify_button(GLib.get_monotonic_time(),
            Clutter.BUTTON_PRIMARY, Clutter.ButtonState.RELEASED);
        await Scripting.sleep(350);
    }

    async typeText(text) {
        for (const character of text) {
            const key = character.codePointAt(0);
            this.keyboard.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.PRESSED);
            this.keyboard.notify_keyval(GLib.get_monotonic_time(), key, Clutter.KeyState.RELEASED);
            await Scripting.sleep(20);
        }
        await Scripting.sleep(150);
    }

    destroy() {
        this.pointer.run_dispose();
        this.keyboard.run_dispose();
    }
}
