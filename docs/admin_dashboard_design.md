# Daei Mini — Admin React Dashboard UI Specification

## 1. Purpose

This document describes the supplied Daei Mini Admin Dashboard screenshot as an implementation-ready visual and functional reference for the React frontend team.

- **Application:** Daei Mini — Admin App
- **Screen:** Admin Dashboard
- **Platform:** React Web
- **Reference image:** `image.png`
- **Reference dimensions:** 1722 × 865 px
- **Layout:** Desktop dashboard

The screen uses a calm, clean, Islamic-inspired visual style. It combines a fixed left sidebar, a slim top header, summary cards, activity analytics, recent-user and report lists, a progress chart, and a motivational quote panel.

> The names, dates, email addresses, counts and chart values visible in the screenshot are sample content. Production values must come from the backend APIs.

## 2. Brand and visual direction

The design must retain the Daei Mini identity. Do not replace the logo, introduce a different brand style, or change the green-and-cream visual direction.

### Overall appearance

- Calm, welcoming and uncluttered.
- Warm ivory/off-white application background.
- Deep forest green for primary actions and selected navigation.
- White cards with rounded corners, subtle borders and soft shadows.
- Pale sage green Islamic artwork and geometric decoration.
- Modern sans-serif interface text, paired with elegant serif display lettering for the brand and welcome heading.
- Small pastel icon backgrounds to distinguish metric categories.

## 3. Colour palette

The following values are close visual approximations taken from the screenshot and should be treated as design tokens. Fine-tune them against the original source artwork if the exact brand palette is available.

| Token | Hex | Usage |
|---|---|---|
| Primary forest green | `#106030` | Main buttons, active sidebar item, chart bars, progress ring |
| Secondary green | `#309050` | Chart bars, progress accents and positive indicators |
| Deep text green | `#145C3A` | Brand wordmark and prominent headings |
| Pale sage | `#E0F0E0` | Icon backgrounds, illustrations and decorative surfaces |
| Light sage | `#C0D0B0` | Muted green surfaces and progress track |
| Warm off-white | `#F0F0E0` | Main application canvas and warm background |
| White | `#FFFFFF` | Cards, sidebar and header surfaces |
| Warm gray border | `#E0E0D0` | Card outlines, separators and input borders |
| Main body text | `#26332E` | Labels and body copy |
| Muted text | `#77817B` | Metadata and secondary labels |
| Success green | `#21864B` | Active/completed status and positive change |
| Warning orange | `#E99532` | Pending status and activity metric icon |
| Information blue | `#398FCB` | Reports metric icon |
| Purple | `#8060C8` | Groups metric icon |
| Danger red | `#E3483E` | Logout and alert/missed states |

Use the palette consistently. Do not use every accent colour everywhere; orange, blue and purple are limited to category distinction and status accents.

## 4. Typography

- **Brand wordmark:** Elegant serif-style display lettering.
- **Welcome heading:** Large, bold serif heading in deep green.
- **Interface text:** Clean, modern sans-serif.
- **Section headings:** Semibold or bold sans-serif.
- **Metric values:** Large, bold and high contrast.
- **Metadata:** Smaller muted text.

Maintain a clear hierarchy: brand → welcome heading → section heading → metric value → body text → metadata.

## 5. Backgrounds, illustrations and decoration

### Main application background

Use a warm off-white/ivory background rather than pure white. The overall canvas should feel soft and warm.

### Sidebar background

Use a white-to-warm-ivory surface. The lower portion contains a pale sage mosque/minaret landscape illustration. The illustration must remain subtle and must not compete with navigation.

### Welcome banner

The welcome card is one of the most distinctive parts of the screen:

- Very pale sage/ivory background, optionally with a gentle gradient.
- Faint Islamic geometric line pattern in the background.
- A soft sage mosque illustration on the **right side**, including a dome and minaret.
- Text and the action button remain on the **left side**.
- Keep the illustration low contrast so the heading remains readable.
- The banner uses rounded corners and a soft edge/shadow.

Visible copy:
- Heading: **Welcome Back, Admin!**
- Subtitle: **Here's what's happening in your organization today.**
- Button: **View Details**, with a right arrow.

### Motivational quote card

- Pale sage green background.
- Large, light-green quotation mark.
- Italic deep-green quote text.
- Small mosque landscape and botanical leaves along the bottom edge.

Visible quote: **“Small steps every day lead to big changes.”**

## 6. Application shell

### 6.1 Left sidebar

The sidebar is fixed on the left on desktop and spans the full visible application height.

**Brand block at the top**
- Daei Mini crescent/open-book/minaret-inspired green logo.
- Daei Mini wordmark centered underneath.
- `ADMIN APP` subtitle in green.

**Navigation items, in order**

| Item | Icon concept | State in screenshot |
|---|---|---|
| Dashboard | Home | Active |
| Users Management | Users | Inactive |
| Groups Management | Users/group | Inactive |
| Activities Overview | Calendar | Inactive |
| Reports | Document/file | Inactive |
| Analytics & Progress | Chart | Inactive |
| Notifications | Bell | Inactive |
| Settings | Gear | Inactive |

**Active navigation style**
- Forest-green filled rounded rectangle.
- White icon and white label.
- Comfortable horizontal padding.

**Inactive navigation style**
- Transparent background.
- Dark muted-green icon and text.
- Consistent vertical spacing.

**Bottom sidebar area**
- Pale sage mosque/minaret illustration.
- White rounded Logout button.
- Red logout icon and red Logout label.

### 6.2 Top header

A slim horizontal header sits above the main dashboard content.

**Left side**
1. Hamburger menu icon.
2. Rounded search input with magnifying-glass icon and `Search...` placeholder.

**Right side**
1. Notification bell.
2. Small red unread indicator dot on the bell.
3. Circular admin profile avatar.
4. `Admin` label.
5. Dropdown chevron.

Use a subtle bottom divider. Keep the header background white or warm ivory.

## 7. Dashboard content and layout

The main content area has comfortable padding and a consistent grid. The upper section places the welcome banner on the left and four metric cards on the right. The middle section contains the activity chart and recent users. The bottom section contains recent reports, progress overview and the quote card.

### 7.1 Welcome banner

**Position:** Top-left.

**Content**
- `Welcome Back, Admin!`
- `Here's what's happening in your organization today.`
- `View Details` button with arrow-right icon.

**Visual**
- Pale sage/ivory fill.
- Subtle Islamic geometric pattern.
- Mosque dome/minaret artwork on the right.
- Rounded corners.

### 7.2 Summary metric cards

**Position:** Top-right, arranged in a 2 × 2 grid.

Each card contains a pastel icon tile, metric label, large value and green positive-change indicator.

| Metric | Sample value | Change | Icon/background concept |
|---|---:|---:|---|
| Total Users | 248 | +12% | Users icon / pale green |
| Total Groups | 18 | +0% | Group icon / pale purple |
| Total Activities | 1,142 | +15% | Activity icon / pale orange |
| Total Reports | 92 | +10% | Document icon / pale blue |

Use white rounded cards with a thin warm-gray border and a subtle shadow. Values should be visually prominent.

### 7.3 Activity Overview

**Position:** Middle-left.

**Elements**
- Section title: `Activity Overview`.
- Small chart icon in green.
- Date-range dropdown showing `This Week`.
- Vertical bar chart.
- X-axis: Sun, Mon, Tue, Wed, Thu, Fri, Sat.
- Y-axis labels: 0, 10, 20, 30.
- Green bars with light horizontal grid lines.

The chart must be data-driven. The values in the screenshot are illustrative only.

### 7.4 Recent Users

**Position:** Middle-right.

**Header**
- Users/group icon.
- Title: `Recent Users`.
- `View All` action with arrow.

**Rows shown in the reference**

| Name | Email | Status |
|---|---|---|
| Hamza Khan | hamza@email.com | Active |
| Ayesha Malik | ayesha@email.com | Active |
| Ali Raza | ali@email.com | Pending |

Each row includes a circular avatar, name, email and right-aligned status pill.

**Status styling**
- Active: pale green pill with green text.
- Pending: pale orange pill with orange text.

The `View All` action should open Users Management.

### 7.5 Recent Reports

**Position:** Bottom-left.

**Header**
- Document icon.
- Title: `Recent Reports`.
- `View All` action with arrow.

**Table columns**
1. Report ID
2. User
3. Date
4. Status

**Rows shown in the reference**

| Report ID | User | Date | Status |
|---|---|---|---|
| #RP-1024 | Hamza Khan | May 12, 2024 | Completed |
| #RP-1023 | Ali Raza | May 11, 2024 | Pending |
| #RP-1022 | Ayesha Malik | May 10, 2024 | Reviewed |

Use fine row separators and compact typography. Statuses appear as small rounded pills. The `View All` action should open Reports.

### 7.6 Progress Overview

**Position:** Bottom-center.

**Elements**
- Chart/progress icon.
- Title: `Progress Overview`.
- Circular donut progress visualization.
- Center value: `78%`.
- Legend:
  - Completed — 78% (green).
  - Pending — 14% (orange).
  - Missed — 8% (red).

The chart must use actual report/activity data in production. Do not rely on colour alone; keep the legend labels and percentages visible.

### 7.7 Motivational quote

**Position:** Bottom-right.

Visible text: **“Small steps every day lead to big changes.”**

Use an italic deep-green text style, a large pale quotation mark, a pale sage background and mosque/botanical artwork along the lower edge.

## 8. Interaction requirements

| Element | Expected behaviour |
|---|---|
| Dashboard sidebar item | Opens Admin Dashboard |
| Other sidebar items | Navigate to their respective admin pages |
| Hamburger | Collapses/opens the sidebar |
| Search input | Searches relevant admin records |
| Notification bell | Opens notifications or notification panel |
| Admin avatar/name | Opens profile dropdown |
| View Details | Opens the relevant dashboard details/overview |
| This Week dropdown | Changes the Activity Overview date range |
| Recent Users → View All | Opens Users Management |
| Recent Reports → View All | Opens Reports |
| Logout | Ends the admin session and returns to Admin Login |

All visible buttons and controls must have real behaviour. Do not leave decorative controls that appear clickable but do nothing.

## 9. Responsive behaviour

### Desktop
- Keep the fixed left sidebar.
- Keep the horizontal header.
- Retain the two-column upper/middle layout and three-panel lower row where space permits.

### Tablet
- Collapse the sidebar to icon-only mode or a drawer.
- Reduce the metric card grid to fit.
- Stack lower cards when required.

### Mobile
- Use drawer navigation.
- Stack dashboard sections vertically.
- Keep the welcome banner readable; move or reduce the decorative mosque artwork if necessary.
- Prevent horizontal overflow.
- Preserve the content order and all key actions.

## 10. Accessibility and usability

- Use semantic page headings and navigation landmarks.
- Add accessible labels to icon-only buttons.
- Maintain sufficient text/background contrast.
- Show status words as well as status colours.
- Add meaningful alternative text for the logo and decorative artwork (decorative artwork can use empty alt text).
- Ensure keyboard focus is visible.
- Make tables usable on narrow screens, for example with responsive horizontal scrolling or a stacked row layout.

## 11. Suggested React component structure

Suggested reusable components:

- `AdminLayout`
- `Sidebar`
- `SidebarNavItem`
- `TopHeader`
- `SearchInput`
- `WelcomeBanner`
- `MetricCard`
- `ActivityOverviewChart`
- `RecentUsersCard`
- `RecentReportsTable`
- `StatusBadge`
- `ProgressDonut`
- `QuoteCard`

Suggested route: `/admin/dashboard`

Keep the layout, cards, badges, buttons and typography reusable so the other Admin screens can share the same design system.

## 12. Implementation notes

1. Treat the screenshot as a visual reference, not as a flat background image.
2. Build the page from reusable React components.
3. Use the existing Daei Mini logo asset if available; do not redraw or replace the brand mark without approval.
4. Use the supplied mosque artwork or create matching pale sage illustrations as separate assets.
5. Keep sample names, dates, counts and chart data separate from UI components.
6. Fetch real metrics, recent users and recent reports from the backend.
7. Add loading, empty and error states for API-driven sections.
8. Keep the same forest-green, cream, white and pale-sage design language throughout the Admin portal.

---

## 13. Reference checklist

- [ ] Daei Mini logo and `ADMIN APP` branding
- [ ] Warm ivory background
- [ ] Forest-green active sidebar item
- [ ] Pale mosque illustration in sidebar
- [ ] Header search, notification and admin profile
- [ ] Welcome banner with geometric pattern and mosque illustration
- [ ] Four summary metric cards
- [ ] Activity Overview bar chart
- [ ] Recent Users list
- [ ] Recent Reports table
- [ ] Progress Overview donut chart
- [ ] Motivational quote card with mosque/botanical artwork
- [ ] Logout button
- [ ] Responsive layout and working interactions
