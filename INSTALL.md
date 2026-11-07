# Install Lumi Phone Tracker

Version 0.17.1 includes the built files. You do not need to build or upload anything yourself.

## Install or update

1. Open Lumiverse > Extensions > Install.
2. Paste this repository address: https://github.com/lizardqu33n/lumiphonetracker . For an existing install from this repository, use its update option to get version 0.17.1. Enable the extension.
3. Allow chat access, message processing, prompt interception and floating panels (chats, chat_mutation, interceptor, ui_panels, macro_interceptor). The existing generation permission enables optional Custom connection: completed-reply tracking and calls through the connection you select. Main AI makes no extra model requests. If generation permission is declined, Main AI still works.
4. Open a chat. Tap the floating phone, or use Open phone in the Phone sidebar tab.
5. Add this exact single line to your active preset and save it:

```text
{{phone_format}}
```

Remove older manual tracker-writing instructions or duplicate phone macros if you pasted them. No preset rewrite is required. The format macro changes its instructions with the settings, so this line works in both modes.

Version 0.13.0 retains the fix for preset entries that bypass the macro interceptor. Keep using just {{phone_format}}. The pull handler reads the identity supplied inside that preset evaluation's host environment. This patch needs no additional permission. The existing macro_interceptor permission still supports other evaluation paths. If the host truly supplies no user or chat, the macro stays empty, logs the reason and lets generation continue.


Part 1 now requests compact shorthand from Main AI and Custom connection. Old saved JSON blocks still rebuild; do not rewrite old messages. No new permission or preset edit is needed. New AI contacts need confirmed Present names; with Present off, new names without saved presence are not admitted. Part 2 adds Refresh tracker in both modes and named Helper failure reasons. No additional permission is required.

## Settings moved to the sidebar

The phone no longer has a Settings app. Open the existing **Phone** tab in the
sidebar. Open phone, Refresh tracker and Reset appearance stay at the top.
The line below names the chat you are changing. Without an open chat, tracker
settings are unavailable; appearance and Reset still work.

Only **App Store** starts expanded. Its nine built-in apps need no download.
Remove hides an app and stops its AI instructions and summaries, while keeping
its saved data and field switches. Add restores it. New chats start with all six
core apps. Existing chats use their old switches: any field on means added;
all fields off means removed. Calls, Email and Bank start removed in every new or existing chat. Use Add to put them on the phone.

Expand **What to track** for field switches, **Tracker source** for Main AI or
Custom connection, **Appearance** for live phone CSS, or **Advanced** for limits, history
retention and the two optional AI behaviors. Sections say **This chat** or
**All my chats**. Tracker settings retain their existing chat scope; appearance
and dismissed hints follow your user account. Everyone authorized in a shared chat sees the same story entries and can change
tracker settings. Unread state, appearance and dismissed hints stay personal.

## Calls, Email and Bank

Add these optional apps in **Phone > App Store**. Their switches are under
**What to track**: Calls, Email, and separate Bank Balance/Transactions switches.
Remove hides an app and stops its instructions/summaries without deleting data.

- Calls records incoming, outgoing and missed calls, newest recorded first. It
  cannot dial. Opening Calls clears your missed-call badge.
- Email records actual sent story emails. Open a row to read and clear your
  unread label. It cannot send or reply; Add/Edit only correct stored records.
- Bank shows stated balances and a recent transactions list. It never calculates,
  converts currency or updates a balance from transactions. A later transaction
  without a stated balance leaves the old amount labelled Last stated.

The shared switch is now **Let the AI write texts, calls and emails for my
character**, still off by default. Your own outgoing email is accepted from a
sent user tag whose from matches that message's author. Outgoing call evidence
is conservative: use your own call record, or a simple whole player statement
such as I call Ada. followed by the model's exact-quote suffix. Complex freeform
player actions are safely ignored rather than guessed. The record editor cannot
create a new player outgoing entry while this switch is off. It can correct an
already established outgoing record. There is no email compose/send feature.

Caps are 30 calls, 30 emails, 3 accounts and 20 transactions per chat. A full app
keeps old data, rejects new AI entries and shows the familiar dismissible full
notice. Delete an entry yourself to make room. Exact repeated log records are
not added twice. The supplied nine PNGs are embedded; there are no icon downloads.

The preset still needs only **{{phone_format}}**. Main AI writes email/text tags
in both modes. Custom connection may extract calls and bank figures but never emails or
texts. No new permission or service/account connection is needed for these apps.

## Main AI or Custom connection

Main AI is the default in a new chat. It adds hidden data to its normal reply, with no separate model request.

**Refresh tracker** is always at the top of the sidebar's Phone tab, in both modes. In Main AI mode it rebuilds this chat from saved messages, with no model call or extra cost. It shows Refreshed when done; it cannot recover facts the story never saved.

To use the helper in this chat, open the sidebar's Phone tab and expand Tracker source:

1. Open Connections and choose Custom connection.
2. Choose one of your existing saved connections. The picker shows its name and model. Make or change connections in Lumiverse's normal connection settings; this extension never asks for an API key.
3. Leave Messages to read at 3, or enter a number from 1 to 10.
4. A completed reply updates the tracker once. Refresh tracker requests one Helper update yourself. It is disabled while a reply or update is running.

**Requests may cost money depending on the model chosen.** Choosing a connection does not immediately make a model request. Only completed replies while Custom connection is selected, or Refresh tracker while Custom connection is selected, do that. Switching back to Main AI prevents new requests and tries to cancel an older one; a request already started may still be charged.

Only the chosen recent messages, with all phone tags removed, plus compact tracker data are sent. The helper never creates texts. If a connection disappears, Connection not found appears and Main AI becomes the saved fallback. Tracker update failed names the reason and keeps the old data. Reasons are permission missing, no connection, provider error, timeout, empty reply, invalid output, or validation rejected. There is no automatic retry loop. You can try Refresh tracker later yourself.

Custom connection uses this separate picker. Lumiverse's Council Sidecar setting is read-only in the extension docs; no documented call lets this extension run that built-in service.

## Using the phone

Tap Scene or Weather to correct a field. Expand Contacts, Locations or Notes to edit/delete; + Add creates your own entries. User edits are marked. Each chat has separate data and tracker settings.

Messages contains actual sent texts, grouped by sender. Opening a conversation clears its unread badge. Write a reply and choose Add to draft, then review and send it from the normal chat input yourself. Cancelling a draft never files it. On older hosts without composer drafting, copy the offered tag into the normal input instead. The extension never presses Send.

Appearance and dismissed explanations follow your user account. [STYLING.md](STYLING.md) has copy-paste CSS examples. If the phone is missing or CSS hides it, use the single Reset appearance button at the top of the Phone sidebar. It clears appearance and reopens the phone in the same session without deleting story data. Its confirmation stays in the sidebar.

## What still needs checking

The documented installation route uses GitHub; the archive is a handoff copy, not a claimed local-installer feature. Actual installation, native stream/composer behavior, provider prompt stripping and Custom connection with a real connection were not tested here. See [TESTING.md](TESTING.md). Disable or uninstall through Extensions.

The supplied pastel phone and sidebar styles are now built in. They do not use the custom CSS character limit. Saved custom CSS still takes priority; **Reset appearance** shows the new defaults and keeps all story data.

Messages is the player's phone. Incoming tags with no recipient are treated as
sent to the player; named recipients must match a confirmed player name. Texts
between other characters belong in narration without tags. The player's own
sent reply tags still work, and the AI can write actual outgoing player texts
only with the existing player-writing switch on.

After updating, use **Phone sidebar > Refresh tracker** to remove old
NPC-to-NPC texts from Messages. Saved story messages are kept. Incorrect tags
stay hidden in the story too; the server logs a short warning without text or
names. No new permission, preset line or setting is needed.

Messages now opens a list of conversations. Tap a row to read its thread. Back
returns to the list. **Add to draft** still puts your reply into the main chat
input for you to review; it does not send. Incoming texts belong only to your
phone. An explicitly named group can use group="Established group name" in its
text tags; the extension never guesses group membership. Keep your preset line
as {{phone_format}}.

In Contacts, open a row, choose **Edit contact**, then **Change portrait** or
**Remove**, then **Save**. Choose a still PNG, JPEG or WebP under 5 MB. The extension makes a
small 128 x 128 square and removes the original metadata. Custom portraits are
shared with everyone who can use that chat. The total limit is 512 KB of encoded
portrait data per chat, with a maximum of 20 KB per portrait. Nothing is uploaded
to an external service, and portraits never go to the AI.

Card/persona avatars are optional. The operator may grant **characters** plus
**images** for the main character card, and **personas** plus **images** for each
requesting user's own active persona. These permissions are declared in the
manifest because Lumiverse gates the APIs; there is no documented separate
optional_permissions field. The extension checks each grant at runtime and works
without them, using colored initials or your custom portraits. It only reads
these APIs. It never switches personas, edits cards or uploads host assets.

Use Refresh tracker or switch away and back to reload avatar sources after
permission changes. Unknown NPCs and ordinary group members without a documented
card lookup use custom portraits or initials. See docs/PORTRAITS-THREADS.md for
the documented API limits. The top strip and sidebar rework are the next step.

The phone now shows established story time/date at the top. Edit them in Scene;
the same Time and Date switches control the strip. Empty values stay hidden.
Home no longer repeats the extension title. This does not change your preset.

The Phone sidebar starts with Open, Refresh and Reset image buttons. Hover or
use the keyboard for their tooltips; narrow sidebars also show short text labels.
Results appear just below and clear after five seconds. Reset stays outside
phone CSS and works even if the phone cannot appear. Main AI Refresh is free;
Custom connection requests may cost money depending on the chosen model.

Only one settings section opens at a time. App Store uses a compact grid with
Add/Remove; removing still keeps all data. What to track shows checked chips
only for added apps. Custom connection keeps the existing source and connection choices.
Appearance has collapsed CSS file uploads inside it. Advanced keeps
the same numbers in two columns and the visible hints under both safety switches.
Chat settings stay on the chat; appearance stays personal across your chats.
No permission or setting was added in this update. Narrow/short drawers may
still need scrolling, but the toolbar stays reachable.

In a Messages thread, choose **Choose emoji**, then click an emoji or use arrows
and Enter/Space. Escape closes just the picker. The choice inserts :name: where
you left the cursor, replacing selected text. **Add to draft** still only fills
the main chat input for you to review; it never sends. Known codes display as
pictures in the phone; unknown ones stay text. Editors/drafts keep literal codes.
Keep the same preset line. No macro, permission or model connection changes.

## Settings profiles and prompt wording (0.14.0)

In the sidebar's Phone tab, open **Settings profiles**. Choose Default, Minimal or a saved
profile, click Apply, then confirm. This changes only the current chat's switches
and limits; hidden apps keep their story data. Save current as... stores your own
named setup (up to 20). Settings profiles never turn on paid requests or player writing.

Under **Advanced > Prompt wording**, choose Main AI or Custom connection. Copy Default,
name it and edit the copy; Save wording makes it your choice for that AI across your
chats. Keep `[[phone_syntax]]` where the generated format should go. If missing, it
is appended automatically with a warning. Keep app-specific prose under its app
heading. Up to 10 custom wordings total, 4,000 characters each. Preview is free and
shows exact current instructions, character count and an estimated token count.
Reset to default restores the built-in wording. These choices are personal to you;
chat tracking switches stay shared. No new permission or connection is needed.

The line in your Lumiverse preset is unchanged: `{{phone_format}}` once.
See [the short guide](docs/PART-5.md) for the saved/excluded fields and template details.

## Upload your own CSS (0.15.0)

Open **Phone > Appearance > Upload CSS files**. Choose your `styles.css` under
Phone styles and your `sidebar.css` under Sidebar styles. Each file must be UTF-8
plain CSS, no larger than 256 KB. Upload either file independently; you do not need
to paste CSS into a box. Your old saved phone CSS still works after updating.

Styles are applied live and saved to your account for all your chats. Local files
are read into your personal settings; nothing is sent to the AI or an external server.
Imports, image URLs and font downloads are rejected. The sidebar upload styles the
settings content below the toolbar. Open, Refresh, Reset and their result line keep
the protected default styling. **Reset appearance** clears both uploads immediately
and saves the defaults, without changing story data or dismissed hints.

Connections and Settings profiles are new labels for the same existing controls.
Your saved choices, profiles and wording survive; the preset line is still
`{{phone_format}}` once. No permission has been added.

## Contacts and setup (0.17.1)

Tap a contact for its full page. Edit has addresses, relationship, role labels,
custom details, portraits and confirmed Delete. Main/NPC is a label you can change.
Merge contacts is on the contact page: choose which contact to keep and confirm.
It keeps that card's values, fills empty fields and retains old matching aliases.

Setup wizard is in the sidebar Phone tab. Add the needed apps in App Store, choose
individual fields, or use Select all and Clear all in each section. Your choices
are remembered for each chat. Then choose Review input. It shows source characters, request messages
and one model request. Run setup, inspect the preview, then Save these additions.
First/full-name matches need Merge or Keep both; an identical full name needs a
new name for the separate contact. Existing edited values are never overwritten.

Connections is unchanged: Main AI uses your Lumiverse default profile; Custom
connection uses the saved choice. No additional picker/key is needed. The operator
must allow world_books, characters, personas and generation for setup. It explains
missing access. Source/model changes require a fresh review. No automatic retry.

New wizard contacts say Added by setup wizard and are not automatically locked.
Older wizard additions cannot safely be distinguished from user edits; their old
labels/protections are preserved. Your edits show Edited by you.

Optional Make up phone/email (fake) starts off, next to its editable domain. When on,
setup can fill missing selected addresses with 555-01xx numbers and emails at that
domain. They are marked made up. Real/edited values and explicitly cleared fields
stay untouched. This deliberately allows an exception to never invent.
Made-up phone numbers and emails are fake. Don't assume they belong to the character
or to any real person. lumi.verse is not a reserved fake domain.

Advanced's Let the AI change fields I edited starts off. When on, only new quoted
story facts may replace an unlocked field. This deliberately allows an exception
to user edits are confirmed facts. Lock protects an individual field even while
this is on. Restore my version restores the last user-entered value for that field.
The wizard always keeps your edited values. These switches/domain are shared chat
settings, not saved in Settings profiles; applying a profile leaves them unchanged.

Keep {{phone_format}} once in your preset. Tag syntax is unchanged; compact safety
wording now follows the edit switch and marks protected continuity fields.
See [the wizard guide](docs/WIZARD-FIX-2.md) for merging, restoration and migration
limits, and [Contacts and setup](docs/PART-6.md) for source access details.

For a failed setup or refresh request, read the message and use Copy if you need
to share it. The displayed message can include the provider's explanation after
credential and header filtering. A stopped or cut-off reply saves no tracker data.
