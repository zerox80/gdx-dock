// SPDX-License-Identifier: GPL-2.0-or-later
import {_, format} from '../core/i18n.js';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Disposables} from '../core/disposables.js';

export class Workspaces {
    constructor(settings) {
        this._scope = new Disposables();
        this.actor = new St.BoxLayout({style_class: 'gdx-workspaces',
            y_align: Clutter.ActorAlign.CENTER});
        this._scope.connect(global.workspace_manager, 'notify::n-workspaces', () => this.render());
        this._scope.connect(global.workspace_manager, 'active-workspace-changed', () => this.render());
        this._scope.connect(settings, 'changed::show-workspaces', () => {
            this.actor.visible = settings.get_boolean('show-workspaces');
        });
        this.actor.visible = settings.get_boolean('show-workspaces');
        this.render();
    }

    render() {
        this.actor.destroy_all_children();
        const manager = global.workspace_manager;
        const active = manager.get_active_workspace_index();
        // A sliding group remains useful even with many static workspaces.
        const start = Math.max(0, Math.min(active - 1, manager.n_workspaces - 4));
        for (let index = start; index < Math.min(start + 4, manager.n_workspaces); index++) {
            const button = new St.Button({style_class: 'gdx-workspace', can_focus: true,
                accessible_name: format(_('Workspace %d'), index + 1),
                child: new St.Widget({style_class: index === active ? 'gdx-workspace-current' : 'gdx-workspace-dot'})});
            button.connect('clicked', () => {
                Main.wm.actionMoveWorkspace(manager.get_workspace_by_index(index));
            });
            this.actor.add_child(button);
        }
    }

    destroy() {
        this._scope.destroy();
        this.actor.destroy();
    }
}
