# Install Lumi Phone Tracker

Version 0.6.0 includes the built files. You do not need to build or upload anything yourself.

## Install or update

1. Open Lumiverse > Extensions > Install.
2. Paste this repository address: https://github.com/lizardqu33n/lumiphonetracker . For an existing install from this repository, use its update option to get version 0.6.0. Enable the extension.
3. Allow chat access, message processing, prompt interception and floating panels (chats, chat_mutation, interceptor, ui_panels). The new generation permission enables optional Helper AI: completed-reply tracking and calls through the connection you select. Main AI makes no extra model requests. If generation permission is declined, Main AI still works.
4. Open a chat. Tap the floating phone, or use Open phone in the Phone sidebar tab.
5. Add this exact single line to your active preset and save it:

```text
{{phone_format}}
```

Remove older manual tracker-writing instructions or duplicate phone macros if you pasted them. No preset rewrite is required. The format macro changes its instructions with the settings, so this line works in both modes.

## Main AI or Helper AI

Main AI is the default in a new chat. It adds hidden data to its normal reply, with no separate model request.

To use the helper in this chat, open Settings:

1. Choose Helper AI under Tracker source.
2. Choose one of your existing saved connections. The picker shows its name and model. Make or change connections in Lumiverse's normal connection settings; this extension never asks for an API key.
3. Leave Messages to read at 3, or enter a number from 1 to 10.
4. A completed reply updates the tracker once. Update now requests one update yourself; it is available when the current reply/update has finished.

**Requests may cost money depending on the model chosen.** Choosing a connection does not immediately make a model request. Only completed replies while Helper AI is selected, or Update now, do that. Switching back to Main AI prevents new requests and tries to cancel an older one; a request already started may still be charged.

Only the chosen recent messages, with all phone tags removed, plus compact tracker data are sent. The helper never creates texts. If a connection disappears, Connection not found appears and Main AI becomes the saved fallback. Tracker update failed means old data was kept; there is no automatic retry loop. You can try Update now later yourself.

Helper AI uses this separate picker. Lumiverse's Council Sidecar setting is read-only in the extension docs; no documented call lets this extension run that built-in service.

## Using the phone

Tap Scene or Weather to correct a field. Expand Contacts, Locations or Notes to edit/delete; + Add creates your own entries. User edits are marked. Each chat has separate data and tracker settings.

Messages contains actual sent texts, grouped by sender. Opening a conversation clears its unread badge. Write a reply and choose Add to draft, then review and send it from the normal chat input yourself. Cancelling a draft never files it. On older hosts without composer drafting, copy the offered tag into the normal input instead. The extension never presses Send.

Appearance and dismissed explanations follow your user account. [STYLING.md](STYLING.md) has copy-paste CSS examples. If the phone is missing or CSS hides it, use the single Reset appearance button beside Open phone in the sidebar. It clears appearance and reopens the phone in the same session without deleting story data. Its confirmation stays in the sidebar.

## What still needs checking

The documented installation route uses GitHub; the archive is a handoff copy, not a claimed local-installer feature. Actual installation, native stream/composer behavior, provider prompt stripping and Helper AI with a real connection were not tested here. See [TESTING.md](TESTING.md). Disable or uninstall through Extensions.
