# Install and use Lumi Phone Tracker

Built files are included—you do not need to compile the extension. Normal tracking uses saved messages written by your main story model, with optional AI extraction only when you explicitly run the setup wizard.

## Install or update

1. Open Lumiverse > Extensions > Install.
2. Use https://github.com/lizardqu33n/lumiphonetracker . For an existing install, use its update option and check the displayed version.
3. Allow chat access, message processing, prompt interception and floating panels. Normal tracking uses no extra AI connection or API key.
4. Open a chat and the floating phone. New chats start off: choose **Turn on for this chat** on Home. Existing tracked chats remain on. **Turn off for this chat** keeps all saved data and stops tracking macros/updates.
5. Put this one line in the active preset and save:

```text
{{phone_format}}
```

Remove older duplicate tracker-writing instructions/macros. The main story model writes the hidden tags; the extension reads the saved reply. App and field switches determine the instructions and continuity supplied to the model. No separate Helper model is used.

## Sidebar settings

Open the existing **Phone** sidebar tab. Open phone, Refresh tracker and Reset appearance stay protected at the top. **Refresh tracker** rebuilds from saved messages without calling a model.

**App Store** adds/removes built-in apps. Removing one hides it and stops its AI instructions/continuity while keeping its data. **What to track** controls individual fields. **Appearance** accepts your own styles.css and sidebar.css files, up to 256 KB each. Reset appearance clears both and still works if custom CSS hides the phone.

**Settings profiles** save app/field choices and limits for you. **Advanced** keeps retention/size limits, the two safety exceptions and editable tracker prompt wording. There is no Tracker source / Connections section or Helper message-count setting now.

Story data, app switches and tracker settings are shared by everyone in that chat. Read/unread state, arrival notices, appearance, profiles, prompt wording and dismissed hints remain personal. Every server action uses the authenticated user and checks chat access.

## Optional setup wizard

1. The operator grants generation, character/persona and lorebook access for setup. Optional avatar access (characters/personas/images) is needed only to use card/persona portraits; initials still work without avatars.
2. Open **Setup wizard** in the Phone sidebar tab. Select **Setup connection** from your own saved Lumiverse connections. Never enter API keys into this extension. Missing/stale connections must be selected again; normal tracking still works.
3. Choose contact fields, Notes sections or Locations. Scene is excluded. Review input to see known characters/messages read and number of requests. This does not call the model.
4. **Run setup** makes the explicit model request using that saved connection. Its provider's normal billing applies. The extension does not claim a known money/token price.
5. Review the results, resolve any duplicate choices, and choose **Save these additions**. Preview never silently saves; existing user edits are protected. Errors or stopped/partial replies save nothing and do not automatically retry. Copy is available on error messages after credential filtering.

The main message workflow, connection selection and Refresh never make model requests. Old Helper settings/journals are retained for compatibility; they do not reactivate automatic requests. Existing selected connection IDs are retained for wizard use, subject to your access.

## Existing behavior kept

Text replies use Add to draft: they enter the Lumiverse input for review and do not send. Outgoing texts appear only after you send them. Texts between other characters are rejected. Calls/Email/Bank are optional apps. Bank records stated figures and never calculates balances.

User edits remain protected. The off-by-default AI-edit exception permits only new stated, quoted facts in unlocked fields; Lock still protects a field, and Restore my version keeps the user's earlier value available. The setup wizard never overwrites user edits.

Make up phone/email (fake) is a separate off-by-default wizard option and a deliberate exception to never invent. Its 555-01xx numbers and configured email addresses are labelled made up. The default lumi.verse domain is not a reserved fake domain. Never assume those addresses belong to a character or real person.

## Performance and troubleshooting

Opening/restarting a chat and Refresh may read history once. Normal new replies are processed from their saved-message event; views/macros read current saved state. Regeneration, swipes, deletion, merges and complex edited histories may need a full rebuild to preserve the correct selected sources. Long stored journals still have a cost. The update does not prove that every server lag or memory-pressure issue is fixed.

If an update appears stale, use Refresh tracker. Keep the preset line above. If generation fails, record the exact server error and time; an interceptor timeout and a model/provider failure are different paths. See TESTING.md and docs/SIMPLE-WORKFLOW.md for the limits of local verification.
