# Final additions: authoritative specification

Current Part 3 override (0.9.0): Home contains only added story apps, each labelled.
There is no fixed seven-icon layout, phone Settings screen or App Store icon.
App Store and all settings are in the existing Phone sidebar. Story controls,
replies and dismissible app descriptions stay in the phone. The Home hint is
"Change what the phone tracks in the sidebar's Phone tab." Its empty state is
"No apps added. Add apps from the sidebar's Phone tab." See [PART-3.md](PART-3.md).

The original accepted text below is historical where this override differs.

Status: accepted plan; not implemented in the Step 2 checkpoint.
The text below is preserved from the user's final request.

FINAL ADDITIONS (these replace my earlier CHANGE 10 to 14). Add to the accepted plan. Data and macros go in Step 3, the screens in Step 4. Pause after each step. Do not invent APIs.

A. HOME SCREEN AND CLARITY RULES (these override any design choice that makes the UI harder to understand)
- Current rule: only added Scene, Weather, Locations, Notes, Contacts and Messages icons, each with a text label. Future apps wait for their own step. No fixed icon count or Settings icon.
- Navigation is one level: Home -> app, with a back button to Home. No tabs, no nested menus, no pop-up chains. Details expand inside the same screen.
- Every app starts with a one-line plain description (for example "Where the story is happening right now."). The user can dismiss it, and it stays dismissed.
- Every empty screen explains itself (for example "Nothing here yet. This fills in when the story mentions a place."). Never show fake or example data.
- Plain words only. No technical terms in the UI. Call the sidecar "Helper AI".
- Sidebar settings: grouped by app, a short label and one line for each switch. Technical options go in a collapsed Advanced section. Defaults must work without opening Advanced.
- Show an "edited by you" marker on anything the user changed. Secondary details stay in collapsed sections.
- Do not add apps, tabs, settings, or fields beyond this plan. Mention ideas in your report instead.
- TESTING.md manual test: someone who has never seen it should be able to say what each app does within about 5 seconds.

B. SCENE APP
- Shows the exact location large, the wider places small (building, city, state or province, if known), the time, the date, and "Here now" as a plain list of names only. No character cards here.
- Time and date appear ONLY in Scene. Weather appears ONLY in the Weather app. No duplicate tracking.
- Fields have independent on/off switches: location, time, date, who is present.

C. CONTACTS APP (character information lives here)
- One collapsed card per character the story has established by name. Never unnamed crowds or passing mentions. The collapsed card shows the name, roles, and either "Here now" or "Last seen: [place]".
- Expanded fields, each with its own on/off switch under a Contacts group in Settings:
  - Roles: any number, shown in order separated by " / ". None means just the name.
  - Physical status: observable body condition only, no emotions.
  - Mood.
  - Position: precise, with facing direction and spatial relation to others or objects.
  - Attire: the COMPLETE list of everything currently worn, with colors and materials, plus a separate "Removed" line for recently removed items. Anything not listed is not worn.
  - Inner thoughts: one short private line. NPCs only. Default OFF.
- An "Open texts" button on each card jumps to that person's conversation in Messages, with their unread badge.
- The player's character has a card marked "You". It shows ONLY physical status, position, and attire. The AI and the sidecar NEVER write mood or inner thoughts for the player's character.
- "Here now" contacts are listed first, then a collapsed "Not here now" group. Absent contacts keep their last known values until the story changes them. At most 30 contacts per chat. When full, drop a new AI-added contact and show a dismissible notice. Never delete anything automatically. The user can add, edit, and delete contacts.
- Canon rules, stated briefly in {{phone_format}}: fill a field only when the story establishes it. Setting "Let the AI fill in missing details", default OFF. When ON, the AI infers ONE concrete value and the phone marks it "inferred". Once filled, a field is locked, and the AI writes it again only when narration changes it. Each field holds one concrete value, with no "or", ranges, or hedges. Attire and Position updates REPLACE the whole field, so the AI writes the full current list. User edits are confirmed information.
- {{phone_scene}} gives the AI the location, time, date, and the PRESENT characters with their enabled fields, as short lines. This is the single source of truth. {{phone_format}} adds one sentence: narration must stay consistent with {{phone_scene}}, and changes made in narration must be written into the block in the same reply. No separate contacts macro.

D. LOCATIONS APP
- A list of places the story has established. Each entry has a name, a short description using only what the story has said, and optionally one short line on how it relates to another place. Never invent places or details.
- The current place is marked "Current", taken from the Scene location (one source of truth). The user can add, edit, and delete entries. Maximum 30 places per chat. Merge obvious duplicates. Ignore passing mentions.
- {{phone_locations}} returns only the current location plus up to 3 other recently relevant places, as short lines. Not the whole list.

E. NOTES APP (the story log)
- One scrolling screen with five collapsible sections, each holding small note cards:
  1. People to remember (recurring or offscreen NPCs): name | role or affiliation | why they will return, or last known status
  2. Key items: item | holder or location | story function
  3. Rules: subject | the explicit rule | source or context
  4. Pending plots: what is pending | who is involved | trigger or deadline
  5. Misc: label | value or note
- Inclusion rules (short version in {{phone_format}}): People only if briefly seen with a clear reason to return. Items only if they have a specific story function. Rules only if explicitly stated as a firm principle or restriction, never habits or quirks. Pending plots only if a future event is concretely set up (a scheduled meeting, sworn promise, ultimatum, prophecy with named stakes, cliffhanger with a named party), never vague foreshadowing. The AI NEVER writes to Misc.
- The AI writes ONLY new or changed entries, never the whole log. It can update an existing entry by name (case-insensitive, no duplicates). The AI can NEVER delete. If the story changes a fact, the entry is marked "Updated" with its new status. Resolved plots move to a collapsed "Resolved" group.
- Each note is a small card showing one terse line. Tapping expands it with Edit and Delete (one-tap confirmation, no undo or trash). Each section header shows a counter (for example "People 4/10") and a "+ Add" button. The user can add, edit, and delete in EVERY section, including Misc. User-added notes are marked "added by you".
- Limit: "Notes per section" in Advanced, default 10, min 3, max 30. Resolved plots do not count. The extension NEVER deletes or hides a note on its own. When a section is full, a new AI entry for it is dropped with a dismissible notice (for example "People is full (10/10). Delete a note to make room."). Updates to existing notes are always allowed. {{phone_format}} tells the AI which sections are full, in one short line, and leaves the line out when none are.
- {{phone_notes}}: a compact selection with Rules first, then open Pending plots, then the most recently updated People and Items. Misc is included only for entries the user marked "Send to AI". The cap is "Log lines sent to the AI" in Advanced, default 20. The phone always shows everything.

F. SWITCHES, SIDECAR, AND PROMPT TRIMMING
- Each of Scene's fields, each Contacts field, Locations, each Notes section, Weather, and Messages has its own on/off switch. A switch off means hidden in the phone, the macro returns nothing, and {{phone_format}} does not ask the AI to write it.
- All of the above works in Main AI mode and Sidecar mode. Add the fields to the compact block (only changed fields) and to the sidecar's JSON, with the same rules: only what the story states, null otherwise.
- Add the Advanced setting "Keep tracker blocks in the last [N] messages", default 0 (matches your plan to always strip them). It only changes what is sent to the AI, never the saved chat.
