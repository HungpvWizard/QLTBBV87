# MASTER DESIGN SYSTEM — QUẢN LÝ TRANG BỊ

## 1. Product Character
- Enterprise Asset / Equipment Management.
- Professional, calm, efficient, trustworthy.
- Desktop-first for LAN/office use; responsive without sacrificing data density.
- Existing product branding/colors win if already established and accessible.

## 2. Layout
- App shell: sidebar + topbar + content.
- Content max width flexible; data pages may use full width.
- 8px spacing system: 4/8/12/16/24/32.
- Page title + concise subtitle + primary action aligned consistently.
- Avoid nested cards and excessive whitespace on data-heavy pages.

## 3. Typography
- Use current project font if legible; do not add external font dependency unnecessarily.
- Base 14–16px; table may use 13–14px if readable.
- Clear hierarchy: page title > section > body > metadata.
- Vietnamese diacritics must render correctly.

## 4. Color & Status
Do not hard-code a new brand palette before auditing current tokens.
Semantic roles required: primary, neutral, success, warning, danger, info, surface, border, text-primary, text-secondary.
Statuses must combine color + text/icon. Suggested semantic mapping only if compatible:
- Đang sử dụng: success/info
- Chờ xử lý/cấp phát: info
- Đang sửa chữa: warning
- Hỏng/quá hạn: danger
- Thanh lý/ngừng sử dụng: neutral

## 5. Components
### Buttons
Primary only for primary action; secondary for normal actions; destructive clearly separated. Loading disables duplicate submit.
### Inputs
Visible labels, helper/error text, consistent heights, required indicator. Never rely on placeholder as label.
### Tables
Sticky header for long tables where practical; column alignment; truncation + tooltip for long text; row selection only when bulk action exists; filters visible and resettable; preserve sort/pagination.
### Cards
Use for KPI/summary/grouping, not every field.
### Modal/Drawer
Use modal for short focused actions; drawer for contextual edit/detail when it does not break existing route behavior. Confirm destructive actions.
### Toast/Alert
Success concise; error actionable; validation near field.

## 6. Navigation
- Keep existing information architecture unless audit proves inconsistency and route/function parity is preserved.
- Active state obvious.
- Icons support labels, never replace critical labels.
- Notification badge accessible.

## 7. Accessibility
- Keyboard navigation and visible focus.
- Adequate contrast.
- Icon buttons have labels/tooltips.
- Form errors programmatically/visually associated where stack supports.
- Respect reduced motion.

## 8. Motion
- Functional, subtle, 150–250ms typical.
- No animation on large data tables that delays work.
- No autoplay decorative motion.

## 9. Data & Charts
- KPI must have label/unit/context.
- Charts require title, legend/tooltip when needed, readable labels and empty state.
- Never fabricate data.

## 10. Safety
This document controls presentation, not business logic. `NO_FEATURE_LOSS.md` overrides any visual preference.
