# Setup wizard fix - 0.16.1

Open Phone in the sidebar, then Setup wizard. Choose the individual fields to import:
Contacts (Phone, Email, Relationship type, Roles, Physical status, Mood, Position,
Attire, Inner thoughts), Notes (People, Key items, Rules, Plots, Misc), and Locations.
Scene stays excluded. Add a removed app in App Store first. These are one-time import
choices; they do not change tracking switches. Misc stays private from AI continuity
unless separately enabled by its existing control.

Review token cost is free. Only Run setup makes a model request. Inspect the preview,
then Save these additions. Existing edits, populated fields and deletion history stay
protected. No new permission, connection picker or API key is introduced.

## Reported failure

The exact old source error was:
`Choose your custom connection in the sidebar's Connections section first.`

This branch matches the user's reported message. The old wizard always looked for
the saved custom connection ID, even when Connections said Main AI. With no saved
custom connection, it stopped before token review. A regression test reproduces the
old check, then proves the new path works with the same empty custom ID.

Main AI now resolves the requesting user's unique default profile using documented
`connections.list(userId)` and `is_default`. Custom connection uses the existing
saved connection_id. Both require a configured model and generation access. If
unavailable, setup states why and makes no request. Connection/model selection is
checked again before Run; changed defaults require a fresh review.

The docs do not provide a setup API for discovering an effective per-preset or
chat-specific Main AI override. The user's documented default profile is used;
no private chat metadata is guessed. See [Generation and connections](https://docs.lumiverse.chat/backend-api/generation/).

Connection labels are built in src/helper.ts. The separator itself had been
mis-encoded as `Â·`; it was not supplied by Lumiverse or the connection's name.
The builder now joins name and model with ASCII ` - `, avoiding that encoding issue.

Setup lives inside the sidebar settings boundary. The protected toolbar and Reset
remain outside that boundary; the wizard works even without a floating phone mount.
There is no Home wizard button. Prompt macros and phone_format are unchanged.

## Verification limits

Local tests use mock APIs, two user identities and a browser harness. They verify
field selection, source quotes, user-edit protection, connection resolution, cost
review, preview/confirmation, chat switching and protected Reset. They do not prove
real server permissions, native card/persona/lorebook access, mobile drawer behavior,
provider billing, token estimates or real-model extraction quality. The real server's
logs were not accessed; the reported failure was reproduced from the old code path.
