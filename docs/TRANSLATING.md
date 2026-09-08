# Translations

GDX Dock uses GNOME's standard Gettext integration. English is the source language. The dock and its preferences follow the session language automatically; there is no separate language selector. Log out and back in after changing the desktop language so GNOME Shell reloads the locale and extension.

## Included languages

All 61 dock-owned interface messages currently have translations in these 15 catalogs:

| Language | Catalog |
| --- | --- |
| Arabic | `ar` |
| Chinese, Simplified | `zh_CN` |
| Chinese, Traditional | `zh_TW` |
| Dutch | `nl` |
| French | `fr` |
| German | `de` |
| Italian | `it` |
| Japanese | `ja` |
| Korean | `ko` |
| Polish | `pl` |
| Portuguese, Brazil | `pt_BR` |
| Russian | `ru` |
| Spanish | `es` |
| Turkish | `tr` |
| Ukrainian | `uk` |

English is built in and does not need a catalog. Gettext handles regional fallback, such as `de_DE` to `de`. Missing languages or messages fall back to English. These are initial translations; native-speaker review is welcome. Catalog completeness does not mean that every language in the world is translated.

Translated content includes the launcher, filters, empty states, context menus, preferences and accessibility labels. Counts use labels such as “Results: 3” so translators do not need to fit several grammatical plural forms into one sentence. Translators may reorder placeholders using `%1$s` and `%2$d`.

Installed application names, descriptions, search keywords and desktop actions use the translations shipped by those applications. Calendar, quick settings and the Extensions management app retain their native GNOME translations. The brand name **GDX Dock** and extension metadata are in English; metadata display is controlled by GNOME's extension manager.

GNOME handles widget text direction for right-to-left languages. Context-menu movement labels and keyboard-focus scrolling account for the direction of the dock's item order. The launcher reserves space based on actual translated font metrics. Translation checks do not replace visual review of every writing system.

## Add or update a language

Install GNU gettext and run commands from the repository root:

```sh
npm run translations
msginit --input=po/gdx-dock.pot --locale=YOUR_LOCALE --output-file=po/YOUR_LOCALE.po
```

Replace `YOUR_LOCALE` with the appropriate Gettext locale, translate every `msgstr`, and preserve placeholders and markup such as `&lt;Super&gt;`. Do not translate identifiers, schema keys or the project name. Do not add emoji or decorative symbols. Remove the `fuzzy` flag only after reviewing a translation.

```sh
bash scripts/translations.sh compile
npm run test:i18n
npm run pack
```

`npm run translations` extracts messages and updates existing catalogs. Packaging compiles `po/*.po` into `locale/<language>/LC_MESSAGES/gdx-dock.mo` inside the extension ZIP. Compiled local catalogs are ignored by Git; commit the `.po` sources and `.pot` template.

Translation tests need Python 3, GJS, GTK4/libadwaita, a display and at least one installed non-C UTF-8 locale. They test every catalog, regional and missing-language fallback, and preference bindings. No online translation service is used at runtime.

See the official [GNOME extension translation guide](https://gjs.guide/extensions/development/translations.html).
