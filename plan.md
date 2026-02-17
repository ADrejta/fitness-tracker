# Sketch/Notebook Redesign Plan

## Aesthetic Vision
Transform the fitness tracker into a **hand-drawn notebook** experience. Paper textures, handwriting fonts, ink-like colors, sketchy wobbly borders, ruled lines, and a chalkboard dark mode. Every element should feel like it was drawn with pen on paper.

## Key Design Decisions

### Fonts (Google Fonts)
- **Display/Headings**: `Caveat` — bold, expressive handwriting
- **Body text**: `Patrick Hand` — legible everyday handwriting
- **Mono/numbers**: `Architects Daughter` — technical hand-lettering feel

### Color Palette

**Light (Notebook)**
- Background: `#f5f0e8` (aged paper)
- Surface: `#faf7f0` (fresh paper)
- Border: `#c4b99a` (pencil lines)
- Text: `#2a2522` (dark ink)
- Text secondary: `#6b5e50` (faded ink)
- Primary: `#2b5ea7` (fountain pen blue)
- Success: `#3a7d44` (green pencil)
- Danger: `#c23b22` (red pencil)
- Warning: `#c67f17` (amber pencil)

**Dark (Chalkboard)**
- Background: `#1b2b1b` (dark green slate)
- Surface: `#243524` (chalkboard surface)
- Border: `#4a6a4a` (chalk dust)
- Text: `#e8e4d4` (chalk white)
- Primary: `#6ba3d6` (blue chalk)
- Success: `#7bc47f` (green chalk)
- Danger: `#e07060` (red chalk)

### Sketch Effects
- **Wobbly borders**: `border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px` — creates hand-drawn rectangle illusion
- **No box-shadows** — notebooks are flat; replace with slightly thicker pencil borders
- **Ruled lines** — subtle repeating horizontal lines on backgrounds via CSS gradient
- **Notebook margin** — red vertical line on the left side of page container
- **Paper texture** — subtle noise via CSS gradient overlay

## Files to Modify (in order)

### 1. `frontend/src/styles/_variables.scss`
- Replace entire color palette with notebook/ink colors
- Change font-family to handwriting fonts
- Replace border-radius values with sketch-appropriate values
- Replace shadows with none/minimal
- Add new custom properties for sketch effects (--sketch-border-radius, --paper-lines, etc.)

### 2. `frontend/src/styles.scss`
- Replace Google Fonts import with Caveat + Patrick Hand + Architects Daughter
- Add paper texture background (CSS gradient with subtle noise)
- Add ruled-lines background pattern on body
- Update skeleton loading to use pencil-sketch animation
- Update selection colors to ink-like

### 3. `frontend/src/styles/_mixins.scss`
- Update `@mixin card` — sketchy border-radius, thicker borders, no shadow
- Update `@mixin card-raised` — same but with slight rotation
- Update `@mixin input-base` — underline style instead of bordered box, or pencil-drawn border
- Add `@mixin sketch-border` — reusable wobbly border
- Add `@mixin paper-lines` — ruled line background
- Update `@mixin custom-scrollbar` — pencil-style scrollbar

### 4. Shared Components

**card.component.scss** — Sketchy border-radius, pencil-line borders, paper surface, no shadows. Interactive hover: slight tilt/rotation instead of shadow lift.

**button.component.scss** — Hand-drawn button shapes (wobbly radius), ink colors, underline hover effect. Primary = filled with pen blue. Secondary = pencil outline.

**badge.component.scss** — Circle/oval hand-drawn shapes, lighter fills that look like colored pencil.

**input.component.scss** — Underline-style inputs (like writing on a ruled line), handwriting placeholder text, pencil focus state (thicker underline instead of glow).

**modal.component.scss** — Paper-note appearance, torn-edge top (via pseudo-element), no blur backdrop (just darkened), pencil-drawn close button.

**toast.component.scss** — Sticky-note appearance, slight rotation, pencil-drawn border.

**tabs.component.scss** — Underlined text with hand-drawn indicator (wavy underline via SVG or border).

**empty-state.component.scss** — Faded pencil sketch style icons.

### 5. Layout Components

**header.component.scss** — Notebook top margin with pencil line border-bottom, paper background, hand-drawn logo area.

**navigation.component.scss** — Torn paper edge at top (via pseudo-element or border-image), paper background, hand-drawn active indicator.

**page-container.component.scss** — Red margin line on left, ruled horizontal lines background, paper padding.

### 6. Feature Pages (targeted updates)

Most feature pages will inherit the new look from the global variables and shared components. Targeted updates needed for:

- **history.component.scss** — Calendar cells with sketch borders, hand-drawn dots
- **workout.component.scss** — Timer with handwriting font, sketchy exercise cards
- **statistics.component.scss** — Chart bars with pencil-fill look, hand-drawn grid lines
- **home.component.scss** — Welcome section with notebook title style
- **settings.component.scss** — Toggle switches with sketch style
- **auth (login/register)** — Notebook-page card appearance

## Verification
1. `ng build` — no errors
2. Light mode: paper/notebook feel with ink colors and ruled lines
3. Dark mode: chalkboard feel with chalk colors
4. All interactive elements (buttons, cards, inputs) have sketchy hand-drawn borders
5. Fonts render correctly (Caveat for headings, Patrick Hand for body)
6. Mobile navigation has paper/notebook feel
