# Validation

## Runtime environment

The dock has been tested with GNOME Shell/Mutter **50.4** on Wayland. Shell integration tests run on a virtual 1280 × 720 monitor, with a separate session bus and temporary XDG data, configuration, cache and runtime directories. Paths are resolved from the checkout at runtime; no developer-specific directory is required.

## Functional checks

- Twelve unit tests cover search normalization, accented characters, German sharp S, metadata search, ranking, empty queries, favorites deduplication, monitor geometry, scaling, bounded dock width reverse-order resource cleanup, reordered translation placeholders and non-Latin search text.
- The isolated Shell suite covers loading, bottom-bar placement, native controls, reserved window space, launcher search, menu placement, calendar, quick settings, notifications, maximized windows, fullscreen behavior, scrolling, resizing and repeated disable/enable cycles.
- Virtual mouse and keyboard events exercise application launching, focus, context menus, minimizing, new windows, closing windows, shortcuts and restoration of GNOME's original Super-key behavior. Left-click checks cover cycling through two and three windows in stable order, cycling with click-to-minimize disabled, and restoring the most recently used window of a background app.
- Drag tests use held mouse buttons and pointer motion to move pinned and running apps in both directions, check saved ordering, pin a running app by dropping it among favorites, cancel with Escape or an outside drop, and scroll at both edges of an overflowing dock. They also check that dragging does not launch or minimize a window, and disabling during a drag releases the modal grab.
- GTK4/libadwaita tests construct preferences and check two-way GSettings bindings, accent selection and shortcut validation using an in-memory settings backend.
- Static checks validate JavaScript syntax and GSettings schemas. Packaging includes the runtime modules, stylesheet, preferences, schema and compiled translation catalogs.

## Localization validation

The complete Shell suite passes in English and Arabic, including real session-language selection, launcher bounds, and keyboard focus at both ends of the scrolling app list. Arabic revealed two issues that are now fixed: taller font metrics could push the launcher off screen, and horizontal viewport offsets needed to be reversed for right-to-left layouts.

Sizing checks verify 150% text, 32 px system icons, launcher bounds, exact default restoration and temporary stylesheet cleanup. Both English and Arabic Shell runs pass these checks. The test session uses its own runtime directory; the real document-portal mount remains intact.

The drag suite passes as part of all 114 Shell checks in English, German and Arabic, including insertion positions and automatic scrolling in both text directions.

All twelve unit tests pass. All 15 catalogs pass the GJS/GTK language matrix, including regional and missing-language fallback. The extension ZIP contains 15 compiled catalogs. The portability check finds no personal filesystem paths or emoji in publishable project files.

## Reproduce

```sh
npm run check
npm run test:i18n
npm run test:prefs
npm run test:shell
```

Generated logs and screenshots are written to `artifacts/` and are excluded from Git and extension bundles. The test application is registered only in the temporary test environment.

## Limits

GNOME 51 has not been validated. Physical monitor hotplug and a real lock screen have not been automated. Network connections and power settings are not changed by the tests. Warnings from unavailable services in the isolated session may appear in logs; JavaScript errors and dock cleanup failures cause the Shell test to fail.

Updates require a new login because GNOME 50 caches extension modules. The user's running session is not restarted by the tests.

All 15 translation catalogs and 61 messages per catalog are checked for completeness and format placeholders. GJS and GTK preferences checks cover every catalog, English, an unknown language, regional fallback and language preference lists. This does not replace native-speaker review or visual testing of every language and writing direction.
