# Step 3 verification

Checked November 3, 2026 (America/Chicago), using Bun 1.4.2, TypeScript 5.7.3,
and published lumiverse-spindle-types 0.6.77. This is code verification, not a
claim that the extension has been installed or tested against a real provider.

## Automated checks

- Typecheck against official types (with one documented handler-type adapter).
- Backend/browser builds, manifest and entry-export checks, bundle/source matching.
- 84 passing behavioral tests for the Step 2 baseline and
  Step 3 additions, listed below.
- Packaging of source, built files, tests and guides; archive contents checked
  against local files. Step 1 and Step 2 archives preserved.

Step 3 tests cover expanded JSON and malformed blocks; independent switches;
location/date/presence and present-character macro projection; bounded place
selection; player-card restrictions; inference defaults and persistent admitted
inferences; full contact-field replacement and source-quoted lock protection;
case-insensitive names; collection caps and notices; Notes priorities, resolved
plots, Misc opt-in, no AI deletion, user CRUD data and deletion records; lower
caps preserving notes; rejected old entries not refilling gaps; legacy migration
and last-good malformed fallback; incoming/outgoing authorship; recent tag
retention; multipart/media preservation; no recursive native macros from stored
text; missing macro context returning empty; read-only previews; separate chats,
restart, stale revisions, stale history, invalid settings and idempotent sync.

The actual backend module and frontend setup are also loaded with mock host
APIs. This checks registration and wiring, not native rendering or authorization.
Storage tests use substitutes rather than a live Lumiverse database. The old
Step 2 parser/store tests remain regression tests; those legacy modules are not
the active schema-2 store.

## Must be checked in a real Lumiverse install

- Installation/security scanning, startup/disable/re-enable and current host API
  compatibility, including real-function pull registration and trusted chatId.
- Actual macro resolution in a preset and dry preview, multi-user/operator scope,
  chat switching, restarts, chat-variable ownership, persistence and source timing.
- Native user-name resolution, persona changes, temporary/group/multiplayer chats,
  saved user author names and interception/hiding of user-written text tags.
- Streaming paint, incomplete/malformed tags, cold-load gating, edited/deleted
  messages, regenerated messages, alternate swipe navigation and history ordering.
- Real outgoing provider requests: default texts last 3, tracker blocks last 0,
  changed retention settings, source-ID/index flags and safe media preservation.
  The code tests verify transformations, not the final provider payload.
- Interactions with other prompt/display extensions, optional versus required
  interception, permission revocation/regrant and host timeout/fallback behavior.
- First migration from existing Step 2 user storage, especially a malformed
  current message whose last-good fallback exists only in that old file.
- Real model compliance: compact changes only, contact/Note inclusion rules,
  physical versus emotional condition, complete attire, concrete fields,
  same-reply narration updates and no fabricated texts or player thoughts.

Exact quotes and changed-value matching are conservative textual checks. They
cannot prove that a sentence is current canon rather than a lie, memory or
hypothetical. No semantic guarantee or real-model verification is claimed.
Prompt rules guide those decisions; unsupported changes keep the confirmed data.

Macros may take a history-read round trip. The host's documented pull timeout
is five seconds per macro; performance with very long chats needs live testing.
Hiding cannot be guaranteed when the extension is disabled, permissions are
missing, hooks are bypassed, or the host fallback expires. Unrecognizable tag
names cannot be reliably distinguished from intended prose.

## Not implemented in this checkpoint

Step 4 screens/edit controls/Settings/custom CSS, Step 5 conversations/badges/
reply box, and Step 6 Helper AI calls are absent. Their data/validation foundation
is present; no claim of end-user operation is made before those steps.

First-use clarity manual test for Step 4: a person who has never seen the phone
should explain what each of the seven labelled apps does within about five
seconds. Check dismissible explanations, persistent dismissal, empty states,
inline expansion and one-level navigation.

CSS manual tests must include hiding the entire phone, universal selectors,
huge sizes/z-index and invalid rules while recovery Reset remains usable.
UI tests also need exact placement of time/date/weather, Here now ordering,
Contacts/Locations CRUD, five Notes sections/counters/limits and all user markers.
Messages tests need per-conversation read clearing, totals, group support,
composer draft preservation and cancellation never filing/sending a message.

Helper AI remains untested and cannot be tested without Step 6, a real install
and a real connection. Required cases: connection listing/removal/fallback,
no paid calls in Main AI, explicit Helper selection, once per completed reply,
last 1–10 cleaned messages plus tracker only, JSON validation, locked user edits,
source-chat/revision pinning, cost note, Update now, failures with no retry loop.
No generation permission or extra AI request was used in this checkpoint.

## Revision 0.3.1

Added regression coverage for quote-free AI-populated contact changes, continued
quote protection for user edits, independent valid-line acceptance, atomic
collection lines, duplicate-key rejection, same-source invalid-field fallback,
and new-message invalid fields retaining older values. No new live Lumiverse
or provider verification has been performed. Partial acceptance can mix fields
from different turns; see STEP-3.md for the tradeoff.

## Revision 0.3.2

Tests cover diagnostic line numbers/fixed reasons, withholding story values and
unknown raw field names, repeated-read deduplication, logging again after a
correction, and PhoneStore emitting log output without creating phone notices.
Real Lumiverse server-console visibility and log retention remain untested.
