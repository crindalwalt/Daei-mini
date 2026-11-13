# Daei Mini — User React Dashboard UI Specification

## 1. Purpose and scope

This document describes the supplied **Daei Mini User Dashboard** screenshot as a visual and functional implementation reference for the React frontend team.

- **Product:** Daei Mini
- **Portal:** User Portal
- **Screen:** User Dashboard
- **Screen number in the full UI showcase:** 5
- **Platform:** React Web
- **Reference image:** `daei_mini_user_dashboard.png`
- **Reference image dimensions:** 462 × 206 px

The dashboard is a desktop web page with a persistent left sidebar, a slim top header, a welcome banner with Islamic mosque artwork, four summary metric cards, a Progress Overview chart and a Today's Plan card.

The supplied image is a small, compressed crop. The overall layout and main labels are visible, but some small supporting text, exact metric captions, chart labels and activity values are not fully legible. Where exact copy cannot be confidently read, this document describes the intended component without inventing exact text.

## 2. Design direction

The User Portal must visually match the approved Daei Mini brand language:

- Calm, welcoming and clean.
- Islamic-inspired but not visually crowded.
- Warm ivory/cream page background.
- Forest-green primary colour.
- Pale sage surfaces and mosque illustrations.
- White rounded cards with thin warm borders.
- Soft shadows and generous spacing.
- Modern sans-serif interface typography.
- Elegant serif lettering for the Daei Mini wordmark.

Keep the User Portal consistent with the Admin Portal's branding, but retain user-focused navigation and personal information. Do not display admin-only management controls in the User Portal.

## 3. Colour palette

The following HEX values are close visual estimates from the supplied screenshot. They are suggested implementation tokens, not confirmed official brand specifications. If the project already has approved brand tokens, use those values instead.

| Colour token | HEX | Where to use it |
|---|---|---|
| Primary forest green | `#12683D` | Active sidebar item, primary buttons, chart bars and progress fills |
| Deep brand green | `#145B3A` | Logo wordmark, headings and important labels |
| Secondary green | `#31945A` | Chart bars, progress accents and positive indicators |
| Pale sage | `#E7F1E4` | Welcome banner, selected surfaces and decorative backgrounds |
| Light sage | `#D5E6D1` | Mosque artwork, progress tracks and subtle highlights |
| Warm ivory | `#F7F6EF` | Main application canvas and sidebar |
| White | `#FFFFFF` | Cards, header and input surfaces |
| Warm border | `#E8E7DD` | Card outlines, dividers and input borders |
| Main text | `#25332D` | Main labels, headings and metric values |
| Muted text | `#7B857E` | Supporting labels and metadata |
| Success green | `#25834B` | Completion and positive progress |
| Purple | `#8660C9` | Groups metric icon tile |
| Orange | `#E99A32` | Activities metric icon tile |
| Blue | `#398FD0` | Reports metric icon tile |
| Alert red | `#D94B45` | Unread notification dot or warning state |

Use the accent colours only for their relevant metric or status category. Green remains the dominant brand colour.

## 4. Typography

- **Daei Mini wordmark:** Elegant serif-style lettering, matching the supplied logo.
- **Page greeting:** Bold, clear sans-serif.
- **Section titles:** Semibold sans-serif.
- **Metric values:** Large bold numerals.
- **Activity names:** Medium-weight sans-serif.
- **Supporting information:** Smaller muted sans-serif.

Keep text compact but readable. Do not shrink labels so far that they become difficult to read at normal desktop zoom.

## 5. Application layout

The dashboard has three main horizontal areas:

1. Persistent left sidebar.
2. Top header across the main content area.
3. Main dashboard content.

The main content order is:

1. Welcome banner.
2. Four summary metric cards.
3. Two-column lower section:
   - Progress Overview on the left.
   - Today's Plan on the right.

Use a consistent gap between cards and comfortable internal padding.

## 6. Left sidebar

### Brand block

At the top of the sidebar, center the following:

- Daei Mini green logo mark.
- Daei Mini wordmark.
- Small `USER PORTAL` subtitle.

Use the project's approved logo asset. Do not substitute a generic mosque or book icon for the brand mark.

### Navigation menu

The visible sidebar menu contains these sections:

| Navigation label | Icon concept | Suggested route |
|---|---|---|
| Dashboard | Home | `/user/dashboard` |
| Calendar & Planner | Calendar | `/user/planner` |
| Activities | Checklist/list | `/user/activities` |
| Habits | Target/habit | `/user/habits` |
| Goals | Flag/target | `/user/goals` |
| Reports | Document | `/user/reports` |
| Library | Open book | `/user/library` |
| Health & Fitness | Heart/activity | `/user/health` |
| Self-Assessment | Clipboard/check | `/user/self-assessment` |
| Settings | Gear | `/user/settings` |

The labels and route suggestions should be checked against the approved product sitemap before implementation.

### Active and inactive states

**Dashboard active state**
- Forest-green filled rounded rectangle.
- White home icon.
- White Dashboard label.

**Inactive states**
- Transparent or very pale background.
- Muted dark-green icon and label.
- Consistent spacing and alignment.

The sidebar should remain visually quiet and should not compete with the main content.

## 7. Top header

The header is a slim horizontal bar above the main content.

### Search

- Rounded search input.
- Magnifying-glass icon on the left.
- Short placeholder such as `Search for tasks...`.
- White or very pale surface.
- Thin warm-gray border.

Search results must be restricted to information the signed-in user is allowed to access.

### Right-side controls

The right side contains:

1. Notification bell.
2. Small red unread indicator dot, when unread notifications exist.
3. Circular user avatar.
4. User display name.
5. Dropdown chevron.

The avatar/name control should open the user profile menu. The bell should open the user's notifications.

## 8. Welcome banner

The welcome banner spans the available main content width and appears directly below the top header.

### Text

- Main greeting: **Welcome Back, Hamza!**
- Supporting line: A short encouraging message below the greeting. The exact small text is not fully legible in the supplied reference.

The displayed name must be dynamic and come from the signed-in user's profile. Do not hardcode `Hamza` for every user.

### Background and mosque artwork

This banner is an important part of Daei Mini's visual identity:

- Use a pale sage and warm ivory background.
- A subtle gradient may be used.
- Place a soft mosque skyline on the **right side**.
- The artwork should include mosque domes, minarets and greenery.
- Use low-contrast pale green tones.
- Keep the greeting on the **left side**.
- Add a very subtle Islamic geometric or botanical texture if the approved artwork includes it.
- Use rounded corners and a soft border/shadow.

The mosque illustration should be a separate image/SVG asset, not a flattened background screenshot. It must scale and reposition cleanly on smaller screens.

## 9. Summary metric cards

Four metric cards appear in a single horizontal row beneath the welcome banner on desktop.

Each card includes:
- A pastel icon tile.
- A small metric label.
- A large bold value.
- A small supporting indicator below or beside the value.

### Cards visible in the reference

| Card | Sample value | Icon treatment |
|---|---:|---|
| Total Users | 248 | Users icon on pale green |
| Total Groups | 18 | Group/users icon on pale purple |
| Total Activities | 1,142 | Activity/calendar icon on pale orange |
| Total Reports | 92 | Document icon on pale blue |

### Card styling

- White background.
- Rounded corners.
- Thin warm-gray border.
- Very soft shadow.
- Pastel rounded-square or circular icon container.
- Large dark text for the metric value.

**Product decision to confirm:** These labels resemble organization-level metrics. Confirm whether the User Dashboard should show these exact aggregate counts, or whether they should be replaced by personal metrics such as My Activities, My Habits, My Goals and My Reports. The frontend team should not assume that a normal user is allowed to see organization-wide totals.

## 10. Progress Overview

The Progress Overview card appears in the lower-left part of the dashboard.

### Header

- Small green progress/analytics icon.
- Title: **Progress Overview**.
- A small icon/action at the upper-right is visible in the screenshot. Its exact function is unclear at this resolution; confirm whether it opens a detailed progress page or is only a visual control.

### Chart

The reference shows a vertical bar chart:

- Green bars with softly rounded tops.
- Light horizontal grid lines.
- Small muted axis labels.
- Compact labels beneath the bars.
- A short period label near the bottom of the card; exact wording is not legible.

### Data and behaviour

- Use actual progress records returned by the backend.
- Define clearly what the chart measures: daily activity completion, habit completion, or another approved progress metric.
- Use a consistent time range, such as the current week, if confirmed by product requirements.
- Provide a readable accessible summary of the chart values.
- Show loading, empty and error states.

Do not hardcode chart bars or invent a progress calculation in the UI.

## 11. Today's Plan

The Today's Plan card appears in the lower-right part of the dashboard.

### Header

- Title: **Today's Plan**.
- A small green action appears at the upper-right. It resembles a View/See All action, but the exact text is not fully legible in the supplied image.

Recommended behaviour: the action opens the full Daily Schedule page.

### Activity rows visible

| Activity | Icon concept | Progress presentation |
|---|---|---|
| Read Quran | Quran/book | Green horizontal progress bar |
| Exercise | Exercise/activity | Green horizontal progress bar |
| Drink Water | Water drop | Green horizontal progress bar |

Each row should contain:
- A small pastel icon tile.
- Activity name.
- Horizontal progress indicator.
- A right-aligned value, time or completion status.

The exact numeric values shown in the compressed screenshot are not reliably readable. Use actual user data rather than copying uncertain values.

### Behaviour

- Show activities scheduled for the current date.
- Display each activity's current progress or completion state.
- Clicking an activity may open its detail or completion view.
- The card's View/See All action should open the complete Daily Schedule.
- If no activities are scheduled, show a friendly empty state and a clear action to open the planner or add an activity.

## 12. Interactions and navigation

| Element | Expected behaviour |
|---|---|
| Dashboard | Opens the User Dashboard |
| Calendar & Planner | Opens the user's calendar/planner |
| Activities | Opens activities or daily schedule |
| Habits | Opens habit tracking |
| Goals | Opens personal goals |
| Reports | Opens the user's report history |
| Library | Opens the user's digital library |
| Health & Fitness | Opens the user's health and fitness area |
| Self-Assessment | Opens self-assessment |
| Settings | Opens user settings |
| Search | Searches permitted user-owned content |
| Notification bell | Opens user notifications |
| Avatar/name | Opens profile menu |
| Today's Plan action | Opens the full Daily Schedule |
| Progress Overview action | Opens detailed progress, if this control is confirmed as interactive |

Every visible control must have a defined action. Avoid controls that look interactive but do nothing.

## 13. Data, privacy and permissions

- Personal activities, habits, goals, reports and progress must be scoped to the authenticated user.
- Do not expose another user's private activity, journal, health, habit or report information.
- Use backend API responses for metric values, chart values and Today's Plan rows.
- Treat all numbers and names in the reference screenshot as sample content until confirmed.
- Confirm the meaning and permissions of the four metric cards with the product owner.
- Do not hardcode the example name `Hamza`; load the user's display name from their profile.

## 14. Responsive behaviour

### Desktop
- Persistent left sidebar.
- Horizontal top header.
- Four metric cards in one row.
- Progress Overview and Today's Plan side by side.

### Tablet
- Sidebar may collapse to icon-only mode or a drawer.
- Metric cards may wrap into two columns.
- Lower cards may stack if the available width is limited.

### Mobile
- Use drawer navigation.
- Stack the welcome banner, metric cards, Progress Overview and Today's Plan vertically.
- Keep the mosque illustration secondary to the greeting.
- Prevent horizontal overflow.
- Ensure chart labels and plan rows remain readable.

## 15. Suggested React component structure

Suggested components:

- `UserLayout`
- `UserSidebar`
- `UserSidebarNavItem`
- `UserTopHeader`
- `UserSearch`
- `WelcomeBanner`
- `UserMetricCard`
- `ProgressOverviewCard`
- `ProgressBarChart`
- `TodaysPlanCard`
- `ActivityProgressRow`

Suggested route:

`/user/dashboard`

Keep the components reusable so other User Portal pages can share the same layout, navigation, typography, buttons, card styles and colour tokens.

## 16. Implementation checklist

- [ ] Use the approved Daei Mini logo and `USER PORTAL` label.
- [ ] Use the warm ivory and forest-green brand palette.
- [ ] Build the left sidebar with the correct user navigation.
- [ ] Highlight Dashboard as the active item.
- [ ] Build the top search/header area.
- [ ] Add notification bell and user profile menu.
- [ ] Build the greeting banner with pale sage mosque artwork on the right.
- [ ] Build the four metric cards with pastel icon backgrounds.
- [ ] Build the Progress Overview chart using API data.
- [ ] Build Today's Plan with activity icons and progress indicators.
- [ ] Connect all navigation and card actions.
- [ ] Enforce user-level data permissions.
- [ ] Add loading, empty and error states.
- [ ] Test desktop, tablet and mobile layouts.

## 17. Important note for the frontend team

Use this document together with the supplied screenshot. Recreate the dashboard using React components and real data; do not use the screenshot as a single page background. Preserve the Daei Mini branding and visual structure. Before finalizing the metric cards and chart, confirm their exact business meaning and API source with the project owner.
