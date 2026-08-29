---
name: Vibrant Enterprise
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daea'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eefe'
  surface-container-high: '#e2e8f8'
  surface-container-highest: '#dce2f3'
  on-surface: '#151c27'
  on-surface-variant: '#574335'
  inverse-surface: '#2a313d'
  inverse-on-surface: '#ebf1ff'
  outline: '#8b7262'
  outline-variant: '#dec1af'
  surface-tint: '#944a00'
  primary: '#944a00'
  on-primary: '#ffffff'
  primary-container: '#ff8400'
  on-primary-container: '#5f2e00'
  inverse-primary: '#ffb784'
  secondary: '#4f5d88'
  on-secondary: '#ffffff'
  secondary-container: '#c0cdff'
  on-secondary-container: '#495681'
  tertiary: '#5b5f5f'
  on-tertiary: '#ffffff'
  tertiary-container: '#a2a6a5'
  on-tertiary-container: '#383c3b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc6'
  primary-fixed-dim: '#ffb784'
  on-primary-fixed: '#301400'
  on-primary-fixed-variant: '#713700'
  secondary-fixed: '#dbe1ff'
  secondary-fixed-dim: '#b7c5f6'
  on-secondary-fixed: '#091941'
  on-secondary-fixed-variant: '#38456f'
  tertiary-fixed: '#e0e3e2'
  tertiary-fixed-dim: '#c4c7c6'
  on-tertiary-fixed: '#181c1c'
  on-tertiary-fixed-variant: '#434847'
  background: '#f9f9ff'
  on-background: '#151c27'
  surface-variant: '#dce2f3'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 32px
  xl: 48px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style

This design system embodies an energetic yet professional persona, tailored for sales and productivity environments. It balances a high-trust, corporate foundation with high-energy accents to keep users engaged and motivated.

The visual style is **Corporate / Modern** with a focus on tonal layering and high-impact accents. It uses deep navy surfaces to establish authority and reliability, contrasted against clean white "sheets" for data entry and content consumption. The primary orange accent provides an immediate call to action, driving the user's eye toward critical path interactions. The overall emotional response should be one of efficiency, clarity, and momentum.

## Colors

The palette is driven by strong tonal contrast. 

- **Primary (#FF8400):** Used exclusively for high-priority actions, primary buttons, and active state indicators.
- **Secondary (#1D2B53):** Used for headers, brand backgrounds, and primary text on light backgrounds to ensure maximum legibility and professional weight.
- **Tertiary/Surface (#F4F7F6):** A soft, cool-gray used for the main application background to reduce eye strain compared to pure white.
- **Surface High (#FFFFFF):** Pure white is reserved for foreground cards, input fields, and containers that need to pop against the tertiary background.
- **Semantic Colors:** Success states utilize a vibrant green, while error states use a clear, bright red, both following the saturation levels of the primary orange.

## Typography

The system utilizes **Inter** for its exceptional legibility and systematic feel. 

Typography is utilized to create clear information hierarchies:
- **Headlines:** Use Semi-Bold or Bold weights (600-700) to anchor sections. On dark backgrounds, these should be pure white.
- **Body Text:** Primarily uses the Medium (400) weight for long-form readability.
- **Labels:** Use Medium to Semi-Bold weights to differentiate from body text, often used for input headers or secondary metadata.
- **Tight Leading:** Line heights are kept relatively tight to maintain the "dense but clean" professional look required for sales dashboards.

## Layout & Spacing

This design system uses a **Fluid Grid** model for mobile and a **Fixed Grid** (max-width 1280px) for desktop environments.

- **Grid:** A 4-column grid for mobile and 12-column grid for desktop.
- **Margins:** 20px side margins on mobile to provide breathing room for the soft-rounded cards.
- **Rhythm:** An 8px base unit (4px for micro-adjustments) governs all padding and margins to ensure visual harmony.
- **Structure:** Content is organized in "Sheets" or "Cards" that sit on top of the global background. Large header sections often bleed to the top and sides of the device, creating a distinct "Anchor" for the screen.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layering** rather than heavy shadows.

- **Level 0 (Background):** Tertiary color (#F4F7F6).
- **Level 1 (Cards/Sheets):** Pure white (#FFFFFF) with a subtle, very diffused shadow (Y: 4px, Blur: 12px, Opacity: 4% Black). 
- **Level 2 (Active Elements):** Primary orange (#FF8400) or Secondary Navy (#1D2B53).
- **Contrast Outlines:** Input fields and secondary buttons use a 1px border (#E5E7EB) to define their boundaries without adding visual weight.
- **Header Depth:** The secondary navy header acts as a physical anchor; when content scrolls beneath it, it maintains its position at the highest Z-index.

## Shapes

The shape language is defined by **Rounded** corners that soften the corporate aesthetic.

- **Primary Components:** (Buttons, Inputs, Cards) use a standard radius of **16px** to **20px**.
- **Large Containers:** Bottom sheets and main content cards use a **32px** radius on top corners when transitioning from a full-bleed header.
- **Icons:** Should follow a similar soft-cornered geometry (2px to 4px inner radii) to match the container language.

## Components

### Buttons
- **Primary:** Full-width orange (#FF8400) with white text, 16px border-radius, and bold typography.
- **Secondary:** Outline or light-gray background with navy text for less critical actions.

### Input Fields
- **Styling:** White background, 1px light gray border, 12px-16px border-radius.
- **States:** Active states should highlight the border in the primary orange color. Error states use a red border and a small helper text below.

### Cards
- **Structure:** White background, 20px border-radius.
- **Grid Cards:** For dashboards, cards are typically 2-column or 1-column layout with centered or left-aligned icons and prominent numeric data.

### Progress & Status
- **Chips:** Small, rounded capsules (pill-shaped) with background colors reflecting status (e.g., Orange for "Active," Gray for "Inactive").

### Navigation
- **Bottom Bar:** Simple, clean icons with the primary color used for the active state indicator. A light-gray top border or very subtle shadow separates it from the main content.