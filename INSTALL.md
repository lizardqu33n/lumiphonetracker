# Install Lumi Phone Tracker

Version 0.10.0 includes the built files. You do not need to build or upload anything yourself.

## Install or update

1. Open Lumiverse > Extensions > Install.
2. Paste this repository address: https://github.com/lizardqu33n/lumiphonetracker . For an existing install from this repository, use its update option to get version 0.10.0. Enable the extension.
3. Allow chat access, message processing, prompt interception and floating panels (chats, chat_mutation, interceptor, ui_panels, macro_interceptor). The existing generation permission enables optional Helper AI: completed-reply tracking and calls through the connection you select. Main AI makes no extra model requests. If generation permission is declined, Main AI still works.
4. Open a chat. Tap the floating phone, or use Open phone in the Phone sidebar tab.
5. Add this exact single line to your active preset and save it:

```text
{{phone_format}}
```

Remove older manual tracker-writing instructions or duplicate phone macros if you pasted them. No preset rewrite is required. The format macro changes its instructions with the settings, so this line works in both modes.

Version 0.10.0 retains the fix for preset entries that bypass the macro interceptor. Keep using just {{phone_format}}. The pull handler reads the identity supplied inside that preset evaluation's host environment. This patch needs no additional permission. The existing macro_interceptor permission still supports other evaluation paths. If the host truly supplies no user or chat, the macro stays empty, logs the reason and lets generation continue.


Part 1 now requests compact shorthand from Main AI and Helper AI. Old saved JSON blocks still rebuild; do not rewrite old messages. No new permission or preset edit is needed. New AI contacts need confirmed Present names; with Present off, new names without saved presence are not admitted. Part 2 adds Refresh tracker in both modes and named Helper failure reasons. No additional permission is required.

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
Helper AI, **Appearance** for live phone CSS, or **Advanced** for limits, history
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
in both modes. Helper AI may extract calls and bank figures but never emails or
texts. No new permission or service/account connection is needed for these apps.

## Main AI or Helper AI

Main AI is the default in a new chat. It adds hidden data to its normal reply, with no separate model request.

**Refresh tracker** is always at the top of the sidebar's Phone tab, in both modes. In Main AI mode it rebuilds this chat from saved messages, with no model call or extra cost. It shows Refreshed when done; it cannot recover facts the story never saved.

To use the helper in this chat, open the sidebar's Phone tab and expand Tracker source:

1. Choose Helper AI under Tracker source.
2. Choose one of your existing saved connections. The picker shows its name and model. Make or change connections in Lumiverse's normal connection settings; this extension never asks for an API key.
3. Leave Messages to read at 3, or enter a number from 1 to 10.
4. A completed reply updates the tracker once. Refresh tracker requests one Helper update yourself. It is disabled while a reply or update is running.

**Requests may cost money depending on the model chosen.** Choosing a connection does not immediately make a model request. Only completed replies while Helper AI is selected, or Refresh tracker while Helper AI is selected, do that. Switching back to Main AI prevents new requests and tries to cancel an older one; a request already started may still be charged.

Only the chosen recent messages, with all phone tags removed, plus compact tracker data are sent. The helper never creates texts. If a connection disappears, Connection not found appears and Main AI becomes the saved fallback. Tracker update failed names the reason and keeps the old data. Reasons are permission missing, no connection, provider error, timeout, empty reply, invalid output, or validation rejected. There is no automatic retry loop. You can try Refresh tracker later yourself.

Helper AI uses this separate picker. Lumiverse's Council Sidecar setting is read-only in the extension docs; no documented call lets this extension run that built-in service.

## Using the phone

Tap Scene or Weather to correct a field. Expand Contacts, Locations or Notes to edit/delete; + Add creates your own entries. User edits are marked. Each chat has separate data and tracker settings.

Messages contains actual sent texts, grouped by sender. Opening a conversation clears its unread badge. Write a reply and choose Add to draft, then review and send it from the normal chat input yourself. Cancelling a draft never files it. On older hosts without composer drafting, copy the offered tag into the normal input instead. The extension never presses Send.

Appearance and dismissed explanations follow your user account. [STYLING.md](STYLING.md) has copy-paste CSS examples. If the phone is missing or CSS hides it, use the single Reset appearance button at the top of the Phone sidebar. It clears appearance and reopens the phone in the same session without deleting story data. Its confirmation stays in the sidebar.

## What still needs checking

The documented installation route uses GitHub; the archive is a handoff copy, not a claimed local-installer feature. Actual installation, native stream/composer behavior, provider prompt stripping and Helper AI with a real connection were not tested here. See [TESTING.md](TESTING.md). Disable or uninstall through Extensions.
