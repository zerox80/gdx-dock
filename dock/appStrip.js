// SPDX-License-Identifier: GPL-2.0-or-later
import {_} from '../core/i18n.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import {Disposables} from '../core/disposables.js';
import {AppButton} from './appButton.js';
import {Tooltip} from './tooltip.js';

export class AppStrip {
    constructor(catalog, settings) {
        this._scope = new Disposables();
        this._buttons = new Map();
        this.catalog = catalog;
        this.settings = settings;
        this.tooltip = this._scope.own(new Tooltip());
        this.actor = new St.ScrollView({style_class: 'gdx-dock gdx-surface',
            hscrollbar_policy: St.PolicyType.EXTERNAL, vscrollbar_policy: St.PolicyType.NEVER,
            overlay_scrollbars: true, y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER, clip_to_allocation: true});
        this.box = new St.BoxLayout({style_class: 'gdx-apps',
            y_align: Clutter.ActorAlign.CENTER});
        this.actor.set_child(this.box);
        this._scope.add(catalog.subscribe(() => this.render()));
        this._scope.connect(settings, 'changed::icon-size', () => this.render(true));
        this._scope.connect(this.actor, 'scroll-event', (_actor, event) => {
            const adjustment = this.actor.hadjustment;
            if (adjustment.upper <= adjustment.page_size)
                return Clutter.EVENT_PROPAGATE;
            const direction = event.get_scroll_direction();
            const delta = direction === Clutter.ScrollDirection.SMOOTH
                ? event.get_scroll_delta()[1] * 40
                : (direction === Clutter.ScrollDirection.UP ? -56 : 56);
            adjustment.value = Math.max(0, Math.min(adjustment.value + delta,
                adjustment.upper - adjustment.page_size));
            return Clutter.EVENT_STOP;
        });
        this.render();
    }

    render(rebuild = false) {
        this.tooltip.hide();
        const entries = this.catalog.dock;
        const ids = new Set(entries.map(entry => entry.id));
        for (const [id, button] of this._buttons) {
            if (rebuild || !ids.has(id)) {
                button.destroy();
                this._buttons.delete(id);
            }
        }
        this._separator?.destroy();
        this._separator = null;
        this._empty?.destroy();
        this._empty = null;
        let index = 0;
        const pinnedCount = this.catalog.pinned.length;
        for (const [entryIndex, entry] of entries.entries()) {
            if (entryIndex === pinnedCount && pinnedCount > 0) {
                this._separator = new St.Widget({style_class: 'gdx-separator',
                    y_align: Clutter.ActorAlign.CENTER});
                this.box.insert_child_at_index(this._separator, index++);
            }
            let button = this._buttons.get(entry.id);
            if (!button) {
                button = new AppButton(entry, this.catalog, this.settings, this.tooltip);
                this._buttons.set(entry.id, button);
                this.box.insert_child_at_index(button.actor, index);
                button.actor.connect('key-focus-in', () => {
                    const adjustment = this.actor.hadjustment;
                    const start = button.actor.x;
                    const end = start + button.actor.width;
                    const rtl = this.box.get_text_direction() === Clutter.TextDirection.RTL;
                    const maximum = Math.max(0, adjustment.upper - adjustment.page_size);
                    // StViewport measures its adjustment from the right in RTL.
                    let offset = rtl ? maximum - adjustment.value : adjustment.value;
                    if (start < offset)
                        offset = start;
                    else if (end > offset + adjustment.page_size)
                        offset = end - adjustment.page_size;
                    offset = Math.max(0, Math.min(offset, maximum));
                    adjustment.value = rtl ? maximum - offset : offset;
                });
            } else {
                this.box.set_child_at_index(button.actor, index);
                button.update();
            }
            index++;
        }
        if (!entries.length) {
            this._empty = new St.Label({text: _('Your apps · pin them from search'),
                style_class: 'gdx-empty-dock', y_align: Clutter.ActorAlign.CENTER});
            this.box.add_child(this._empty);
        }
    }

    destroy() {
        for (const button of this._buttons.values())
            button.destroy();
        this._buttons.clear();
        this._scope.destroy();
        this.actor.destroy();
    }
}
