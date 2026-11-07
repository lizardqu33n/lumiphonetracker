# Contacts and setup wizard - 0.17.0

## Contacts

Contacts are A-Z rows with letter headings and a small Add button. Tap a row for
a full contact page. Back restores the list's scroll position; opening a contact
from a text thread returns to that thread. Portraits are round, with a larger
portrait on the page. The existing custom/card/persona/initial fallback is unchanged.

Edit contains all available fields, portrait controls and the confirmed Delete
action. Phone and Email appear only while Messages and Email respectively are
added; hiding an app keeps those values. Empty values stay hidden on the read page.
The order is Phone, Email, Relationship type, custom details, established story fields.
Message opens the contact's thread. Drafts use an unambiguous saved phone number,
otherwise the name. Add to draft still never sends. Email opens the existing inbox;
there is no new compose, dial or send operation.

Main/NPC is a descriptive tag, not a permission or game mechanic. Existing Roles
remain free labels (occupation, affiliation, etc.). Whole-name, case-insensitive
card/persona matches establish Main; unmatched/new contacts start NPC. A first-name
match only shows a review hint. Previously confirmed classifications are retained
when access is unavailable, including other players in shared chats. A user tag
change locks it and scans never replace that choice. Card/persona reads use the
requesting user's identity. No card/persona access means new contacts default NPC.

Phone, email, relationship and custom details are entered by a user or explicitly
confirmed from the wizard. Main AI and background custom-connection tracking cannot
write them, even with an evidence quote. Up to 12 custom details: 40-character labels,
200-character values; phone 100, email 150, relationship 100 characters. Plain one-line
values only. A partially filled custom detail must be completed or removed.

Text/call matching uses exact phone values after removing simple formatting spaces,
parentheses, dots and hyphens; email addresses compare case-insensitively. It does
not guess country codes. Name matching is the fallback, including explicit user
renames. Duplicate numbers/addresses show a warning and are never guessed between.
Stored source tags/call identities are unchanged. Text read receipts keep their
original addresses, so linking a number does not make old read texts newly unread.

Story/contact metadata stays shared on the chat. Unread state, appearance, wording,
profiles and dismissed hints retain their existing personal scopes. Old names,
roles, story fields, portraits, edits and deletion history are preserved; new metadata
is additive. User tags are not AI-writable. Old user-edited fields keep their protection. If an
NPC later becomes a player persona, old private role/mood/thought edits stay in the
journal but are hidden rather than breaking the rebuild; new forbidden edits still fail.

## What changes in phone_format

The preset line remains `{{phone_format}}` once. No record/tag syntax changes.
A short rule says phone/email/relationship/custom contact details are user/wizard
confirmed only. It is protected in custom wording too. Compact NPC metadata joins
continuity (up to 3 short custom details; total metadata capped at 2,200 characters).
Main/player contacts omit that extra metadata; their existing enabled Scene
continuity remains. Removed Contacts or all Contact tracking switches off contribute
none. Phone/email continuity also follows Messages/Email app membership. The AI
still writes only changed supported story fields, never these confirmed address fields.

## Setup wizard

Use the sidebar Phone tab's Setup wizard, with field choices for Contacts, Notes
and Locations. Scene is excluded. Review input shows known source character and
request-message counts and the single model request. There is no token-count call
or money estimate. Run, preview and explicit Save remain separate.

Main AI uses the requesting user's documented default connection; Custom connection
uses the existing saved connection_id. The selected model and trusted userId are
passed explicitly to raw generation. No extra picker, key or permission is introduced.

First/full-name matches require Merge / Keep both. Setup never replaces a populated,
user-edited, cleared, deleted or locked field. Missing unedited fields may be filled.
New setup contacts are labelled Added by setup wizard and are not user-locked.
Optional fake addresses and AI replacement of user edits start off. See the
[current wizard guide](WIZARD-FIX-2.md) for their explicit exceptions, merge behavior,
source-label migration, per-field locks and Restore my version.

JSON/source quotes remain required; unknowns are omitted/null. No story rewrite,
texts, calls, email or bank entries are made by setup. Sources stay capped at 12
attached/global lorebooks and 64,000 characters; disabled entries are excluded.
No transcript or Scene state is sent. Caps, tombstones, user/chat/revision pinning,
changed-source rejection and no-retry behavior remain. A review expires after ten
minutes or a worker restart. Literal matching cannot prove correct attribution;
review the proposed additions before confirming them.

## Documented access and limits

- `characters.get(chat.character_id, userId)`: characters permission.
- `personas.getActive(userId)`: personas permission; requesting user's active persona.
- `world_books.getGlobal(userId)` and `world_books.entries.list(id,{...,userId})`:
  world_books permission. Book IDs come from documented character/persona fields or
  that user's global list, never guessed chat metadata.
- `connections.list(userId)` and `generate.raw({connection_id,model,userId,...})`: existing
  generation permission. No API keys or provider configuration are stored.

Only world_books is newly requested. It is optional for normal phone use and used
by the manual wizard. Characters/personas and generation were already requested;
if needed access is denied, setup explains that and does nothing. Images permission
is not needed for scanning names or reading setup text. The documented Chat DTO
exposes one character_id; no undocumented group-member card enumeration is attempted.
Only the requesting user's active persona is read, not another user's or a guessed
chat-bound persona setting.

Sources: [Characters](https://docs.lumiverse.chat/backend-api/characters/),
[Personas](https://docs.lumiverse.chat/backend-api/personas/),
[World books](https://docs.lumiverse.chat/backend-api/world-books/),
[Tokens](https://docs.lumiverse.chat/backend-api/tokens/),
[Generation](https://docs.lumiverse.chat/backend-api/generation/).

## Supplied icons

Seven full grid cells were copied from the supplied 1774x887 PNG, without trimming,
resizing or recoloring pixel data. PNG total: **656,860 bytes**; embedded data-URI
text: **875,978 characters** (about 855 KiB encoded). No external files/CDN.
Profiles now has its own icon; existing app and Advanced icons are unchanged.
Message, Email, Add detail and Setup use the supplied art. Call and numpad art are
bundled for later controls; no dialing/keypad behavior was requested or added.
Bounds and pixel hashes are in CONTACT-ICON-ASSETS.json.

Real model extraction/association accuracy, actual multi-user server permissions,
mobile drawer/keyboard/file behavior and native card/lorebook access still require a
real Lumiverse install. Local mock/browser results are listed in TESTING.md.
