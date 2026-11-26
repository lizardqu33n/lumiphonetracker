# Lumi Phone Tracker

A floating story phone for [Lumiverse](https://docs.lumiverse.chat/) that tracks **Scene**, **Weather**, **Locations**, **Notes**, **Contacts**, and **Messages**—plus optional **Calls**, **Email**, and **Bank** apps.

Version **0.20.1**. Built files (`dist/`) are included, so you don't need to compile anything to install it.

## Quick start

1. In Lumiverse, go to **Extensions → Install** and enter `https://github.com/lizardqu33n/lumiphonetracker`.
2. Grant the requested permissions (chat access, message processing, prompt interception, and floating panels).
3. Open a chat, open the floating phone, and select **Turn on for this chat**.
   - New chats start with tracking **off**. Existing tracked chats stay on.
   - Turning tracking off keeps all saved data.
4. Add `{{phone_format}}` to your active preset (or split the macros—see **Prompt macros** below) and save.

## Prompt macros (where to put them)

The model writes hidden update tags at the end of its reply. They stay in saved messages for rebuilding but are hidden from the displayed story. Tracker blocks are removed from outgoing history by default (`Keep tracker blocks = 0`); recent text tags follow the separate retention setting, defaulting to the last 3 chat messages. Macros supply current phone information and writing instructions.

Pick whichever setup fits your preset:

### Option 1: Simplest (1 macro)
Drop this at the bottom of your preset (post-history / instructions):

```text
{{phone_format}}
```

This inserts **both** your current phone info and the AI update instructions together.

Use one setup below. Combining `{{phone_format}}` with state/rules/app macros repeats their content.

### Option 2: Clean split (2 macros)
If you want story context near the top of your preset and formatting rules at the bottom:

* Put **`{{phone_state}}`** near the top (system prompt / story context) — inserts all enabled phone info without update rules.
* Put **`{{phone_rules}}`** at the bottom (post-history / instructions) — tells the AI how to write hidden phone updates.

### Option 3: Custom placement (mix and match)
Place individual app macros wherever you want them in your preset, and put **`{{phone_rules}}`** at the bottom:

| Macro | What it inserts | Suggested spot |
| --- | --- | --- |
| `{{phone_format}}` | **All-in-one:** current phone info + AI update instructions. | Bottom of preset (alone) |
| `{{phone_state}}` | All enabled phone info without update instructions. | Top / story context |
| `{{phone_rules}}` | AI update instructions only (respects custom wording). | Bottom / post-history |
| `{{phone_scene}}` | Scene fields plus legacy contact continuity. It overlaps `phone_contacts`; use both only if you want that repetition. | Story context |
| `{{phone_contacts}}` | Full status for characters in the scene; compact summary for off-screen `Main` contacts (minor off-screen NPCs are omitted to save tokens). | Character / story context |
| `{{phone_weather}}` | Current weather, temperature, description, and active alerts. Scene carries season. | Story context |
| `{{phone_locations}}` | Current place and recently established story locations. | World / story context |
| `{{phone_notes}}` | Enabled notes and plots, including Misc notes marked Send to AI. | Story context / memory |
| `{{phone_messages}}` | Recent text messages sent in the story. | Near recent history |
| `{{phone_calls}}` | Recent phone calls established in the story. | Story context |
| `{{phone_email}}` | Recent unread emails established in the story. | Story context |
| `{{phone_bank}}` | Last stated account balances and recent transactions. | Story context |

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
