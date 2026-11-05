# Current Part 4 override

Calls, Email and Bank are now built-in optional apps, initially not added.
All story data/settings are shared on the authorized chat. Personal read state,
notices, CSS and dismissed hints remain per user. The nine supplied PNG icons
replace the displayed app art. See [PART-4.md](PART-4.md); older checkpoints below
are historical where they differ.

# Current Part 3 override

Settings and the built-in App Store are in the existing Phone sidebar. Home
shows only added story apps, each labelled; no fixed seven icons and no Settings
screen. Data, hints, scope and migration rules are in [PART-3.md](PART-3.md).
Historical build checkpoints below remain for reference.

# Accepted additions — pending Steps 3–6

Step 2 remains the delivered checkpoint. These requirements extend the plan;
they are not a claim that later features already work. Pause after each step.

## Final A–F additions: authoritative

[FINAL-ADDITIONS.md](FINAL-ADDITIONS.md) preserves the user's final specification
in full. It replaces earlier Changes 10–14 and overrides any conflicting design
choice below. Earlier user-edit, player-text, isolation, styling and cost rules
remain accepted wherever not superseded. No runtime source or bundles change
in this plan update.

Implementation order: Step 3 includes expanded data/block/JSON models,
persistence protections, settings data and macros. Step 4 includes all seven
screens. Step 5 implements Messages conversations/replies/badges; Step 6 adds
Helper AI requests. Continue pausing after every step. Step 4's Messages icon
must not claim that Step 5 functionality already works.

- Current Home: only added labelled story apps, with no Settings app. One-level navigation, inline expansion, persistent
  dismissible app descriptions, meaningful empty states and no fake data.
  Use plain language; call Sidecar **Helper AI** in the UI. No unplanned extras.
- Scene: exact location plus known wider places, time, date, Here now names.
  Independent switches for location/time/date/presence. No separate Scene-details
  field or character cards. Time/date only in Scene; weather only in Weather.
- Contacts: established named characters only, present first and absent in a
  collapsed group; last known values persist. Full user CRUD and 30-contact
  limit, rejecting new AI additions with a notice rather than deleting anyone.
  Roles, physical status, mood, precise position, complete attire/Removed,
  and NPC-only inner thoughts have independent switches; thoughts default OFF.
  Player card is marked You and has only physical status, position and attire.
  Preserve the exact field and canon rules in the final specification.
- **Let the AI fill in missing details** defaults OFF. Contacts inference when
  ON produces one concrete value, marked inferred; filled fields stay locked
  until narration changes them. Full Position/Attire replacements; user edits
  confirmed. This exception does not permit invented places, notes or texts.
- `phone_scene` is the single compact source of location/time/date and PRESENT
  characters with enabled fields. No Contacts macro. `phone_format` requires
  narration to remain consistent and record narrated changes in the same reply.
- Locations: up to 30 established meaningful places, short grounded descriptions
  and optional relationships, conservative duplicate merging, user CRUD.
  Current comes from Scene, not another writable flag. `phone_locations` returns
  current plus at most three other recently relevant places.
- Notes replaces the earlier flat list: People to remember, Key items, Rules,
  Pending plots, Misc. Follow all exact inclusion/card rules in the final text.
  AI emits new/changed entries only, matching names case-insensitively; never
  deletes or writes Misc. Updates show Updated, resolved plots move to Resolved.
  User CRUD works in every section, with added/edited markers and one-tap delete
  confirmation, no trash/undo. Never silently delete or hide existing notes.
- Notes per section: Advanced, default 10, min 3, max 30; resolved plots excluded.
  At capacity reject only new AI entries with a dismissible notice; allow updates.
  `phone_format` gives a short full-section line only when needed. `phone_notes`
  selects Rules, open Pending plots, recent People/Items, and only user-approved
  Send to AI Misc. Advanced log-line cap defaults to 20; phone shows the full log.
- Switches cover each Scene field, each Contacts field, Locations, each Notes
  section, Weather and Messages. Off means hidden, no macro output and no writing
  instruction, in Main AI and Helper AI. Both use only changed fields, with null
  meaning unstated/no update. Preserve user-edit protections and exact canon rules.
- Advanced **Keep tracker blocks in the last [N] messages** defaults to 0 and
  accepts nonnegative whole numbers. Only outgoing history changes; saved source
  stays intact. This supersedes unconditional stripping while keeping it as the
  default. It is separate from editable text retention (default 3) and Helper AI
  Messages to read (default 3, range 1–10). Retaining raw blocks is an explicit
  Advanced opt-in; normal macros still omit switched-off fields.

These schemas, limits, macros and UI names belong to this extension; they do
not imply any new Lumiverse API. Step 3 must validate schema evolution and
preserve older saved data rather than silently dropping it.

## Step 3: macros, authorship, and recent texts

- `phone_format` supplies short enabled continuity and enabled-item writing
  instructions. Resolve every macro for the requesting user/chat. Individual
  Scene fields have independent switches; disabled items return nothing.
- **Recent messages to keep texts from:** number input, default **3**, accepting
  positive whole numbers. Count chronological chat messages, not individual
  texts. This is separate from Sidecar's bounded 1–10 **Messages to read** input.
- Strip tracker blocks by default; the final Advanced setting can keep the last
  N (default 0). Keep valid text tags in
  the most recent N history messages, including user texts; strip older text
  tags. This supersedes Step 2's current strip-all-text-tags behavior.
- **Let the AI write texts for my character** defaults OFF. The format macro
  prohibits it, and capture independently rejects AI-authored player texts.
  ON allows actual story texts with the player's name in `from`. Identify the
  player using trusted persona/user context and message role, never sender
  strings alone. Do not guess identity in ambiguous group chats.

## Step 4: edits and styling

- Tap any Scene/Weather field to correct it; add/edit/delete short Notes. AI
  may add Notes. User edits are confirmed facts, persisted separately from AI
  patches with user/chat identity and source position/revision.
- Replays, restarts and late sidecar responses must not overwrite corrections.
  A conflicting automated value requires a clearly established later story
  change. If evidence is unclear, retain the correction. A schema validator
  cannot prove semantic truth; report and test the actual enforcement used.
- Retain user Notes and deletion records separately so stale AI lists cannot
  replace edits or resurrect deleted Notes.
- Keep Settings grouped and simple, with the essential new controls and a
  collapsed **Advanced: custom CSS** editor, live application, and Reset.
- One readable `src/styles.css`, `--lpt-` variables on a single `.lpt-root`,
  stable documented `lpt-` classes for every UI part, and no inline styling.
  Replace the temporary Step 2 tab's inline padding in this step.
- Defaults inherit documented Lumiverse colors and host fonts where available.
  Use explicit CSS defaults for dimensions/spacing where no host token is
  documented; never invent Lumiverse theme-variable names.
- Keep launcher/frame structure separate from app content so CSS alone can
  give it a desktop-window shape.
- Save custom CSS per user. Constrain/isolate it to the phone. Recovery controls
  must remain outside the custom-styled surface. Test whole-phone hiding,
  universal selectors, huge dimensions/z-index, overlays and invalid rules.
- `ctx.dom.addStyle` inserts styles into the host document; it does not promise
  automatic scoping or a Reset button immune to arbitrary CSS. Do not inject
  unrestricted host CSS and claim that guarantee. The documented sandbox-frame
  option provides an isolated document if needed; verify theme transfer,
  resizing, keyboard and mobile behavior before choosing the final approach.
- Complete `STYLING.md` against the shipped stylesheet/markup: every variable
  and class, one-line descriptions, plus accent/size/desktop examples. Until
  then, clearly label it as a planned guide rather than shipped functionality.

## Step 5: real incoming and outgoing Messages

- Unread badges on Messages and each conversation. Opening one conversation
  clears only its unread state; outgoing texts never add unread counts.
- Support group chats; Scene lists everyone established as present. Group
  texts by character/sender without assuming one NPC. No demo messages.
- Each conversation has a reply box. **Add to draft** appends an escaped text
  tag to the existing composer draft and focuses it. It does not call `send`,
  append a chat row, or erase an existing draft. Check mounted state and exact
  chat ID before writing, including after any asynchronous operation.
- Only file the outgoing text after the user sends the resulting tagged row.
  Editing or cancelling a draft is not sending. User-typed tags also count;
  AI-authored player texts require the explicit ON setting. Never fabricate.
- Accept user-message TEXT tags; continue rejecting user-authored TRACKER
  blocks as automatic state updates. Hide tags in both message roles.
- The extension-owned text format may add optional `to` for outgoing replies
  so the recipient conversation survives rebuilding. Update parser/format docs
  at that step; do not guess the recipient from the conversation open later.

## Step 6: Sidecar

Keep Main AI default, add generation permission only here, and use a separate
existing-connection picker, saving only connection_id. No API keys. Missing
connection: **Connection not found**, fall back to Main AI. Show a cost note.
Run once per completed reply only after Sidecar selection, plus Update now.
Read 3 recent messages by default, bounded 1–10, plus compact saved tracker.
Strip ALL tracker/text tags from sidecar input; main-prompt text retention does
not apply to extraction. Validate changed-field JSON and null-as-no-update.
Never create texts or rewrite story. Respect confirmed user edits and newer
facts; pin user/chat/revision through completion. Failure retains data, shows
a small notice, and never loops retries. Council's internal Sidecar setting
has no documented extension API; retain the separate connection choice.

## Verified APIs and limits

- [Composer](https://docs.lumiverse.chat/frontend-api/composer/): `getState`,
  `insertText`, `setText`, `focus`, `onChange` are free. `insertText` supports
  `{ at: 'end' }`; `send` is a separate generation-gated action and is not used.
  Feature-detect `ctx.composer` and `composer-v1`. If absent, offer the escaped
  tag for manual copy/paste rather than manipulating private textarea DOM.
- [Tags](https://docs.lumiverse.chat/frontend-api/message-tags/): the docs
  explicitly support LLM- or user-written tags and include `isUser` in payloads.
  `removeFromMessage` controls hiding. Step 2 currently ignores user capture;
  supporting outgoing user texts is a later deliberate change.
- [Styles](https://docs.lumiverse.chat/frontend-api/dom-helper/): `addStyle(css)`
  returns a removal function. Isolated sandbox frames are documented too.
  Arbitrary host-level CSS with guaranteed visible Reset is not documented.

## Step 3 clarification: quote checks and partial lines

The user's newer clarification limits mandatory evidence quotes to user-edited
fields. Ordinary AI-populated fields still change only when the story changes,
but no quote is required in their data. Independently valid top-level lines
are accepted; malformed lines alone are dropped. Arrays/objects remain atomic,
structurally broken blocks are ignored, and manual-edit protections remain.
This overrides earlier implementation notes requiring quotes for every filled
Contact field or rejecting a whole validly delimited block for one bad line.
