# Lumi Phone Tracker

A small story phone with Scene, Weather, Locations, Notes, Contacts and Messages, plus optional Calls, Email and Bank.

**Version 0.19.0.** Source, manifest, built files, tests and guides are included.

The main story model writes compact hidden tags. The extension reads saved messages, updates the phone and supplies short continuity through macros. There is no background Helper AI. Saved connections are used only when you explicitly run the setup wizard.

New chats start off. Open the phone and choose **Turn on for this chat**. Existing tracked chats stay on. Turning it off keeps saved data. Settings and story data are shared on the chat; unread state, appearance, profiles and wording remain personal.

Your preset needs only:

```text
{{phone_format}}
```

Use the sidebar's **Phone** tab for App Store, What to track, Setup wizard, Appearance, Settings profiles and Advanced. Refresh tracker re-reads saved messages without a model request. Setup wizard has its own saved-connection picker, input review, preview and Save confirmation.

- [Install and use](INSTALL.md)
- [Current workflow and limits](docs/SIMPLE-WORKFLOW.md)
- [Hidden format](docs/BLOCK-FORMAT.md)
- [Styling reference](STYLING.md)
- [Verification](TESTING.md)
- [Changelog](CHANGELOG.md)
- [Asset notices](THIRD-PARTY-NOTICES.md)

To rebuild, use Bun and install the pinned development dependencies:

```sh
npm ci --ignore-scripts
bun run typecheck
bun run test
bun run build
bun run check:dist
bun run check
bun scripts/test-ui.ts --screenshots-only
bun run package
```

The focused browser checks use Microsoft Edge on Windows and a mock host. Earlier full browser-suite assertions include retired Helper UI and old theme assumptions; they are not claimed as a passing suite. No real-server memory diagnosis is implied by these tests.
