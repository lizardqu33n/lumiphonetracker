# Wizard review, merging and protected fields - 0.17.0

## Setup

In the sidebar Phone tab, open Setup wizard. Choose the Contacts fields, Notes
sections and/or Locations you want. Scene stays excluded. Review input shows only
source characters read, request-message count and the single model request that
Run setup would make. It makes no token-count request and shows no price estimate.
Sources still use documented card, your active persona and enabled attached/global
lorebook entries; no chat transcript is read by setup.

Run setup, review the preview, then Save these additions. Nothing saves before
confirmation. A first-name match says "Maybe the same person"; a whole-name match
says "Already exists". Matching is case-insensitive by whole first/full names, never
substrings. Choose Merge and a matching contact, or Keep both. An identical full
name needs a different name for the separate contact. No matching record is silently
added. Matches within the same preview need a choice too.

Merge in setup fills missing, unedited fields only. It never replaces populated
fields, an explicitly cleared address, a deleted record or a locked field. Existing
user-edited fields remain protected even while the AI-edit exception is on. Empty
fields on a contact may be filled without changing its other edited values.

New setup-created contacts say "Added by setup wizard". They are NOT user edits and
are NOT automatically locked: future established story facts can update their
ordinary story fields. Their phone/email/relationship/custom details are still
confirmed metadata that ordinary tracking cannot write. Main/NPC auto-detection also
stays unlocked until a user changes the tag. Only a person's own edits set "Edited
by you" and the normal edit protection; a separate hard field lock is optional.

Old versions stored wizard additions and user edits identically. There is no safe
way to relabel only those old wizard records. Their existing labels/protections are
kept; this release does not guess their origin.

## Merge an existing pair

Open the contact you want to combine, tap Merge contacts, choose the contact to
keep, then Confirm merge. For Aaron / Aaron Jensen, open Aaron and choose Aaron
Jensen if that is the name you want to keep. The chosen contact keeps conflicting
values; empty fields are filled from the other card. Alternate phone/email values
and old names remain matching aliases. Portraits fill an empty custom portrait only.
Original contact/metadata/portrait snapshots stay in saved merge history (up to 100
merges per chat), alongside the existing source/edit journals. No merge-history
screen is added. This is not an undo button: inspect the chosen name before merging.

Merged names do not reappear as separate cards on Refresh tracker. Old aliases
still match texts, calls and email. Merged old names remain aliases; a new separate contact must use a different full
name rather than reusing a merged alias. Existing raw message identities/read receipts
are retained; merging does not create a new text. Player-card restrictions remain
in force. Merging or settings changes affect everyone sharing that chat, as before.

## Optional made-up addresses

"Make up phone/email (fake)" starts OFF. Its domain starts at lumi.verse and can be
edited next to the toggle. These are chat settings, not part of Settings profiles.
When enabled, setup fills only selected Phone/Email fields which have no established
or edited value. Source-proven values take priority. Generation is local after
source validation: the model is never asked to invent addresses.

Numbers use 555-0100 through 555-0199, avoiding already-used values in this chat.
Emails use a short name at the chosen domain, with a suffix when needed. If the
number range is exhausted, leave the number blank. Values are marked "made up" in
preview, the saved contact page and compact continuity. Nothing calls or emails them.
Turning the option off keeps already confirmed fake values; a domain change affects
future fills only. Changing one by hand clears its made-up marker; an unchanged fake value keeps it.
An explicitly cleared user field stays cleared and is not filled again.

Made-up phone numbers and emails are fake. Don't assume they belong to the
character or to any real person. This is a deliberate, opt-in exception to
"never invent". **lumi.verse is not a reserved fake domain** and must not be treated
as a guaranteed safe/owned address. See [IANA reserved domains](https://www.iana.org/domains/reserved).

## Optional AI changes to your edits

Advanced has "Let the AI change fields I edited", OFF by default, with a visible
warning when on. It is a chat setting and is excluded from Settings profiles.

OFF blocks new AI replacements of user-edited fields, even if a quote is supplied.
ON allows an unlocked field to change only to a new stated story fact, from a later
message, with an exact value-bearing story quote. Main AI and Custom connection
tracking share this code protection. Inference cannot replace your edit. This is a
deliberate exception to "user edits are confirmed facts". Setup still never replaces
your edits, regardless of this switch.

Every AI-replaceable Scene, Weather and Contacts story field has Lock/Unlock
controls. Notes and Locations expose these for their individual fields; Bank exposes
balance/time. Phone/email/contact metadata are always outside AI writing, so this
exception never makes them AI-editable. Texts, email, call and transaction records
append rather than overwrite prior fields; their existing author protections remain.
Lock always blocks a replacement, including when the switch is ON. Locking an AI
value keeps that value without pretending you edited it. You can still edit a locked
field yourself. Empty shown fields may be locked too.

The last user-entered value stays in the edit journal. If tracking replaces it,
"Restore my version" appears for that field. Restoring changes that field only and
keeps its lock state. Notes/Locations may keep adjacent fields in the save payload,
but those are not falsely recorded as new user edits. Restore is shared chat data;
it restores the last user-entered version of the field, not a separate private copy
for each server user. Appearance, wordings, profiles, hints and unread states retain
their existing personal scopes.

Previously admitted quoted changes survive turning the exception OFF; the switch
controls future replacements. Upgrading older journals preserves their supported
quoted changes rather than rewinding story facts. Newer user corrections and hard
locks still win. Current macro syntax and the preset line `{{phone_format}}` stay
the same. Continuity marks edited/locked fields, and generated safety wording follows
the switch even with custom prompt wording. No new extension APIs or permissions.

## Limits of verification

Local code tests and the browser harness cover duplicate decisions, merging and
rebuilds, fake-value rules, provenance, user versions, locks, safe failures, scope
separation and protected Reset/opaque screens. Real server permissions, real model
extraction, live provider behavior and the native mobile drawer remain unverified.
Literal source quotes cannot prove that a model assigned a fact to the correct
person; keep reviewing the preview.
