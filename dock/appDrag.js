// SPDX-License-Identifier: GPL-2.0-or-later
import Clutter from 'gi://Clutter';
import Shell from 'gi://Shell';
import St from 'gi://St';
import * as DND from 'resource:///org/gnome/shell/ui/dnd.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Scheduler} from '../core/scheduler.js';

export class AppDrag {
    constructor(strip) {
        this.strip = strip;
        this.source = null;
        this._scheduler = new Scheduler();
        this._marker = new St.Widget({style_class: 'gdx-drop-marker', visible: false});
        Main.uiGroup.add_child(this._marker);
        Shell.util_set_hidden_from_pick(this._marker, true);
        strip.actor._delegate = this;
    }

    canDrag(button) {
        const pinned = this.strip.catalog.favorites.isFavorite(button.entry.id);
        return pinned ? global.settings.is_writable('favorite-apps')
            : this.strip.settings.is_writable('running-app-order');
    }

    begin(button) {
        this.source = button;
        this._monitor = {dragMotion: event => {
            if (event.source !== this.source)
                return DND.DragMotionResult.CONTINUE;
            return this._update(event.x, event.y);
        }};
        DND.addDragMonitor(this._monitor);
    }

    clearTarget() {
        this._scheduler.cancel('scroll');
        this._target = null;
        this._marker.hide();
    }

    end(button) {
        if (this.source !== button)
            return;
        this.clearTarget();
        DND.removeDragMonitor(this._monitor);
        this._monitor = null;
        this.source = null;
        if (!this.strip._destroying)
            this._scheduler.schedule('render', 0, () => this.strip.render());
    }

    _update(x, y) {
        const {actor, box, catalog} = this.strip;
        const [left, top] = actor.get_transformed_position();
        const [width, height] = actor.get_transformed_size();
        if (!this.source || !actor.mapped || x < left || x > left + width ||
            y < top || y > top + height) {
            this.clearTarget();
            return DND.DragMotionResult.NO_DROP;
        }

        const rtl = box.get_text_direction() === Clutter.TextDirection.RTL;
        const scale = St.ThemeContext.get_for_stage(global.stage).scale_factor;
        const id = this.source.entry.id;
        const favorites = catalog.favorites;
        let pinned = favorites.isFavorite(id);
        const separator = this.strip._separator;
        if (!pinned && separator) {
            const [separatorX] = separator.get_transformed_position();
            const [separatorWidth] = separator.get_transformed_size();
            const boundary = separatorX + separatorWidth / 2;
            pinned = rtl ? x >= boundary : x <= boundary;
        }
        if (pinned && (!global.settings.is_writable('favorite-apps') ||
            !this.source.entry.app.get_app_info() || this.source.entry.app.is_window_backed())) {
            this.clearTarget();
            return DND.DragMotionResult.NO_DROP;
        }

        const candidates = box.get_children()
            .map(child => child._delegate)
            .filter(button => button?.entry && button.entry.id !== id &&
                favorites.isFavorite(button.entry.id) === pinned)
            .map(button => {
                const [itemX] = button.actor.get_transformed_position();
                const [itemWidth] = button.actor.get_transformed_size();
                return {id: button.entry.id, start: itemX, end: itemX + itemWidth};
            });
        let position = candidates.findIndex(item => rtl
            ? x > (item.start + item.end) / 2 : x < (item.start + item.end) / 2);
        if (position < 0)
            position = candidates.length;
        const before = candidates[position - 1];
        const after = candidates[position];
        this._target = {pinned, before: before?.id, after: after?.id};

        const trailing = before ? (rtl ? before.start : before.end) : null;
        const leading = after ? (rtl ? after.end : after.start) : null;
        const markerX = trailing !== null && leading !== null ? (trailing + leading) / 2
            : trailing !== null ? trailing + (rtl ? -2 : 2) * scale
                : leading !== null ? leading + (rtl ? 2 : -2) * scale : x;
        this._marker.style_class = `gdx-drop-marker gdx-${this.strip.settings.get_string('accent')}`;
        this._marker.set_size(3 * scale, Math.max(12 * scale, height - 12 * scale));
        this._marker.set_position(Math.round(Math.max(left + 2 * scale,
            Math.min(markerX - 1.5 * scale, left + width - 5 * scale))), top + 6 * scale);
        this._marker.show();

        const direction = x < left + 24 * scale ? -1 : x > left + width - 24 * scale ? 1 : 0;
        const adjustment = actor.hadjustment;
        const maximum = Math.max(0, adjustment.upper - adjustment.page_size);
        const next = Math.max(0, Math.min(maximum,
            adjustment.value + direction * (rtl ? -1 : 1) * 14 * scale));
        this._scheduler.cancel('scroll');
        if (direction && next !== adjustment.value) {
            this._scheduler.schedule('scroll', 40, () => {
                adjustment.value = next;
                this._update(x, y);
            });
        }
        return DND.DragMotionResult.MOVE_DROP;
    }

    acceptDrop(source, _actor, x, y) {
        if (!this.source || source !== this.source || !this.canDrag(source))
            return false;
        const actor = this.strip.actor;
        const [left, top] = actor.get_transformed_position();
        const [width, height] = actor.get_transformed_size();
        this._update(left + x * width / actor.width, top + y * height / actor.height);
        if (!this._target)
            return false;

        const {catalog} = this.strip;
        const id = source.entry.id;
        if (!catalog.dock.some(entry => entry.id === id))
            return false;
        const {pinned, before, after} = this._target;
        const favorites = catalog.favorites;
        const ids = (pinned ? favorites.getFavorites().map(app => app.get_id())
            : catalog.dock.filter(entry => !favorites.isFavorite(entry.id)).map(entry => entry.id))
            .filter(other => other !== id);
        // Resolve against the latest catalog in case an app closed during the drag.
        const position = ids.includes(after) ? ids.indexOf(after)
            : ids.includes(before) ? ids.indexOf(before) + 1 : 0;
        if (pinned) {
            if (favorites.isFavorite(id)) {
                if (favorites.getFavorites().findIndex(app => app.get_id() === id) !== position)
                    favorites.moveFavoriteToPos(id, position);
            } else {
                favorites.addFavoriteAtPos(id, position);
            }
        } else {
            catalog.moveRunningApp(id, position);
        }
        this.clearTarget();
        return true;
    }

    destroy() {
        this.clearTarget();
        if (this._monitor)
            DND.removeDragMonitor(this._monitor);
        this._scheduler.destroy();
        this._marker.destroy();
        delete this.strip.actor._delegate;
    }
}
