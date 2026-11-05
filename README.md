# Lumi Phone Tracker

A small phone for keeping track of story facts. Each chat has its own Scene, Weather, Locations, Notes, Contacts and Messages, plus optional Calls, Email and Bank. The existing Phone sidebar tab controls apps, tracking and appearance.

**Version 0.11.0: all six build steps are delivered.** Source, manifest, built frontend/backend, tests and guides are included. The new Helper AI has been tested with mocks, not a real paid connection.

Version 0.11.0 adds compact Scene/Contacts, real text threads, a docked Add to draft composer and safe portraits. Card/persona avatar permissions are optional; initials work without them. See [portraits and threads](docs/PORTRAITS-THREADS.md).

Version 0.10.2 limits Messages to the player's own phone. NPC-to-NPC text tags are rejected during rebuild; outgoing player replies keep working.

Version 0.10.1 adds the supplied pastel default phone/sidebar theme, source-aware calls and editable repeat counts. Existing custom CSS still overrides the default; use Reset appearance to see the new default alone.

Version 0.10.0 adds optional Calls, Email and Bank in the sidebar App Store. All three start removed. Story data and tracker settings are shared on the chat; read state, appearance and dismissals stay per user. No owner-only data/settings restriction is added. See [Part 4](docs/PART-4.md).

Part 1 adds compact shorthand with old saved JSON support. Part 2 adds Refresh tracker in both modes, category-only Helper failure warnings and safer small-model parsing. Main refresh makes no model request. See [block format](docs/BLOCK-FORMAT.md), [token report](docs/TOKEN-REPORT.md) and [user-docs review](docs/USER-DOCS-REVIEW.md).

## Start here

Follow [INSTALL.md](INSTALL.md). Put this exact line in your active preset:

```text
{{phone_format}}
```

The macro supplies enabled continuity and the right writing instructions for the selected mode. No preset rewrite or regex script is needed. Older manual tracker instructions should be removed to avoid competing formats.

## How it works

Main AI is the default and uses the normal story reply. It appends a compact hidden block for changed facts. The extension hides tags from displayed story text, keeps the original saved message intact, and rebuilds chat-specific information. Macros provide short continuity; old tags are trimmed from outgoing history according to Advanced settings.

Optional Helper AI uses one of your saved connections. It reads only the last 1-10 cleaned story messages (default 3) plus compact tracker data, and returns validated shorthand changes. It never creates texts or rewrites the story. Requests may cost money depending on the chosen model. No extra model request is made in Main AI mode. No API keys are entered or stored by this extension.

Texts actually sent in the story appear in Messages, grouped by sender. Read badges are per user/chat. Add to draft appends an escaped reply to your normal input without sending or replacing existing prose; it is filed only after the saved user message is sent. AI player texts are OFF by default.

Tap Scene/Weather fields to correct them. Contacts, Locations and all five Notes sections support adding, editing and deleting. User edits are confirmed and protected by newer-story quote checks. The player card excludes private mood/thoughts/roles.

The phone has solid theme-based backgrounds and embedded user-provided PNG icons for added apps. [STYLING.md](STYLING.md) documents all CSS variables/classes. Custom CSS stays in the phone's Shadow DOM. The single protected Reset appearance button stays with Open phone and Refresh tracker at the top of the sidebar and works independently of floating placement.

## Files and limits

- [Install guide](INSTALL.md), [changelog](CHANGELOG.md), [testing](TESTING.md).
- [Hidden data format](docs/BLOCK-FORMAT.md), [exact preset line](docs/PRESET-SNIPPET.txt).
- [Helper AI details and Council distinction](docs/STEP-6.md).
- [Accepted requirements](docs/REQUIREMENTS.md), [final additions](docs/FINAL-ADDITIONS.md).
- [Icon attribution and license](THIRD-PARTY-NOTICES.md).

Permissions: chats, chat_mutation, interceptor, ui_panels and now generation for Helper AI. No external extension server or runtime package dependency. Native installation, real composer/stream events, provider prompt stripping and real Helper AI requests still need testing in Lumiverse. Install from [lizardqu33n/lumiphonetracker](https://github.com/lizardqu33n/lumiphonetracker).

## Development

Built files are already included. To rebuild with Bun and npm:

```sh
npm ci --ignore-scripts
bun run typecheck
bun run test
bun run build
bun run check
bun run check:dist
bun run test:ui
bun run package
```

The browser test uses installed Microsoft Edge on Windows; change its executable path in scripts/test-ui.ts for another machine. Model responses, saved connections and user Send are mocked in tests. Test fixtures never enter production bundles. Earlier checkpoint archives are preserved.
