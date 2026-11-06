# Style your phone

Version 0.12.0 keeps the compact story views and adds the read-only story strip plus a protected icon toolbar and compact sidebar. Existing phone custom CSS still overrides the defaults.

Version 0.10.1 bundles the supplied styles(1).css and sidebar.css as the default look: pastel tiles, plum outlines, heart markers and solid dark story surfaces. This default does not use the custom CSS character limit. Class names, navigation and tracker behavior are unchanged.

Open **sidebar > Phone > Appearance > Custom CSS** to override the defaults live. Your saved custom CSS still overrides a new default after an update; it is not deleted automatically. To see the new default alone, use **Reset appearance** at the top of the Phone sidebar tab.

That single Reset and its confirmation stay outside the phone's Shadow DOM. Custom phone CSS cannot style them or escape the protected clipping area. Reset clears only appearance and reopens the phone without a page refresh, even after hostile CSS. It never deletes story data. If saving fails, the current view is restored and the sidebar tells you to try saving again.

All default rules are in [src/styles.css](src/styles.css). All declared --lpt- variables live on the same .lpt-root element. Some small decorative details are fixed CSS values; use the stable class selectors below to change those. There are no inline style attributes, external fonts, icon downloads or CDN requests. The frame, launcher and app content remain separate.

Version 0.8.1 embeds the new tight-cropped 88 x 128 transparent PNG unchanged. The default is **A: a transparent 50 x 50 launcher**, with artwork about 34 x 50, centered and touching top and bottom. It keeps its proportions, with no cropping, stretching or inner padding. Side space is required by the taller artwork's shape. Smooth scaling is used. Only the image has a soft drop shadow; the box has no background, border or box shadow, even on hover. PNG colors stay as drawn; the app PNGs retain their original colors.

The visible box in earlier versions came from `.lpt-launcher` in our stylesheet. Lumiverse's documented [chromeless float widget](https://docs.lumiverse.chat/frontend-api/ui-placement/#spindlefloatwidgetoptions) is already enabled and removes host background/border/shadow. No host-private selector or new API is used. Native desktop window behavior still needs a real-host check.

**B: taller artwork** is also possible with the CSS below. The art is about 38 x 55. Its invisible tap target stays 50 x 55: making the actual target only 38 pixels wide would shrink the existing tap area. There is no extra setting or control.

```css
.lpt-root { --lpt-launcher-size: 50px; }
.lpt-launcher { height: 55px; }
```

`.lpt-launcher-image` is the stable artwork class. The native button keeps the **Open phone** label, keyboard activation and a visible focus ring inside its bounds, so placement clipping cannot cut the ring off. The direct `.lpt-unread-badge` stays above the image and inside the target. Existing dragging and sidebar Reset protection are unchanged. The existing protected placement still clips to its own bounds; a large custom shadow can be cut off at those edges. Increasing shadow blur does not enlarge the tap area. Open phone screens, frame and cards remain opaque.

## Optional apps and PNG artwork (0.10.0)

The nine supplied 128 x 128 app PNGs are embedded in src/app-icons.ts. Home and
App Store use the same images, contained with normal smooth scaling and no
external loading. Home artwork defaults to 44px through --lpt-app-image-size;
sidebar artwork uses its own 22px rule in sidebar.css. PNG colors do not inherit
currentColor; the general accent variable still recolors labels, badges and
other controls. The separate launcher art/fit is unchanged.

Calls, Email and Bank reuse the existing opaque screen/card variables. They have
no separate color theme. Record editors reuse the existing form/edit/delete
classes. Calls has no dialing action; Email has no compose, send or reply action.
All email body/subject content is literal text, including URL-looking text.

| Class | What it is |
| --- | --- |
| `.lpt-app-image` | Embedded app PNG on Home or in App Store. |
| `.lpt-activity` | Shared opaque optional-app screen container. |
| `.lpt-calls` | Calls screen. |
| `.lpt-call` | One call record card. |
| `.lpt-muted` | Optional known time/recipient metadata text in the new apps. |
| `.lpt-call-direction` | Incoming, Outgoing or Missed label. |
| `.lpt-email.lpt-activity` | Email inbox screen. |
| `.lpt-email.lpt-card` | Expandable stored email card. |
| `.lpt-email-summary` | Sender/subject/time row that opens the email. |
| `.lpt-email-from` | Literal sender name or address. |
| `.lpt-email-subject` | Literal subject. |
| `.lpt-email-body` | Plain body text with preserved line breaks and no links/HTML. |
| `.lpt-email-unread` | Personal unread label on one email. |
| `.lpt-bank` | Bank screen. |
| `.lpt-bank-account` | Account and its last stated balance. |
| `.lpt-bank-balance` | Balance or Last stated amount, without calculation. |
| `.lpt-bank-time` | Known as-of time. |
| `.lpt-bank-transaction` | One recent transaction card. |
| `.lpt-transaction-amount` | Literal transaction amount. |

The existing `.lpt-unread-badge` also shows personal missed-call and email counts.
No new navigation tabs or Settings screen are added. New App Store entries start
removed; removed data stays saved. Shared story data/settings and personal
receipts/appearance/dismissals follow [PART-4.md](docs/PART-4.md).

## Sidebar settings (0.12.0)

All settings are now in the existing **Phone** sidebar. Only App Store opens by
default. The scope is visible in each section heading. The phone keeps story
screens, editing, replies and dismissible descriptions, plus `.lpt-home-hint`.
Home has only added apps; it has no Settings or App Store icon.

Sidebar rules live in [src/sidebar.css](src/sidebar.css), outside the phone's
Shadow DOM. The phone CSS editor cannot style the sidebar, its controls or Reset.
Do not put sidebar rules in that editor; it intentionally changes only the phone.
The sidebar follows documented host theme colors. It uses native labeled
checkbox chips with visible checked states. No documented chip component exists
in the checked shared-components contract, so no private shared-switch children
are styled. Only the body below the toolbar/results scrolls. The CSS editor is
collapsed inside Appearance; only one outer section opens at a time.

| Sidebar class | What it is |
| --- | --- |
| `.lpt-sidebar` | Protected sidebar layout root with its own --lpt-side- variables. |
| `.lpt-sidebar-settings` | Chat label and the five collapsible sections. |
| `.lpt-recovery-actions` | Sticky Open / Refresh / Reset area. |
| `.lpt-recovery-action` | Legacy selector, no longer emitted: results are below the shared toolbar. |
| `.lpt-recovery-button` | Top action button. |
| `.lpt-recovery-status` | Short confirmation or recovery explanation. |
| `.lpt-refresh-result` | Refresh result, kept with the top Refresh button. |
| `.lpt-side-chat` | Name of the chat these settings affect, or the no-chat message. |
| `.lpt-side-section` | Collapsible section. |
| `.lpt-side-summary` | Section title and visible scope label. |
| `.lpt-side-apps` | App Store, the only section expanded initially. |
| `.lpt-side-tracking` | Grouped field switches for this chat. |
| `.lpt-side-source` | Main AI / Helper AI controls for this chat. |
| `.lpt-side-appearance` | User-wide live phone CSS editor. |
| `.lpt-side-advanced` | Existing numeric settings and two optional AI switches. |
| `.lpt-store-row` | Built-in app row, identified by data-store-app. |
| `.lpt-store-icon` | Container for the bundled app PNG, with no external loading. |
| `.lpt-store-name` | App's plain name. |
| `.lpt-store-added` | Legacy selector, no longer emitted: redundant pill removed. |
| `.lpt-store-button` | Add or Remove button. |
| `.lpt-side-group` | Group of tracking switches for one app. |
| `.lpt-side-legend` | App name above its switches. |
| `.lpt-side-setting` | One switch or numeric setting, identified by data-setting. |
| `.lpt-side-label` | Label and short explanation. |
| `.lpt-side-title` | Short setting name. |
| `.lpt-side-help` | One-sentence explanation. |
| `.lpt-side-switch` | Legacy selector, no longer emitted: chips use native inputs. |
| `.lpt-side-checkbox` | Native checked-state input for tracking chips and safety settings. |
| `.lpt-side-number` | Existing bounded whole-number input. |
| `.lpt-helper-source` | Moved Main AI / Helper AI picker. |
| `.lpt-helper-connection` | Moved saved-connection picker. |
| `.lpt-sidebar-css` | Moved live phone CSS text area. |
| `.lpt-side-status` | Save result or CSS validation message. |

The old `.lpt-settings`, `.lpt-settings-group`, `.lpt-setting*`, `.lpt-toggle`,
`.lpt-number`, `.lpt-advanced`, `.lpt-custom-css`, `.lpt-css-editor` and
`.lpt-helper-settings` entries below are legacy stylesheet hooks; there is no
phone Settings screen using them. `.lpt-update-now` remains the Refresh button's
compatibility class, now in the sidebar. The standard phone editor, card, form
and button classes still apply to story controls inside the phone.

## Variables

Phone defaults live on `.lpt-root` in src/styles.css. The attached theme uses
explicit pastel/dark colors rather than changing with the host palette. All
story surfaces are opaque; launcher transparency is intentional. A gloss or
checker pattern sits on a solid base. System fonts are named locally, never downloaded.
The optional plain-dark override is included as a comment at the end of styles.css.

| Variable | Default | What it changes |
| --- | --- | --- |
| `--lpt-outline` | `#420642` | Phone outline. |
| `--lpt-lilac-1` | `#dec6f6` | Lilac palette shade 1, used by pastel surfaces. |
| `--lpt-lilac-2` | `#d2aef6` | Lilac palette shade 2, used by pastel surfaces. |
| `--lpt-lilac-3` | `#c696f6` | Lilac palette shade 3, used by pastel surfaces. |
| `--lpt-pink-1` | `#f6a2d2` | Pink palette shade 1, used by buttons and tiles. |
| `--lpt-pink-2` | `#f67ec6` | Pink palette shade 2, used by buttons and tiles. |
| `--lpt-blue` | `#a2d2f6` | Phone blue. |
| `--lpt-yellow` | `#f6de8a` | Phone yellow. |
| `--lpt-hot-pink` | `#c2187f` | Phone hot pink. |
| `--lpt-phone-bg` | `#1f0f2e` | Solid dark outer phone frame. |
| `--lpt-screen-bg` | `#261338` | Opaque Home/app/header/scroll area behind cards. |
| `--lpt-card-bg` | `#2e1743` | Slightly different solid card and section background. |
| `--lpt-elevated-bg` | `#3d2059` | Solid raised surfaces and hover fills. |
| `--lpt-fill` | `var(--lpt-screen-bg)` | Compatibility background token following the screen color. |
| `--lpt-subtle` | `var(--lpt-card-bg)` | Compatibility secondary token following the card color. |
| `--lpt-text` | `#f7ecff` | Main text color. |
| `--lpt-muted` | `#cdb4ee` | Secondary text color. |
| `--lpt-on-pastel` | `#420642` | Phone on pastel. |
| `--lpt-on-pastel-soft` | `#4a1260` | Phone on pastel soft. |
| `--lpt-accent` | `var(--lpt-pink-2)` | Highlights and selected controls. |
| `--lpt-accent-text` | `#420642` | Text on accent-colored buttons. |
| `--lpt-focus-color` | `#f6de8a` | Phone focus color. |
| `--lpt-border` | `#5b3a85` | Normal plum borders. |
| `--lpt-hover-border` | `var(--lpt-lilac-3)` | Lighter hover borders. |
| `--lpt-frame-edge` | `var(--lpt-lilac-1)` | Phone frame edge and inset highlight. |
| `--lpt-card-outline` | `var(--lpt-lilac-2)` | Phone card outline. |
| `--lpt-shadow-hard` | `#4b2478` | Phone shadow hard. |
| `--lpt-gloss` | `linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0, rgba(255, 255, 255, 0.22) 48%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)` | Phone gloss. |
| `--lpt-notch-bg` | `var(--lpt-outline)` | Top notch pill background. |
| `--lpt-notch-width` | `76px` | Top notch pill width. |
| `--lpt-notch-height` | `18px` | Top notch pill height. |
| `--lpt-home-bar-width` | `112px` | Bottom decorative home bar width. |
| `--lpt-home-bar-height` | `5px` | Bottom decorative home bar thickness. |
| `--lpt-home-bar-color` | `var(--lpt-lilac-3)` | Bottom decorative home bar color. |
| `--lpt-wallpaper-a` | `#261338` | Phone wallpaper a. |
| `--lpt-wallpaper-b` | `#2d1843` | Phone wallpaper b. |
| `--lpt-wallpaper-size` | `28px` | Phone wallpaper size. |
| `--lpt-tint-scene` | `var(--lpt-lilac-2)` | Scene Home icon color and tinted tile fill. |
| `--lpt-tint-weather` | `var(--lpt-blue)` | Weather Home icon color and tinted tile fill. |
| `--lpt-tint-locations` | `var(--lpt-yellow)` | Locations Home icon color and tinted tile fill. |
| `--lpt-tint-notes` | `var(--lpt-pink-1)` | Notes Home icon color and tinted tile fill. |
| `--lpt-tint-contacts` | `var(--lpt-lilac-1)` | Contacts Home icon color and tinted tile fill. |
| `--lpt-tint-messages` | `var(--lpt-blue)` | Messages Home icon color and tinted tile fill. |
| `--lpt-tint-settings` | `var(--lpt-lilac-1)` | Settings Home icon color and tinted tile fill. |
| `--lpt-tint-calls` | `var(--lpt-yellow)` | Phone tint calls. |
| `--lpt-tint-email` | `var(--lpt-pink-1)` | Phone tint email. |
| `--lpt-tint-bank` | `var(--lpt-lilac-2)` | Phone tint bank. |
| `--lpt-btn-bg` | `var(--lpt-lilac-2)` | Phone btn bg. |
| `--lpt-btn-soft-bg` | `var(--lpt-lilac-1)` | Phone btn soft bg. |
| `--lpt-btn-primary-bg` | `var(--lpt-pink-2)` | Phone btn primary bg. |
| `--lpt-btn-text` | `var(--lpt-on-pastel)` | Phone btn text. |
| `--lpt-btn-edge` | `var(--lpt-outline)` | Phone btn edge. |
| `--lpt-btn-hover-mix` | `#ffffff` | Phone btn hover mix. |
| `--lpt-input-bg` | `#f7ecff` | Phone input bg. |
| `--lpt-input-text` | `#420642` | Phone input text. |
| `--lpt-input-placeholder` | `#6a3d85` | Phone input placeholder. |
| `--lpt-input-border` | `var(--lpt-lilac-3)` | Phone input border. |
| `--lpt-pill-bg` | `var(--lpt-blue)` | Phone pill bg. |
| `--lpt-marker-bg` | `var(--lpt-yellow)` | Phone marker bg. |
| `--lpt-pill-text` | `var(--lpt-on-pastel)` | Phone pill text. |
| `--lpt-pill-edge` | `var(--lpt-outline)` | Phone pill edge. |
| `--lpt-badge-bg` | `var(--lpt-hot-pink)` | Phone badge bg. |
| `--lpt-badge-text` | `#ffffff` | Phone badge text. |
| `--lpt-badge-edge` | `var(--lpt-outline)` | Phone badge edge. |
| `--lpt-badge-ring` | `#f7ecff` | Phone badge ring. |
| `--lpt-bubble-in-bg` | `var(--lpt-blue)` | Incoming message bubble background. |
| `--lpt-bubble-in-text` | `var(--lpt-on-pastel)` | Phone bubble in text. |
| `--lpt-bubble-in-border` | `var(--lpt-outline)` | Phone bubble in border. |
| `--lpt-bubble-out-bg` | `var(--lpt-pink-1)` | Outgoing message bubble background. |
| `--lpt-bubble-out-text` | `var(--lpt-on-pastel)` | Phone bubble out text. |
| `--lpt-bubble-out-border` | `var(--lpt-outline)` | Outgoing message bubble border. |
| `--lpt-bubble-muted` | `var(--lpt-on-pastel-soft)` | Phone bubble muted. |
| `--lpt-bubble-radius` | `20px` | Message bubble corner radius; lower sender-side corner is smaller. |
| `--lpt-marker-closed` | `"♡"` | Phone marker closed. |
| `--lpt-marker-open` | `"♥"` | Phone marker open. |
| `--lpt-sparkle-glyph` | `"✦"` | Phone sparkle glyph. |
| `--lpt-empty-glyph` | `"♡"` | Phone empty glyph. |
| `--lpt-marker-color` | `var(--lpt-pink-1)` | Phone marker color. |
| `--lpt-toggle-width` | `52px` | Pill switch width. |
| `--lpt-toggle-height` | `30px` | Pill switch height and thumb size basis. |
| `--lpt-toggle-thumb` | `#ffffff` | Checked switch thumb color. |
| `--lpt-toggle-off-bg` | `#3d2059` | Phone toggle off bg. |
| `--lpt-toggle-off-thumb` | `var(--lpt-lilac-1)` | Phone toggle off thumb. |
| `--lpt-radius` | `14px` | Small corners, following Lumiverse. |
| `--lpt-card-radius` | `20px` | Cards, forms, notices and section corners. |
| `--lpt-icon-radius` | `22px` | Home icon tile corners. |
| `--lpt-frame-radius` | `44px` | Outer phone/window corners. |
| `--lpt-space` | `8px` | Base spacing unit; other gaps are multiples. |
| `--lpt-font` | `ui-rounded, "SF Pro Rounded", "Hiragino Maru Gothic ProN", "Arial Rounded MT Bold", "Varela Round", system-ui, sans-serif` | Font family, inherited from Lumiverse. |
| `--lpt-font-size` | `14px` | Normal text size. |
| `--lpt-small-font-size` | `12px` | Labels, descriptions and markers. |
| `--lpt-title-size` | `19px` | App heading size. |
| `--lpt-location-size` | `24px` | Large Scene location text. |
| `--lpt-weight` | `500` | Normal text weight. |
| `--lpt-strong-weight` | `750` | Heading and emphasized text weight. |
| `--lpt-line-height` | `1.45` | Line spacing multiplier. |
| `--lpt-width` | `356px` | Preferred open-phone width, clamped to screen. |
| `--lpt-height` | `620px` | Preferred open-phone height, clamped to screen. |
| `--lpt-launcher-size` | `50px` | Square launcher size; image fills its height with contained proportions. |
| `--lpt-launcher-min-size` | `50px` | Minimum width and height, preserving the original tap target. Avoid lowering below 44px. |
| `--lpt-launcher-shadow-color` | `rgba(31, 15, 46, 0.6)` | Soft shadow color behind the PNG only. |
| `--lpt-launcher-shadow-blur` | `3px` | Image shadow softness; large values may be clipped at placement edges. |
| `--lpt-launcher-shadow-y` | `2px` | Image shadow vertical offset. |
| `--lpt-icon-size` | `26px` | Icon artwork size. |
| `--lpt-app-image-size` | `44px` | Contained Home app PNG size; sidebar has an independent 22px host style. |
| `--lpt-app-tile-size` | `66px` | Home icon tile width and height; separate from SVG artwork size. |
| `--lpt-icon-stroke-size` | `2px` | Icon line thickness. |
| `--lpt-control-size` | `44px` | Minimum button/input height. |
| `--lpt-border-size` | `2px` | Normal border thickness. |
| `--lpt-card-border-size` | `3px` | Phone card border size. |
| `--lpt-frame-border-size` | `4px` | Outer frame border thickness. |
| `--lpt-focus-size` | `3px` | Keyboard focus outline thickness and offset. |
| `--lpt-opacity-disabled` | `0.55` | Disabled control opacity. |
| `--lpt-grid-columns` | `3` | Home icon columns. |
| `--lpt-max-label-width` | `17rem` | Legacy phone settings label width; sidebar does not use this token. |
| `--lpt-shadow` | `0 5px 0 0 var(--lpt-shadow-hard), 0 16px 26px -10px rgba(10, 3, 20, 0.6), inset 0 4px 0 0 rgba(255, 255, 255, 0.4), inset 0 -3px 0 0 rgba(66, 6, 66, 0.55)` | Layered outer phone shadow and inset frame highlight; does not affect launcher. |
| `--lpt-icon-fill` | `var(--lpt-lilac-2)` | Fallback tile fill; per-app tint rules take priority on Home. |
| `--lpt-transition` | `140ms cubic-bezier(0.22, 1, 0.36, 1)` | Hover, press and switch animation timing. |

Sidebar defaults live on `.lpt-sidebar` in src/sidebar.css. Text, backgrounds
and recovery controls continue to follow the existing host theme sources; pastel
accents have the explicit defaults below. The phone CSS editor cannot reach them.
Changing sidebar defaults requires editing the bundled sidebar stylesheet.

| Variable | Default | What it changes |
| --- | --- | --- |
| `--lpt-side-outline` | `#420642` | Sidebar outline. |
| `--lpt-side-btn-bg` | `#d2aef6` | Fill of Add/Remove buttons and checked chips. |
| `--lpt-side-btn-hover-bg` | `#dec6f6` | Add/Remove button hover fill. |
| `--lpt-side-btn-text` | `#420642` | Text on pastel buttons and checked chips. |
| `--lpt-side-focus` | `var(--lumiverse-accent,#f6de8a)` | Keyboard focus ring, using the host accent. |
| `--lpt-side-bg` | `#19171f` | Opaque sidebar/toolbar background; follows host fill RGB when supported. |
| `--lpt-side-border` | `var(--lumiverse-border,ButtonBorder)` | Sidebar border. |
| `--lpt-side-text` | `var(--lumiverse-text,CanvasText)` | Sidebar text. |
| `--lpt-side-muted` | `var(--lumiverse-text-muted,GrayText)` | Sidebar muted. |
| `--lpt-side-gap` | `6px` | Sidebar gap. |
| `--lpt-side-space` | `10px` | Padding inside the scrolling settings body. |
| `--lpt-side-radius` | `12px` | Sidebar radius. |
| `--lpt-side-font-size` | `12px` | Sidebar font size. |
| `--lpt-side-scope-size` | `10px` | Size of This chat / All my chats scope labels. |
| `--lpt-side-toolbar-icon` | `32px` | Sidebar toolbar icon. |
| `--lpt-side-section-icon` | `24px` | Sidebar section icon. |
| `--lpt-side-app-icon` | `28px` | Sidebar app icon. |
| `--lpt-side-target` | `44px` | Minimum tap-target size. |

## Stable classes

These remain the existing UI hooks, not extra screens or settings. `.lpt-root[data-open="true"]` selects the open phone. Home buttons have `data-app="Scene"` and the other exact app names. Notes sections have `data-section="people"`, `items`, `rules`, `plots` or `misc`. `[open]` selects expanded details. The frame notch and home bar are decorative pseudo-elements, not new controls.

| Class | What it is |
| --- | --- |
| `.lpt-absent` | Legacy selector, no longer emitted; Contacts are flat inline rows. |
| `.lpt-actions` | Inline row of action buttons. |
| `.lpt-add` | Add contact, place or note button. |
| `.lpt-add-draft` | Add to draft button; never sends a message. |
| `.lpt-advanced` | Collapsed Advanced settings. |
| `.lpt-app-button` | A labelled Home app button. |
| `.lpt-app-icon` | Tinted Home tile with currentColor SVG artwork; each app has its own tint variable. |
| `.lpt-app-label` | Text below a Home icon. |
| `.lpt-back` | Back to Home button. |
| `.lpt-button` | General Edit button. |
| `.lpt-cancel` | Cancel an edit or deletion. |
| `.lpt-card` | Shared expandable card frame. |
| `.lpt-card-body` | Expanded card contents. |
| `.lpt-card-subtitle` | Roles, presence or last-seen line. |
| `.lpt-card-title` | Contact or place name. |
| `.lpt-close` | Close phone button. |
| `.lpt-contact` | One character card. |
| `.lpt-contacts` | Contacts app content. |
| `.lpt-content` | Scrollable app area, separate from the outer frame. |
| `.lpt-conversation` | Expandable sender conversation, with data-conversation holding the normalized recipient/sender key. |
| `.lpt-counter` | Notes section count and limit. |
| `.lpt-css-editor` | Live custom CSS text box. |
| `.lpt-custom-css` | Collapsed Custom CSS section. |
| `.lpt-delete` | Delete button and its inline confirmation. |
| `.lpt-description` | Dismissible one-line app explanation. |
| `.lpt-description-text` | Explanation text. |
| `.lpt-dismiss` | Dismiss explanation or saved-data notice. |
| `.lpt-empty` | Honest empty/off/no-chat explanation. |
| `.lpt-error` | Save or CSS error line. |
| `.lpt-field` | Tappable Scene, Weather or Contact field. |
| `.lpt-field-label` | Short field label. |
| `.lpt-field-value` | Field contents. |
| `.lpt-form` | Inline add/edit form. |
| `.lpt-frame` | Outer phone frame; ::before draws the notch and ::after draws the home bar. |
| `.lpt-header` | App heading with back and close buttons. |
| `.lpt-heading` | Current app title. |
| `.lpt-help` | Short form/settings help. |
| `.lpt-helper-connection` | Saved-connection picker, shown for Helper AI. |
| `.lpt-helper-settings` | Tracker source group in the existing Settings app. |
| `.lpt-helper-source` | Main AI / Helper AI selector. |
| `.lpt-home-hint` | Persistent dismissible Home hint directing users to the Phone sidebar. |
| `.lpt-home` | Home icon grid. |
| `.lpt-icon` | SVG icon artwork. |
| `.lpt-icon-path` | Line shapes within the SVG icon. |
| `.lpt-incoming` | Left-aligned incoming message bubble. |
| `.lpt-input` | Single-line text input. |
| `.lpt-island` | Protected host-side holder of the shadow root (not custom-styled). |
| `.lpt-label` | Form input label. |
| `.lpt-launcher` | Transparent native launcher button; minimum 50px target, inside focus ring and overlaid badges. |
| `.lpt-launcher-image` | Embedded 88 x 128 PNG; contained proportions, image-only drop shadow, smooth scaling and no pointer interception. |
| `.lpt-location` | Large exact-location field in Scene. |
| `.lpt-locations` | Locations app content. |
| `.lpt-manual-tag` | Read-only escaped tag for manual copy when composer drafting is unsupported. |
| `.lpt-marker` | Edited, inferred, user-added, Updated or Current marker. |
| `.lpt-messages` | Actual Messages app content. |
| `.lpt-note` | One expandable Notes card. |
| `.lpt-note-full` | Full note text after expansion. |
| `.lpt-note-line` | Single terse note summary, ellipsis if needed. |
| `.lpt-note-section` | One of five Notes sections. |
| `.lpt-notes` | Notes app content. |
| `.lpt-notice` | Dismissible capacity notice. |
| `.lpt-notice-text` | Capacity notice contents. |
| `.lpt-number` | Advanced whole-number input. |
| `.lpt-open-texts` | Contact button opening that sender in Messages, with its unread badge. |
| `.lpt-option` | Theme-colored native picker option. |
| `.lpt-outgoing` | Right-aligned outgoing message bubble. |
| `.lpt-place` | One saved Location card. |
| `.lpt-place-description` | Expanded Location description or relation. |
| `.lpt-present-list` | Names-only Here now list, displayed as small name pills. |
| `.lpt-present-name` | One name pill in Here now. |
| `.lpt-recovery-actions` | Protected sidebar row with Open phone and the single Reset appearance button. |
| `.lpt-recovery-button` | Protected Reset/Open button outside custom styling. |
| `.lpt-recovery-panel` | Protected Phone sidebar recovery entry. |
| `.lpt-recovery-status` | Protected reset/load status text. |
| `.lpt-reply` | Inline conversation reply form. |
| `.lpt-reply-input` | Unsent reply text box. |
| `.lpt-reply-status` | Draft success, unavailable or wrong-chat explanation. |
| `.lpt-resolved` | Collapsed resolved plots group. |
| `.lpt-root` | Single customizable root containing all --lpt- defaults. |
| `.lpt-save` | Save edit button. |
| `.lpt-scene` | Scene app content. |
| `.lpt-section` | Shared spacing for a group. |
| `.lpt-section-body` | Expanded Notes section content. |
| `.lpt-section-header` | Notes heading, counter and Add row. |
| `.lpt-section-title` | Group heading text. |
| `.lpt-setting` | One grouped Settings row. |
| `.lpt-setting-description` | One-line switch/number explanation. |
| `.lpt-setting-label` | Short setting name. |
| `.lpt-setting-text` | Setting label and description together. |
| `.lpt-settings` | Settings app content. |
| `.lpt-settings-group` | One app's group of switches. |
| `.lpt-size-probe` | Invisible preferred-size measurement; normally leave alone. |
| `.lpt-speaker` | Original speaker element, kept for compatibility but hidden by this design. |
| `.lpt-status` | Non-blocking save status. |
| `.lpt-summary` | Expandable card or section heading. |
| `.lpt-text-body` | Actual plain text content, with line breaks preserved. |
| `.lpt-text-list` | Chronological messages within a sender conversation. |
| `.lpt-text-message` | One text with sender, body and optional established time. |
| `.lpt-text-notice` | Brief new-text notice, including when the phone is closed. |
| `.lpt-text-sender` | Sender label in group threads only; outgoing says You. |
| `.lpt-text-time` | Story-supplied text timestamp; absent if unknown. |
| `.lpt-textarea` | Multi-line edit field. |
| `.lpt-toggle` | Native checkbox styled as a pill switch; its checked behavior is unchanged. |
| `.lpt-transport` | Protected host layout wrapper (not custom-styled). |
| `.lpt-unread-badge` | Unread number on Messages, each conversation and Contact Open texts. |
| `.lpt-update-now` | Refresh tracker button in both modes; existing class kept, disabled while busy. |
| `.lpt-refresh-result` | Short refresh result: Refreshed or a safe failure category. |
| `.lpt-viewport` | Protected clipping boundary (not custom-styled). |
| `.lpt-weather` | Weather app content. |
| `.lpt-wider` | Wider location or removed-attire secondary line. |

| Class | What it is |
| --- | --- |
| `.lpt-side-scope` | Small per-chat or all-my-chats scope label. |

## Compact views and portraits (0.11.0)

The portrait and thread rules are grouped at the end of src/styles.css. All new
colors, sizes and spacing tokens are on `.lpt-root`; no inline styles are added.
Phone CSS cannot reach the protected sidebar Reset. Persona image data is never
stored in styles or shared chat data; custom contact portraits are shared chat data.

| Variable | Default | What it changes |
| --- | --- | --- |
| `--lpt-portrait-size` | `42px` | Portrait diameter in Contacts, rows and thread headers. |
| `--lpt-portrait-radius` | `50%` | Portrait shape; 50% is a circle. |
| `--lpt-bubble-max-width` | `85%` | Maximum bubble width within a thread. |
| `--lpt-composer-font-size` | `16px` | Reply text size; defaults to 16px for mobile readability. |
| `--lpt-portrait-text` | `var(--lpt-on-pastel)` | Initial-letter color. |
| `--lpt-portrait-tone-0` | `var(--lpt-lilac-2)` | Name-derived initial palette shade 0. |
| `--lpt-portrait-tone-1` | `var(--lpt-pink-1)` | Name-derived initial palette shade 1. |
| `--lpt-portrait-tone-2` | `var(--lpt-blue)` | Name-derived initial palette shade 2. |
| `--lpt-portrait-tone-3` | `var(--lpt-yellow)` | Name-derived initial palette shade 3. |
| `--lpt-portrait-tone-4` | `var(--lpt-lilac-1)` | Name-derived initial palette shade 4. |
| `--lpt-thread-gap` | `12px` | Space between separate sender groups. |
| `--lpt-bubble-gap` | `3px` | Small gap between consecutive texts from one sender. |
| `--lpt-thread-row-padding` | `10px` | Padding in compact Contacts and conversation rows. |
| `--lpt-composer-max-lines` | `4` | Reply editor visual line limit. |
| `--lpt-composer-padding` | `8px` | Composer and hint padding. |

| Class | What it is |
| --- | --- |
| `.lpt-scene-when` | One compact row for the existing Time and Date fields. |
| `.lpt-contact-copy` | Name, roles and Here now/Last seen text beside a contact portrait. |
| `.lpt-portrait` | Fixed-size portrait circle with safe initial fallback. |
| `.lpt-portrait-initial` | Name initial displayed when no image is available. |
| `.lpt-portrait-image` | Validated raster image, cropped to fill the portrait. |
| `.lpt-portrait-controls` | Portrait preview, Change portrait and Remove in contact edit. |
| `.lpt-portrait-status` | Small Save-to-apply portrait confirmation in contact edit. |
| `.lpt-portrait-file` | Native raster-only file input opened by Change portrait. |
| `.lpt-change-portrait` | Change portrait button. |
| `.lpt-remove-portrait` | Remove custom portrait button. |
| `.lpt-conversations` | Newest-first conversation list. |
| `.lpt-thread-row` | Portrait, name, preview, known time and badge button. |
| `.lpt-thread-copy` | Flexible name/preview area in a list row. |
| `.lpt-thread-preview` | Single line with ellipsis for the latest message. |
| `.lpt-thread-time` | Known story time beside a conversation preview. |
| `.lpt-thread` | Open text thread, laid out above its docked composer. |
| `.lpt-thread-header` | Back, portrait and thread name. |
| `.lpt-thread-back` | Back to Messages list button. |
| `.lpt-thread-name` | Direct contact or established group name. |
| `.lpt-text-continuation` | Tighter spacing for a consecutive text from the same sender. |
| `.lpt-text-date` | Solid separator for an established story date. |
| `.lpt-draft-hint` | Small personal, dismissible no-send explanation above the composer. |
| `.lpt-reply-label` | Compact accessible reply label and growing input. |
| `.lpt-portrait-tone-0` | Deterministic initial-circle palette choice 0; no inline colors. |
| `.lpt-portrait-tone-1` | Deterministic initial-circle palette choice 1; no inline colors. |
| `.lpt-portrait-tone-2` | Deterministic initial-circle palette choice 2; no inline colors. |
| `.lpt-portrait-tone-3` | Deterministic initial-circle palette choice 3; no inline colors. |
| `.lpt-portrait-tone-4` | Deterministic initial-circle palette choice 4; no inline colors. |

Existing classes keep these roles: `.lpt-conversation` is now a list-row button,
`.lpt-reply` is the docked form, `.lpt-reply-input` grows from one to four lines,
`.lpt-text-list` scrolls independently, `.lpt-incoming` aligns left, and
`.lpt-outgoing` aligns right. `.lpt-text-sender` appears only in explicit group
threads. `.lpt-text-time` is small and absent for unknown times. The old
`.lpt-absent` wrapper is no longer emitted; each Contact expands inline.
`.lpt-content[data-thread="true"]` switches only the open thread into a fixed
flex layout so its composer stays below the scrolling bubbles. The native
rows property controls textarea growth without inline styles.

## Story strip and sidebar toolbar (0.12.0)

The phone strip uses `--lpt-strip-size: 12px` and `--lpt-strip-space: 6px` on
`.lpt-root`, plus existing muted text/screen background tokens. It displays the
same Scene cells and switches, with no second saved clock. Home's old title is
hidden; Close stays. All app headings and existing navigation remain.

| Variable | Default | What it changes |
| --- | --- | --- |
| `--lpt-strip-size` | `12px` | Story time/date text size. |
| `--lpt-strip-space` | `6px` | Strip vertical padding on app screens. |

| Class | What it is |
| --- | --- |
| `.lpt-sidebar-mount` | Class on the documented drawer root; removes root padding without host-private selectors. |
| `.lpt-sidebar-scroll` | The only settings scroll area, below toolbar and results. |
| `.lpt-toolbar-button` | Protected native Open/Refresh/Reset button, at least 44px. |
| `.lpt-toolbar-icon` | Embedded 64px PNG displayed at 32px. |
| `.lpt-toolbar-label` | Short action caption shown in narrow drawers. |
| `.lpt-toolbar-tooltip` | Hover/focus action text, bounded to the sidebar width. |
| `.lpt-toolbar-results` | Normal-flow short result line, cleared after five seconds. |
| `.lpt-side-icon` | Decorative embedded section PNG displayed at 24px. |
| `.lpt-side-heading` | Plain one-line section title. |
| `.lpt-store-grid` | Responsive nine-app grid; three, two or one column according to width. |
| `.lpt-toggle-chip` | One native checked-state field chip for an added app. |
| `.lpt-safety-setting` | Existing safety switch with a visible hint underneath. |
| `.lpt-side-numbers` | Two-column Advanced numeric settings layout. |
| `.lpt-side-css-collapse` | Inner collapsed Custom CSS editor inside Appearance. |
| `.lpt-side-css-summary` | Keyboard-accessible Custom CSS editor heading. |
| `.lpt-story-strip` | Single read-only story time/date element; hidden when empty. |

The eight sidebar PNGs add 46,981 raw bytes / 62,828 data-URI characters.
They never load externally and use smooth scaling. On/Off is also visible in
native checkbox glyphs, not color alone. The 44px toolbar and native title bar
are separate from the scrolling content; result messages occupy their own line.
At drawer widths below 340px, action captions appear; below 240px the toolbar can
wrap to two columns, keeping targets and labels. The app grid becomes one column
below 220px, so narrow drawers may scroll. The protected Reset never scrolls away.
Phone custom CSS cannot recolor these sidebar elements; change src/sidebar.css
to change the bundled sidebar defaults. No extra appearance settings are added.

## Emoji (0.13.0)

The original PNG cells retain their RGBA transparency. Only the picker surface
gets a solid existing card background. Inline images use nearest-neighbor pixel
scaling; no external image, background or inline style is introduced. Unknown
shortcodes stay text. Editors/CSS input remain literal, not image-rendered.

| Variable on .lpt-root | Default | What it changes |
| --- | --- | --- |
| `--lpt-emoji-size` | `24px` | Inline emoji display size. |
| `--lpt-emoji-picker-size` | `32px` | Emoji image size inside picker choices. |
| `--lpt-emoji-picker-max` | `260px` | Picker scroll-window maximum height, also bounded by thread space. |
| `--lpt-emoji-gap` | `4px` | Picker/control padding and grid gaps. |

| Class | What it is |
| --- | --- |
| `.lpt-emoji` | Safe static PNG substituted for a known shortcode; transparent, pixelated scaling. |
| `.lpt-emoji-toggle` | Choose emoji button next to Add to draft. |
| `.lpt-emoji-picker` | Opaque nonmodal, scrollable picker above the composer. |
| `.lpt-emoji-header` | Picker title, current name tooltip and Close. |
| `.lpt-emoji-title` | Plain Emoji heading. |
| `.lpt-emoji-close` | Close picker control. |
| `.lpt-emoji-grid` | Responsive grid of minimum 44px choices. |
| `.lpt-emoji-option` | One named emoji button, with data-emoji set to the exact name. |
| `.lpt-emoji-tooltip` | Current hovered/focused name in the picker header; never clipped at cell edges. |

The composer now has input, Emoji and Add to draft columns. The thread is a size
container so the picker can be bounded without inline styles. Its surface uses
--lpt-card-bg and existing border/focus tokens; protected sidebar Reset is unchanged.

## Copy-paste examples

Change the main accent and the Messages Home tint:

```css
.lpt-root {
  --lpt-accent: #78c6b2;
  --lpt-accent-text: #102521;
  --lpt-tint-messages: #78c6b2;
  --lpt-btn-primary-bg: #78c6b2;
  --lpt-badge-bg: #78c6b2;
}
```

The repeat-count editor reuses `.lpt-form`, `.lpt-label` and `.lpt-input`; the direction/count label reuses `.lpt-call-direction`. No new class is needed for counts.

App tints are independent. Change their --lpt-tint- variables to recolor other Home icons; --lpt-accent controls general accents; buttons and badges have their own color variables. Legacy Lucide geometry remains attributed; current Home/App Store art uses the supplied PNGs. [Icon attribution](THIRD-PARTY-NOTICES.md).

Make the phone bigger:

```css
.lpt-root {
  --lpt-width: 390px;
  --lpt-height: 700px;
}
```

Give it a desktop-window look and hide the decorative hardware:

```css
.lpt-root {
  --lpt-width: 640px;
  --lpt-height: 480px;
  --lpt-frame-radius: 10px;
  --lpt-frame-border-size: 1px;
}
.lpt-frame::before,
.lpt-frame::after { display: none; }
```

Ordinary rules, @media and @supports work. Imports, linked images, font downloads, CSS escape sequences and other at-rules are rejected. An unfinished rule leaves the last working style active and shows a short error. Browsers may silently ignore an unknown property. The protected sidebar Reset stays available if your rules hide the phone.

The protected wrapper receives explicit measured placement bounds independently of the host root's height. Only those numeric bounds are emitted into an instance-scoped rule; appearance defaults stay in styles.css. The original speaker element remains hidden for compatibility. Existing recovery behavior and the zero-height-mount fix are retained. [Recovery details](docs/FIX-0.4.2.md).

## 0.14.0: personal presets and prompt wording

These controls are in `src/sidebar.css`, outside the phone's custom-CSS island.
They reuse the documented `--lpt-side-*` defaults; no phone variable was added.
Presets reuses the embedded Advanced icon. All new buttons retain visible focus
and the sidebar's tap-target size. Long Preview text wraps and scrolls inside its box.

| Stable class | What it styles |
| --- | --- |
| `lpt-side-presets` | Collapsed Presets section, alongside the existing sections. |
| `lpt-personal-presets` | Personal preset dropdown and actions. |
| `lpt-personal-row` | Wrapping action row for narrow sidebars. |
| `lpt-personal-button` | Apply, save, rename, delete, copy, reset and Preview buttons. |
| `lpt-personal-label` | Plain label above a name input. |
| `lpt-personal-input` | Preset or wording name input. |
| `lpt-personal-select` | Preset, AI target or wording dropdown. |
| `lpt-preset-confirm` | Inline Apply confirmation, in normal flow. |
| `lpt-personal-status` | Short saved/error result, plain text. |
| `lpt-wording` | Nested collapsed Prompt wording section in Advanced. |
| `lpt-wording-editor` | Plain-text wording editor, read-only for Default. |
| `lpt-wording-warning` | Missing/extra syntax or fallback explanation. |
| `lpt-wording-count` | Character count and labelled rough token estimate. |
| `lpt-wording-preview` | Exact rendered prompt text; no HTML or emoji replacement. |

Custom phone CSS cannot reach these controls or the protected toolbar Reset.
The phone screens and all existing opaque surfaces are unchanged.
