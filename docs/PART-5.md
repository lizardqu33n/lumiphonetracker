Current labels (0.15.0): Settings profiles replaces Presets; Connections > Custom
connection replaces the Helper AI choice. Internal IDs and saved data are unchanged.

# Settings profiles and prompt wording

Everything is in the sidebar's Phone tab. Settings profiles is a collapsed section.
Prompt wording is collapsed inside Advanced. The phone gains no settings screen.

## Settings presets

Choose a preset, click Apply, then confirm Apply to this chat. Applying changes
only this chat's switches and limits; story data stays, including hidden apps.
To copy a built-in preset, apply it first, then use Save current as... with a name.
Rename and Delete act only on your saved presets. Names are 1–40 characters;
up to 20 presets are saved for each user. Duplicate names are rejected.
Default and Minimal are read-only. Minimal adds Scene, Weather and Messages only;
Default uses the extension's existing defaults. Neither built-in enables optional apps.

A preset contains only app membership, every tracking field/Notes section switch,
notes per section, log lines sent to the AI, tracker-block retention and recent-text
retention. It never contains source, connection, Helper messages to read, player-writing,
missing-detail inference, appearance, CSS, hints, wording or story entries. Applying
never starts a model request. It preserves each excluded setting as it already is;
it does not turn off a Helper AI or safety setting you explicitly enabled earlier.

The optional automatic preset for new chats is not included. Changes are explicit
and limited to the open chat. Preset management works without an open chat;
Apply and Save current are disabled until a chat is open.

## Prompt wording

Choose Main AI or Custom connection. Each has its own selection, shared across **your**
chats. Default follows the current chat's enabled fields and is read-only. Click
Copy Default, name the copy and edit its text, then Save wording. Up to 10 custom
wordings **total across both AI choices** per user, each up to 4,000 characters.
Use the same name box to rename a custom wording when saving. Delete wording
removes only that wording. Reset to default restores the built-in choice, including
when an old personal revision is stale; it never changes story settings.

The template uses one literal placeholder: `[[phone_syntax]]`. This is an extension
placeholder, not a new Lumiverse macro. The extension inserts the current format
reference: enabled field names, delimiters, tag shapes, evidence suffixes and
length limits. That generated reference cannot be edited in the wording box.
Missing placeholder: syntax is appended, with a sidebar warning and a safe server
warning. Repeated placeholders insert it only once. No hidden native macros run
inside editable wording: double braces are escaped as literal text.

Simple headings scope app-specific prose: `[General]`, `[Scene]`, `[Weather]`,
`[Locations]`, `[Notes]`, `[Contacts]`, `[Messages]`, `[Calls]`, `[Email]`, `[Bank]`.
A heading applies until the next heading. Sections with every tracking switch off
are omitted too. In Helper mode, Main AI app prose is limited to Messages and Email.
General prose also includes text before
any heading. An app's section disappears when the app is removed; its generated
syntax and continuity disappear too. Put app-specific language under its heading.
General wording cannot reactivate disabled fields: the final field scope and the
existing parser/engine enforce the actual chat settings.

Continuity is added separately, not edited or copied into a wording. Helper AI's
extraction rules are locked and appended last: only stated facts, no invented details,
no texts/emails, no story rewrite, null means no update, newer facts/user edits/player
restrictions win. Both modes retain code checks for forbidden content, placeholders,
player entries, enabled fields, evidence, limits, source IDs and stale results.
Custom wording does not weaken those checks or add permissions.

Preview makes no model call. Main AI shows the exact `phone_format` text, including
this chat's continuity. Helper AI shows the exact system instructions; its separate
recent-message data remains unchanged. Both use the production renderer. Unsaved
edits can be previewed; save them to use them. Counts are JavaScript string length;
tokens are only an estimate (characters / 4, rounded up), never an exact tokenizer count.
Preview is a snapshot: later story/settings changes naturally change the next prompt.
Empty or oversized wording uses Default and logs a fixed warning without its contents.
Invalid saved selections also fall back. A failed personal read uses Default for generation.

## User and chat boundaries

`personal-settings.json` is in documented `spindle.userStorage`, with explicit trusted
transport userId on each read/write. Personal changes are serialized per user and
revision-checked. No frontend-supplied userId is trusted. Personal files do not contain
story data. App state and tracker settings remain chat-shared.

Macro pull/interceptor paths use their existing per-invocation trusted identity;
the generating user's selection is read fresh, not cached globally or chosen from
a foreground tab. If identity/chat is unavailable, existing safe empty macro behavior
continues: there is no other user's wording or guessed chat. Only Default wording
is eligible as a fallback; it cannot provide chat data without an authorized context.
Helper requests read their trusted requesting user's Helper wording after selecting
the pinned chat/revision. Late preset responses never update another chat's UI.

This uses existing documented storage and frontend messaging, not Lumiverse's own
preset API (which edits model presets). No new API, permission, tab or model request
was added for personal presets or Preview. References:
- https://docs.lumiverse.chat/backend-api/storage/#user-storage
- https://docs.lumiverse.chat/backend-api/frontend-communication/
- https://docs.lumiverse.chat/backend-api/macros/

## Verification limits

Code tests exercise separate users, shared/separate chats, allowlists, caps, read-only
built-ins, stale revisions, malformed wording, app filtering, safe logs and exact Preview
parity with actual macro/Helper paths in the operator-scoped mock. Browser tests cover
confirmation, CRUD controls, Preview, Reset, narrow layout and late chat switching.
No real Lumiverse server, second logged-in browser, provider or paid call was used.
Real models may follow custom language differently; parser checks remain the final
filter. Real server persistence/permissions, the mobile drawer and model compliance
still need live verification.
