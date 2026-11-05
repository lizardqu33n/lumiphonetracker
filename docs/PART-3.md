# Part 3: sidebar settings and built-in App Store (0.9.0)

Settings moved out of the phone. The existing sidebar Phone tab has Open phone,
Refresh tracker and Reset appearance at the top, each with a short result.
Below them it names the selected chat, or asks you to open one. No new tab,
phone settings screen or extra tracker setting was added.

## Sections

Only App Store is open by default. All headings show their scope even while
collapsed: App Store (This chat), What to track (This chat), Tracker source
(This chat), Appearance (All my chats) and Advanced (This chat).

App Store lists the six current built-in apps with a bundled icon, name, short
description and Add/Remove button. Added apps say On phone. Nothing is downloaded.
Calls, Email and Bank are not built yet and have no pretend Add buttons here;
they wait for their later step.

What to track retains each field switch, grouped by app. Tracker source retains
Main AI/Helper AI, the saved-connection picker, 1-10 recent messages and cost note.
Appearance moves the existing live CSS editor. Advanced retains notes per section,
log lines, tracker/text tag retention and the two optional AI behaviors. Existing
bounds and defaults are unchanged. Refresh is available in both modes; Main AI
makes no model request. It stays disabled while known streaming/update work runs.

## Membership and data

New chats add all six core apps. Old settings had field switches, not a separate
app membership flag. Migration treats any enabled field in an app as added;
all fields off means removed. It adds only a separate membership map to the
existing settings. It does not rewrite messages, clear field switches, edits,
accepted records, Helper journals or read receipts.

Removing an app hides its Home icon and masks its fields in phone_format,
continuity macros, Helper instructions/results and relevant recent text retention.
It does not alter stored tracker data. Adding it restores visibility and its old
field choices. If its old field switches were all off, they remain off until the
user changes them. When all apps are removed, phone_format is empty and Helper
makes no extraction request.

The existing phone_scene macro combines Scene with present Contacts details.
That name/registration is preserved. Removing Scene removes Scene lines while
leaving enabled Contacts continuity; removing Contacts removes character details
while leaving Scene lines. Neither app silently disables the other.

Home shows only added apps with labels. There is no fixed seven-icon count,
Settings icon or App Store icon. We used the later HOME SCREEN wording from the
request, avoiding two competing hints/empty states:

- Hint: Change what the phone tracks in the sidebar's Phone tab.
- Empty: No apps added. Add apps from the sidebar's Phone tab.

Hint dismissal remains per user across chats, like existing app-description
dismissals. Story screens, edits, replies, dismissible descriptions, opaque
surfaces and the launcher stay in the phone. Removed Messages also suppresses
its notifications, unread display and Contact Open texts shortcut; its data stays.

## Scope and trusted identity

| Data | Existing scope retained |
| --- | --- |
| Tracker values, field switches, membership, source/connection, limits and optional AI switches | Authorized chat. |
| CSS and dismissed explanations/Home hint | User account, across chats. |
| Message read receipts | User and chat. |

Scope detail: tracker settings are stored in chat variables, not a second
per-participant profile inside one shared chat. This was the existing storage
scope; it was not changed silently. Separately owned users/chats remain isolated
by trusted userId and authorization. Truly shared-chat participant preferences
would require a separately agreed storage design.

Frontend requests still use the host-supplied userId in the backend, never an ID
claimed by the payload. The new chat-name read uses documented
chats.get(chatId, userId). Storage, connection, player macro, generation and receipt
calls retain the explicit identity and chat-authorization rules audited in Part 2.
Chat-only history/variable signatures still have no invented extra user argument.

Each sidebar control captures its chat-selection epoch. Old mounted/native
callbacks are ignored after switching. A save already sent keeps its original
chatId, revision and trusted backend user; a late result cannot populate the new
chat's sidebar. No-chat mode clears old settings. Appearance intentionally remains
available without a chat and preserves its per-user scope. Live CSS and Reset stay
outside each other's styling area; late appearance loads cannot undo typing/reset.

## Documented host UI

The local Lumiverse developer-docs shared-component catalog and installed official
types 0.6.77 document ctx.components.mountSwitch with checked, disabled, ariaLabel
and onChange, plus destroyable handles. Those are used and disposed on rerender.
An older host without that function gets a native checkbox. No general shared
mountButton is documented in that catalog/types; small native buttons use
src/sidebar.css and host theme variables. The hosted shared-components URL timed
out during this review; the local developer-docs copy was read instead.

The sidebar is outside the phone Shadow DOM and its protected clipping area.
Phone custom CSS cannot target the editor, settings or recovery controls. No
private host selector or React dependency is used. UI strings and chat names use
textContent; there is no AI HTML injection.

The docs DO allow opening the registered sidebar tab programmatically through
its handle's tab.activate(). This is reported as the requested idea only: no
phone button, link handler or new navigation action was added to do that.

Sources: [shared components](https://docs.lumiverse.chat/frontend-api/shared-components/),
[UI placement](https://docs.lumiverse.chat/frontend-api/ui-placement/),
[chats](https://docs.lumiverse.chat/backend-api/chats/), the local
Lumiverse/developer-docs/docs/frontend-api/shared-components.md and the installed
types package. Existing macro compatibility limits are unchanged.

## Verification and remaining limits

See TESTING.md for final counts. Code tests cover migration, invalid membership,
data/edit preservation, independent macro filtering, zero Helper calls with all
apps removed, per-user hints and authorized per-chat saves. Browser tests cover
all sidebar scopes/default expansion, Add/Remove/empty Home, persisted hint,
chat names/switches/no-chat, late saves and detached controls, sticky narrow
recovery, hostile CSS and failed phone placement. Earlier story, streaming,
drafting, launcher and opacity regressions remain.

Narrow testing uses the real frontend code in a mock drawer, not a live mobile
Lumiverse drawer. Native shared React switch rendering, host drawer attachment,
actual mobile keyboard/scrolling, UI scaling, host permission updates, concurrent
processes/tabs, real second-user sessions, Helper providers and final outgoing
prompt stripping still need a real install. The changes do not claim those live
checks. Stop after Part 3 for review.
