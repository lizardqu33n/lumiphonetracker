# Lumi Phone Tracker

A floating story phone for [Lumiverse](https://docs.lumiverse.chat/) that tracks **Scene**, **Weather**, **Locations**, **Notes**, **Contacts**, and **Messages**—plus optional **Calls**, **Email**, and **Bank** apps.

Version **0.19.2**. Built files (`dist/`) are included, so you don't need to compile anything to install it.

## Quick start

1. In Lumiverse, go to **Extensions → Install** and enter `https://github.com/lizardqu33n/lumiphonetracker`.
2. Grant the requested permissions (chat access, message processing, prompt interception, and floating panels).
3. Open a chat, open the floating phone, and select **Turn on for this chat**.
   - New chats start with tracking **off**. Existing tracked chats stay on.
   - Turning tracking off keeps all saved data.
4. Add this single line to your active preset and save:

```text
{{phone_format}}
```

## How it works

* **No background AI calls:** Your main story model writes compact hidden tags, and the extension updates the phone from saved messages. There is no background Helper AI.
* **Optional Setup Wizard:** Saved Lumiverse connections are only used when you explicitly open **Setup wizard** in the sidebar and click **Run setup**.
* **Shared vs. personal data:**
  * **Shared on the chat:** Story data, app toggles, and tracker settings.
  * **Personal to you:** Unread/read state, arrival notices, custom CSS appearance, settings profiles, prompt wording, and dismissed hints.
* **Protected edits:** Your manual edits stay protected from AI overwrites unless you explicitly opt in under **Advanced** (and individual fields can still be locked).

## Sidebar controls

Open the **Phone** tab in the Lumiverse sidebar to manage:

* **Toolbar (always protected):** Open phone, **Refresh tracker** (rebuilds from saved messages with no model call), and **Reset appearance** (clears custom CSS even if broken styles hide the phone).
* **App Store & What to track:** Add/remove apps and toggle individual tracked fields.
* **Setup wizard:** Pick a saved connection, choose fields to scan, preview results, and confirm before saving.
* **Appearance:** Upload custom `styles.css` or `sidebar.css` (up to 256 KB each).
* **Settings profiles & Advanced:** Save reusable personal presets, adjust retention limits, and customize tracker prompt wording.

## Documentation

* [Install & usage guide](INSTALL.md)
* [Hidden tag format](docs/BLOCK-FORMAT.md)
* [Saved-message workflow & performance limits](docs/SIMPLE-WORKFLOW.md)
* [Prompt interceptor timeout safeguards](docs/INTERCEPTOR-TIMEOUT.md)
* [Architecture overview](docs/ARCHITECTURE.md)
* [Custom CSS & styling reference](STYLING.md)
* [Changelog](CHANGELOG.md)
* [Testing & verification log](TESTING.md)
* [Third-party asset notices](THIRD-PARTY-NOTICES.md)

## Development

Requires [Bun](https://bun.sh) and the pinned dev dependencies:

```sh
npm ci --ignore-scripts
bun run typecheck
bun test
bun run build
bun run check:dist
bun run check
bun run package
```

Focused browser UI checks run against Microsoft Edge on Windows with a mock host:

```sh
bun scripts/test-ui.ts --screenshots-only
```
