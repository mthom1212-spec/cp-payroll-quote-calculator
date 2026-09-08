# Quote Studio — reusable design recipe

## Open this design

Double-click `exports/Quote-Studio.html` to open the working interface in Edge or Chrome. The file embeds the application, CSS, SVG icon and fonts. No Blender, server, Node installation or internet connection is required to use this exported copy. The earlier-preview link goes to GitHub and needs internet access.

This is a snapshot of the preview, not an automatically updating production application. It includes the current pricing calculations and options. Saved drafts belong to this copy's browser storage; they are not imported from the live application. Browser handling of storage for local files varies, so save important quotes as PDFs. Moving the file or changing browsers may make previously saved drafts unavailable.

To regenerate the file after editing the source, run from this branch with Node installed:

```sh
npm ci
npm run build
node scripts/export-studio.mjs
```

The editable source is on GitHub in `codex/quote-studio`. The generated HTML is an export; use the source components for future development.

## Visual direction

A calm, professional financial-services workspace. White cards sit on a pale cool-gray canvas, framed by a deep navy navigation rail. Warm gold accents mark emphasis and selection. Serif headings provide personality; sans-serif controls and aligned figures keep quoting clear. Depth comes from borders, soft shadows, subtle gradients and faint concentric outlines, all rendered in CSS. Icons are simple SVG outlines. No 3D assets or Blender are used.

### Color palette

| Role | Color | Use |
| --- | --- | --- |
| Sidebar | `#063749` | Fixed navigation rail |
| Primary navy | `#003E57` | Brand emphasis |
| Primary action | `#064C68` | Main buttons |
| Main text | `#123E51` | Headings and controls |
| Gold | `#B28B57` | Warm accents |
| Focus ring | `#B58C50` | Keyboard focus |
| Canvas | `#F5F7F7` | Workspace background |
| Surface | `#FFFFFF` | Cards, panels and paper |
| Border | `#DFE5E5` | Quiet separation |
| Secondary text | `#6A7C83` | Supporting information |
| Selected outline | `#779EB0` | Selected service cards |
| Document total | `#104C66` | Total row with white text |

### Typography

- **DM Sans:** body, controls, table labels and primary totals; regular through bold weights.
- **Source Serif 4:** page titles, brand treatment and editorial headings; typically medium weight.
- Main title: responsive 30–42 px. Section headings: 15–18 px. Main live total: approximately 42 px. Body: 12–14 px. Small labels: 10–11 px; very small uppercase labels reserved for secondary metadata.
- Currency uses tabular numerals and right alignment in tables. Keep amounts and billing units visually connected.
- Fonts are served locally under their included SIL Open Font Licenses. No external font API is necessary.

### Layout and depth

- Optimize for work laptops, especially 1280, 1440 and 1920 px widths.
- Fixed 208 px navy sidebar; 76 px top bar; content inset around 36 px; central workspace maximum width 1620 px.
- Keep the hero stationary in normal page flow.
- Place a compact client brief below the title: company, active employees, pay frequency and Client details.
- Below it, use a flexible catalog plus an approximately 310 px live-estimate column with a 26 px gap.
- Service cards use two columns; payroll gets a full-width featured card. Borders around 1 px, corners around 10–11 px, generous interior padding and restrained shadows.
- A selected card gains a blue outline and explicit Added state. Selection must also be communicated through text and accessible state, not color alone.
- Detail panels are native modal dialogs, approximately 510 px wide, attached to the right edge with a dimmed background. Escape closes them and focus returns to the trigger.

## Interaction structure

1. **Build quote:** four catalog tabs — Core modules, Recurring add-ons, Specialty services, Usage-based. Search works across the catalog. Selected-only filtering simplifies review.
2. **Details & pricing:** show included services and only the applicable count, setup, override and exclusion controls. Keep advanced fields out of the initial catalog view.
3. **Client details:** W-2 and 1099 counts, representative contact information and owner-only S-Corp mode. Keep the uncommon scenario accessible here.
4. **Live estimate:** distinguish recurring fees, one-time fees, annual processing and annual recurring revenue. Show units explicitly and avoid combining different billing schedules into a misleading total. Give selection changes an Undo action.
5. **Document preview:** audience selector for Client proposal / Internal sales, document section navigation, then Print / Save PDF. The quote is the focal point of this view.
6. **Saved quotes:** named local drafts with clear saved/unsaved status, overwrite confirmation, reopen and delete controls. No implied team synchronization or autosave.
7. **A quick tour:** concise help in a panel, focused on finding controls and understanding overrides.

## Printed output

Use white paper, a thin navy top rule, compact serif headings, pale employee/frequency panels, aligned table columns and a navy total row. Preserve the established quote content and section order. Keep application navigation and editors out of print. Allow long pricing estimates to continue naturally, then start the annual recap/rate sheet and included-services sections separately. Keep service groups together when they fit; avoid orphaned footer pages. Owner-only S-Corp output may consolidate onto one page when it fits. Never scale text to illegibility simply to meet a page count.

## Prompt to recreate this design in another coding tool

Copy the following prompt, or ask the tool to read this file:

> Recreate the Quote Studio design described in DESIGN_RECIPE.md as a working React interface. Use this repository's existing pricing engine, constants, state and document content as the source of truth. Preserve all pricing, count routing, frequencies, minimums, discounts, exclusions, overrides, annual processing, S-Corp behavior and service options. Implement the navy sidebar, stationary editorial heading, compact client brief, searchable tabbed catalog, detailed service side panels, live estimate, saved-quotes library and client/internal document preview. Use DM Sans and Source Serif 4, the specified navy/gold palette, white cards on a cool-gray background, thin borders, restrained shadows and simple SVG icons. Create visual depth using CSS; do not require Blender, 3D rendering, image-generation services or a backend. Keep keyboard navigation, focus management, clear billing units and readable print pagination. Use src/components/studio and studio-model.js as the reference implementation when available. Keep changes isolated from production. Validate existing pricing tests, representative UI interactions, saved-quote behavior and printed samples with few and many services before presenting the preview. Report what changed and any remaining limitations.

## Source map

| File | Responsibility |
| --- | --- |
| `src/components/studio/QuoteStudio.jsx` | Workspace, navigation, catalog, estimate and saved quotes |
| `src/components/studio/studio.css` | Layout, palette, typography, responsive and print styling |
| `src/components/studio/Editors.jsx` | Client, pricing, service and help panels |
| `src/components/studio/Drawer.jsx` | Modal panel behavior |
| `src/lib/studio-model.js` | Existing pricing mapped to catalog presentation |
| `src/components/QuoteDocuments.jsx` | Shared document content |
| `src/lib/pricing-calc.js` | Pricing calculations — preserve |
| `src/constants/pricing.js` | Services and rates — preserve |
| `public/fonts/` | Local fonts and licenses |
| `scripts/export-studio.mjs` | Rebuild the single-file HTML export |
