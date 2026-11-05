# Install Lumi Phone Tracker

Version 0.8.1 includes the built files. You do not need to build or upload anything yourself.

## Install or update

1. Open Lumiverse > Extensions > Install.
2. Paste this repository address: https://github.com/lizardqu33n/lumiphonetracker . For an existing install from this repository, use its update option to get version 0.8.1. Enable the extension.
3. Allow chat access, message processing, prompt interception and floating panels (chats, chat_mutation, interceptor, ui_panels, macro_interceptor). The existing generation permission enables optional Helper AI: completed-reply tracking and calls through the connection you select. Main AI makes no extra model requests. If generation permission is declined, Main AI still works.
4. Open a chat. Tap the floating phone, or use Open phone in the Phone sidebar tab.
5. Add this exact single line to your active preset and save it:

```text
{{phone_format}}
```

Remove older manual tracker-writing instructions or duplicate phone macros if you pasted them. No preset rewrite is required. The format macro changes its instructions with the settings, so this line works in both modes.

Version 0.8.1 retains the fix for preset entries that bypass the macro interceptor. Keep using just {{phone_format}}. The pull handler reads the identity supplied inside that preset evaluation's host environment. This patch needs no additional permission. The existing macro_interceptor permission still supports other evaluation paths. If the host truly supplies no user or chat, the macro stays empty, logs the reason and lets generation continue.


Part 1 now requests compact shorthand from Main AI and Helper AI. Old saved JSON blocks still rebuild; do not rewrite old messages. No new permission or preset edit is needed. New AI contacts need confirmed Present names; with Present off, new names without saved presence are not admitted. Part 2 adds Refresh tracker in both modes and named Helper failure reasons. No additional permission is required.

## Main AI or Helper AI

Main AI is the default in a new chat. It adds hidden data to its normal reply, with no separate model request.

**Refresh tracker** is in Settings in both modes. In Main AI mode it rebuilds this chat from saved messages, with no model call or extra cost. It shows Refreshed when done; it cannot recover facts the story never saved.

To use the helper in this chat, open Settings:

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

Appearance and dismissed explanations follow your user account. [STYLING.md](STYLING.md) has copy-paste CSS examples. If the phone is missing or CSS hides it, use the single Reset appearance button beside Open phone in the sidebar. It clears appearance and reopens the phone in the same session without deleting story data. Its confirmation stays in the sidebar.

## What still needs checking

The documented installation route uses GitHub; the archive is a handoff copy, not a claimed local-installer feature. Actual installation, native stream/composer behavior, provider prompt stripping and Helper AI with a real connection were not tested here. See [TESTING.md](TESTING.md). Disable or uninstall through Extensions.
