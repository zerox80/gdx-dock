# GDX Dock

<img width="1920" height="1200" alt="Bildschirmfoto vom 2026-09-08 22-26-02" src="https://github.com/user-attachments/assets/8dbe4220-2e01-4cbb-9a85-8a83920f4210" />


**GDX** stands for **GNOME Desktop eXtension**.

A standalone **GNOME Shell 50** extension that brings your apps, workspaces and native system controls into a full-width bottom dock. Mint on dark graphite, adjustable colors and subtle animations. No webview or extra desktop process.

## Features

- App launcher with localized app names, search, filters and favorites.
- Pinned and running apps, persistent running indicators, focused-app highlighting and window counts.
- App context menus, pinning, reordering, middle-click to open a new window and scrolling to switch windows.
- Hold the left mouse button and drag app icons left or right to reorder them. An insertion marker shows the drop position; the dock scrolls at either edge. Pinned and running app orders are saved. Drag a running app into the pinned section to pin it. Escape or dropping outside the dock cancels the move.
- Workspace switcher and native GNOME Wi-Fi, audio, Bluetooth, battery, input, privacy and clock controls. Availability depends on your hardware and GNOME configuration.
- Calendar and quick settings open above the dock. Notification banners appear at the bottom.
- Reserved space below maximized windows, with optional visibility over fullscreen windows.
- **Super** toggles app search; **Super + W** opens the overview by default. Alt+Tab and Super+Tab keep their usual behavior.
- libadwaita preferences for size, opacity, accent color, workspaces, fullscreen behavior, animations and shortcuts.
- Automatic session-language selection with English as the fallback. See [Translations](docs/TRANSLATING.md) for coverage and contribution instructions.

## Requirements

GNOME Shell **50**, GLib and `gnome-extensions`. Installation checks also require Node.js, Python 3 and GNU gettext (`xgettext`, `msgmerge`, `msgfmt`). There are no npm dependencies. Shell integration tests additionally require `gnome-shell-test-tool`; preferences tests require GJS, GTK4 and libadwaita.

The extension uses GNOME Shell APIs and is not a standalone dock for other desktop environments. GNOME 51 is not supported yet.

## Installation

Clone the repository and run the installer from the checkout:

```sh
git clone https://github.com/zerox80/gdx-dock.git
cd gdx-dock
bash scripts/install.sh
```

**Log out and back in after installation or an update.** GNOME 50 caches loaded JavaScript modules for the current session; toggling an extension does not reload its updated code. Then activate the dock:

```sh
bash scripts/activate.sh
```

The installer uses GNOME's per-user extension location; no machine-specific paths are required. When migrating from the former Beauty Dock name, it copies existing settings if GDX Dock has no saved settings and `dconf` is available. The public extension UUID is `gdx-dock@zerox80.github.io`. Settings from the earlier `gdx-dock@local` installation are retained because the settings schema and path are unchanged. The activation script disables the earlier local GDX Dock, the old extension and competing docks only after GNOME recognizes GDX Dock. It restores previously enabled docks if startup fails.

If GNOME has already recorded an `ERROR` state, the script prepares the extension for the next login. Using GDX Dock together with Dash to Dock or Dash to Panel is not supported.

```sh
gnome-extensions prefs gdx-dock@zerox80.github.io
gnome-extensions disable gdx-dock@zerox80.github.io
```

You can also manage GDX Dock using GNOME's **Extensions** application. Its interface follows GNOME's language settings. The project name remains GDX Dock in every language.

Disabling GDX Dock restores GNOME's panel, status indicators, calendar, notification placement and Super-key behavior. GNOME favorites are preserved.

## Text and system icon sizes

Open GDX Dock preferences and use **Text size** (100–150%) and **System icon size** (16–32 logical pixels) under Appearance. Text scaling covers the dock, launcher and dock menus; system icon sizing covers the status indicators on the right. The existing app icon size remains independent.

Defaults remain **100% text**, **16 px system icons** and **40 px app icons**. Changes apply immediately. Set the controls back to these values to restore the original sizing. The launcher and dock adjust their layout to fit larger content. Display scaling is applied by GNOME as usual.

## Development

```sh
npm run check
npm run test:i18n
npm run test:prefs
npm run pack
npm run test:shell
```

Shell tests use a separate session bus and temporary XDG data, configuration, cache and runtime directories. They do not modify the current desktop's settings. Build output goes to `dist/`; generated screenshots and logs go to `artifacts/`. Neither directory is committed. See [Validation](docs/VALIDATION.md).

| Directory | Purpose |
| --- | --- |
| `core/` | Lifecycle, cleanup, scheduling, shortcuts and translation helpers |
| `dock/` | Bottom bar, app buttons, menus, tooltips, workspaces and geometry |
| `search/` | Launcher, filters and keyboard navigation |
| `services/` | App catalog, search, favorites and window operations |
| `system/` | Reversible native-panel and notification integration |
| `preferences/` | GTK4/libadwaita preferences |
| `schemas/` | GSettings keys and defaults |
| `po/` | Gettext translation source files |
| `tests/` | Unit, translation, preferences and isolated Shell tests |
| `scripts/` | Validation, translations, packaging, installation and activation |

## Compatibility

The dock follows the primary monitor; it does not create a second bar on additional monitors. Extensions that restructure GNOME's panel may conflict. Native panel actors are borrowed and restored on cleanup, rather than destroyed. Global GNOME keyboard settings are not rewritten; Super+Escape retains its Wayland shortcut-inhibition function.

The implementation targets the GNOME 50 API generation. See the official [GNOME 50 porting guide](https://gjs.guide/extensions/upgrading/gnome-shell-50.html).

License: **MIT**.
