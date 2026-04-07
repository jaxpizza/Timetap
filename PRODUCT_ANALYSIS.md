# TimeTap Product Analysis

## 1. FEATURE COMPLETENESS

### Auth & Onboarding
| Feature | Status | Notes |
|---------|--------|-------|
| Email/password login | Done | |
| Magic link (OTP) login | Done | |
| Signup with email confirmation | Done | |
| Password reset flow | Done | Supports hash fragments + PKCE |
| Invite code join | Done | 8-char code, auto-formats XXXX-XXXX |
| Pending approval flow | Done | Employee joins pending, admin approves with role/dept/pay |
| Role-based middleware routing | Done | owner/admin/manager -> /admin, employee -> /dashboard |
| Rejected user handling | Done | Redirects to /onboarding |
| **Email verification enforcement** | Missing | Configurable in Supabase but not enforced in UI |
| **OAuth (Google, Microsoft)** | Missing | Common for enterprise |
| **SSO / SAML** | Missing | Required for larger orgs |
| **2FA / MFA** | Missing | Security essential |
| **Session timeout / auto-logout** | Missing | No idle detection |

### Admin Dashboard
| Feature | Status | Notes |
|---------|--------|-------|
| Active employees (clocked in) | Done | Live list with elapsed time |
| Today's hours + labor cost | Done | |
| Pending approvals (timesheets, PTO, edits) | Done | Count badges |
| Weekly hours bar chart | Done | By day of week |
| Upcoming shifts (next 3 days) | Done | |
| Live activity feed | Done | Clock in/out events |
| Auto-refresh | Done | 30-second polling via router.refresh() |
| Off-site clock-in count | Done | |
| **Reports page** | Missing | Button exists, no implementation |
| **Real-time WebSocket updates** | Missing | Polling only |
| **Department breakdown** | Missing | No per-department analytics |
| **Historical trends** | Missing | Only current day + this week |

### Employee Management
| Feature | Status | Notes |
|---------|--------|-------|
| Add employee (with temp password) | Done | Creates auth user + profile + pay rate |
| Edit employee | Done | Name, phone, role, dept, pay, tax info |
| Deactivate / reactivate | Done | Soft delete via is_active flag |
| Delete employee | Done | Hard deletes Supabase auth user |
| Approve pending join requests | Done | Sets role, dept, pay |
| Reject join requests | Done | Sets join_status=rejected |
| Department assignment | Done | With inline department creation |
| Pay rate management | Done | Hourly or salary, is_primary flag |
| **Bulk operations** | Missing | No multi-select, bulk edit, bulk deactivate |
| **Employee import (CSV)** | Missing | |
| **Employee export** | Missing | |
| **Role change history** | Missing | No audit trail |

### Time Tracking (Clock In/Out)
| Feature | Status | Notes |
|---------|--------|-------|
| Clock in/out | Done | Large pulsing button, timer display |
| GPS location capture | Done | Lat/lng/accuracy stored |
| On-site detection (geofencing) | Done | Haversine distance vs radius |
| Break start/end | Done | DB trigger auto-sums break minutes |
| Live elapsed time | Done | requestAnimationFrame-based |
| Live earnings display | Done | hourly rate x elapsed |
| Off-site warning toast | Done | |
| **Overtime calculation** | Missing | DB fields exist, no logic populates them |
| **Forgotten clock-out handling** | Missing | No auto-timeout, no warning, no admin force-out |
| **Overlapping entry validation** | Missing | Can double-clock-in |
| **Minimum/maximum shift validation** | Missing | |
| **Offline clock-in** | Missing | DB field exists (offline_synced), not implemented |
| **Admin force clock-out** | Missing | |

### Timesheets
| Feature | Status | Notes |
|---------|--------|-------|
| Admin: approve single entry | Done | |
| Admin: approve all for employee | Done | Bulk per-employee |
| Admin: flag entry with note | Done | |
| Admin: unflag entry | Done | |
| Admin: delete entry | Done | Hard delete |
| Admin: on-site/off-site badges | Done | MapPin icons |
| Employee: day-grouped list | Done | Last 2 weeks |
| Employee: hours + estimated pay summary | Done | Progress bar toward 40h |
| Employee: sees flag notes | Done | "Flagged by admin: reason" |
| **Admin: edit time entry** | Missing | RLS allows it, no UI |
| **Employee: request edit** | Missing | DB table edit_requests exists, no UI |
| **Edit request review flow** | Missing | No admin UI for edit requests |
| **Timesheet export (PDF/CSV)** | Missing | |
| **Multi-select bulk approval** | Missing | Only per-employee bulk |

### Scheduling
| Feature | Status | Notes |
|---------|--------|-------|
| Admin: week view (grid) | Done | Desktop grid + mobile accordion |
| Admin: month view | Done | Calendar with shift counts |
| Admin: create single shift | Done | Employee, date, time, dept, notes |
| Admin: recurring shifts | Done | Day selection, date range, PTO skip |
| Admin: publish all unpublished | Done | Sets is_published=true |
| Admin: edit/delete shift | Done | |
| Admin: PTO overlay on schedule | Done | Shows approved PTO on calendar |
| Employee: list/week/month views | Done | |
| Employee: shift detail sheet | Done | Responsive bottom/right sheet |
| Employee: request PTO from shift | Done | Pre-fills date on PTO page |
| **Shift conflict detection** | Missing | No overlap check |
| **Selective publish** | Missing | All-or-nothing |
| **Unpublish shifts** | Missing | Permanent once published |
| **Copy week** | Missing | No "copy to next week" |
| **Shift swap requests** | Missing | DB table exists, toast placeholder |
| **Department bulk scheduling** | Missing | No "create for all in dept" |
| **Drag-and-drop scheduling** | Missing | |
| **Template schedules** | Missing | |

### PTO
| Feature | Status | Notes |
|---------|--------|-------|
| Admin: create/edit/delete policies | Done | Name, color, accrual rate, max balance |
| Admin: assign balances | Done | Per employee per policy |
| Admin: approve/deny requests | Done | With review notes |
| Admin: auto-remove conflicting schedules | Done | On approval |
| Employee: view balances | Done | Progress bar, available/used/pending |
| Employee: request PTO | Done | Date range, workday calc, notes |
| Employee: cancel pending request | Done | |
| Employee: request history | Done | With status badges |
| **Automatic accrual** | Missing | Rate stored but never applied. No cron/trigger |
| **Accrual based on hire date** | Missing | No pro-rata support |
| **Blackout dates** | Missing | |
| **PTO calendar view** | Missing | |

### Payroll
| Feature | Status | Notes |
|---------|--------|-------|
| Create pay periods | Done | Auto-calculated end date |
| Lock pay periods | Done | |
| Calculate payroll | Done | Regular/OT hours, fed/state/SS/Medicare tax |
| Approve payroll | Done | Writes payroll_entries, marks period complete |
| CSV export | Done | Full breakdown |
| Hourly + salary support | Done | Salary / 2080 conversion |
| **Double overtime** | Missing | DB fields exist, no logic |
| **Filing status in tax calc** | Missing | Field stored but unused |
| **Federal/state allowances** | Missing | Fields stored but unused |
| **Pay stub generation (PDF)** | Missing | |
| **Direct deposit integration** | Missing | |
| **Year-end tax forms (W-2)** | Missing | |
| **Payroll history/comparison** | Missing | |

### Settings
| Feature | Status | Notes |
|---------|--------|-------|
| Company name / timezone | Done | 8 US timezone options |
| Payroll settings (period type, OT threshold, OT multiplier) | Done | |
| Geofencing toggle + location management | Done | Map picker with radius |
| Invite code display + regenerate | Done | |
| **Notification preferences** | Missing | |
| **Department management page** | Missing | Only inline during employee add |
| **Billing / subscription** | Missing | |
| **Data export / backup** | Missing | |
| **API keys** | Missing | |

### Employee Dashboard / Profile
| Feature | Status | Notes |
|---------|--------|-------|
| Edit name + phone | Done | |
| View role, dept, hire date, org | Done | Read-only |
| Change password | Done | Modal with validation |
| PTO balances | Done | |
| Theme toggle | Done | |
| Sign out | Done | |
| **Avatar/photo upload** | Missing | Uses initials only |
| **Notification preferences** | Missing | |
| **Document upload (W-4, I-9)** | Missing | |

### AI Assistant
| Feature | Status | Notes |
|---------|--------|-------|
| Chat interface | Done | |
| Workforce summary report | Done | |
| Overtime report | Done | |
| Labor cost report | Done | |
| Attendance report | Done | |
| **Actual Claude API integration** | Missing | Rule-based keyword matching, not AI |
| **Natural language queries** | Missing | |
| **Predictive analytics** | Missing | |

### Notifications
| Feature | Status | Notes |
|---------|--------|-------|
| Toast notifications (sonner) | Done | Throughout app |
| Notification bell in header | Done | Hardcoded "3" badge |
| Notification on join request | Done | Creates DB record for org owner |
| **Dynamic notification count** | Missing | Badge is hardcoded |
| **Notification inbox/page** | Missing | |
| **Email notifications** | Missing | No email service integrated |
| **Push notifications** | Missing | |
| **Real-time (Supabase subscriptions)** | Missing | |

### Location Tracking
| Feature | Status | Notes |
|---------|--------|-------|
| GPS capture on clock in/out | Done | Browser geolocation API |
| Geofence setup (map picker) | Done | Leaflet + OpenStreetMap |
| Radius configuration | Done | 100-5280 feet, presets |
| On-site detection | Done | Haversine distance calculation |
| Admin time clock map view | Done | Shows live clock-ins |
| Off-site badge on timesheets | Done | |
| **Geofence enforcement (block clock-in)** | Missing | Shows warning only, doesn't prevent |
| **Multiple location support per employee** | Missing | |
| **GPS accuracy handling** | Missing | No fallback for low accuracy |

---

## 2. WORKFLOW GAPS

### Employee Joins -> First Clock-In -> Payroll
1. Employee signs up -> enters invite code -> **WORKS**
2. Status set to pending -> admin sees pending card -> **WORKS**
3. Admin approves with role/dept/pay -> status=active -> **WORKS**
4. Employee redirected to /dashboard -> **WORKS** (middleware routes by role)
5. Employee clocks in -> time entry created -> **WORKS**
6. Employee clocks out -> total_hours calculated by DB trigger -> **WORKS**
7. Entry appears in admin timesheets as "Pending" -> **WORKS**
8. Admin approves timesheet -> status=approved -> **WORKS**
9. Admin runs payroll -> calculates based on approved entries -> **WORKS**
10. **GAP**: No notification to employee that payroll was processed
11. **GAP**: No pay stub for employee to view
12. **GAP**: Overtime hours never calculated (always 0 in payroll)

### Schedule Creation -> PTO Request -> Schedule Update
1. Admin creates shift for employee -> **WORKS**
2. Admin publishes schedule -> **WORKS**
3. Employee sees published shifts on schedule page -> **WORKS**
4. Employee clicks shift -> opens detail sheet -> **WORKS**
5. Employee clicks "Request Time Off" -> navigates to PTO with date pre-filled -> **WORKS**
6. Employee submits PTO request -> pending_hours updated -> **WORKS**
7. **GAP**: No notification to admin about new PTO request
8. Admin approves PTO -> conflicting schedules auto-deleted -> **WORKS**
9. **GAP**: No notification to employee that PTO was approved
10. Employee sees PTO on schedule (approved PTO overlay) -> **WORKS**

### Clock In -> Break -> Clock Out -> Timesheet
1. Employee clocks in -> GPS captured -> on-site checked -> **WORKS**
2. Employee starts break -> break row created -> **WORKS**
3. Employee ends break -> DB trigger sums break minutes -> **WORKS**
4. Employee clocks out -> total_hours calculated (minus breaks) -> **WORKS**
5. Entry shows on employee timesheet with hours + break info -> **WORKS**
6. **GAP**: If employee forgets to end break, break stays open forever
7. **GAP**: If employee forgets to clock out, entry stays "active" forever
8. **GAP**: No overtime hours populated in the entry

### Admin Runs Payroll
1. Admin creates pay period -> **WORKS**
2. Admin clicks "Calculate" -> fetches approved entries in range -> **WORKS**
3. System calculates regular/OT/taxes -> displays breakdown -> **WORKS**
4. Admin clicks "Approve" -> payroll_entries created, period marked complete -> **WORKS**
5. Admin exports CSV -> **WORKS**
6. **GAP**: Tax calculation ignores filing_status and allowances
7. **GAP**: No double-overtime support
8. **GAP**: No pay stub generated for employees
9. **GAP**: Paid breaks not factored into payroll

---

## 3. UX ISSUES

### Navigation
- Admin sidebar "Reports" and "AI Assistant" links exist but no Reports page
- Search button in admin header has no handler (decorative only)
- Notification bell has hardcoded "3" badge (never updates)
- Employee dashboard has no way to navigate to admin (even for dual-role users)
- No breadcrumbs on any page

### Missing Feedback
- Publishing schedules: no confirmation dialog before publishing all
- Deleting employee: no confirmation dialog (hard deletes auth user)
- Deleting time entry: no confirmation dialog
- PTO denial: no required reason (optional review_note)
- Rejecting join request: no notification sent to employee

### Empty States
- Employee schedule: good empty state with message
- Employee timesheet: good empty state
- PTO with no policies: good empty state
- **Missing**: Admin schedule with no employees has no guidance
- **Missing**: Admin timesheets when all approved (just shows empty tab)
- **Missing**: Payroll with no pay periods shows no onboarding guidance

### Mobile Responsiveness
- Employee dashboard: bottom tab bar works well
- Admin dashboard: sidebar collapses to sheet, works
- Admin schedule week view: switches to accordion on mobile
- **Issue**: Admin schedule month view cells are very cramped on mobile
- **Issue**: Payroll detail breakdown table not responsive (horizontal overflow likely)
- **Issue**: Admin employee cards could be tighter on small screens

### Theme Consistency
- All pages use CSS variables (--tt-*) consistently
- Light mode overrides are comprehensive in globals.css
- **Potential issue**: Leaflet map tiles don't theme (always light tiles in dark mode)
- **Potential issue**: date input fields may not respect dark theme on all browsers

---

## 4. DATA INTEGRITY

### Queries Returning Wrong Data
- Admin dashboard `weekStart` calculation uses `now.getDay()` which is correct for local time since it's a server component running at request time
- PTO date queries now use `toLocalDateString()` (fixed in timezone audit)
- **Risk**: `getEmployeeSchedules` and `getEmployeePTO` accept ISO strings from client; if client clock is wrong, range will be off

### Missing Input Validation
- **createShift**: No check that end_time > start_time
- **createShift**: No check for overlapping shifts on same employee
- **createRecurringShifts**: No max limit on generated shifts (could create thousands)
- **requestPTO**: No check that employee has sufficient balance
- **requestPTO**: No check for overlapping PTO requests
- **calculatePayroll**: No check that all entries in range are approved (includes "completed" status too)
- **clockIn**: No check for existing active entry (can double clock-in)
- **Pay rate**: No minimum wage validation

### Race Conditions
- **Double clock-in**: No mutex or DB constraint preventing two active entries
- **Double PTO submit**: No debounce; rapid clicks could create duplicate requests
- **Approve + Approve**: Two admins approving same timesheet simultaneously could both succeed
- **PTO balance update**: pending_hours increment is not atomic (read-then-write)
- **Publish schedule**: Multiple clicks could trigger multiple publish operations
- Most buttons have `loading` state that disables during async, but not all:
  - Clock in/out button: yes, has loading state
  - Publish button: no loading state
  - Approve timesheet: no loading state
  - PTO approve/deny: no loading state

### Missing Error Handling
- Server actions return `{ success, error }` but many callers don't check the error
- No retry logic for failed Supabase operations
- No transaction support (multi-step operations like PTO approval + balance update + schedule delete are not atomic)
- GPS timeout (8 seconds) but no fallback to clock in without location

---

## 5. MISSING PRODUCTION ESSENTIALS

### Error Boundaries
- No error.tsx at any route level
- No global error boundary
- Unhandled promise rejections in server actions could crash the page
- **Need**: error.tsx at /admin, /dashboard, and root levels minimum

### Loading States / Suspense
- No loading.tsx skeleton files anywhere
- No React Suspense boundaries
- Page navigations show no loading indicator
- **Need**: loading.tsx with skeleton UI for each major route

### SEO / Metadata
- Root layout has basic metadata (title: "TimeTap")
- No per-page metadata (title, description, og tags)
- No sitemap.xml or robots.txt
- No favicon beyond default Next.js

### Rate Limiting
- No rate limiting on any server action
- No rate limiting on auth attempts
- No CAPTCHA on signup/login
- Supabase has some built-in rate limiting but app-level protection missing

### Input Sanitization
- Server actions trust client input directly
- No XSS protection beyond React's built-in escaping
- No SQL injection risk (Supabase SDK handles parameterization)
- Notes/text fields accept arbitrary strings (no length limits, no profanity filter)

### Accessibility
- Shift detail sheet: has role="button" and tabIndex={0} on clickable elements (good)
- Most buttons use semantic <button> elements (good)
- **Missing**: Skip navigation links
- **Missing**: ARIA labels on icon-only buttons (theme toggle, notification bell, sidebar collapse)
- **Missing**: ARIA live regions for toast notifications
- **Missing**: Focus management when sheets/modals open
- **Missing**: Keyboard navigation for schedule grid cells
- **Missing**: Screen reader text for color-coded badges

### Performance
- No image optimization (no next/image usage found)
- No code splitting beyond Next.js route-based
- No memoization of expensive computations (schedule grid recalculates on every render)
- Leaflet loaded synchronously (large bundle)
- No virtual scrolling for long employee lists
- **Need**: Dynamic imports for Leaflet, memoization for schedule grids

---

## 6. RECOMMENDED PRIORITY FIXES

| # | Fix | Impact | Effort |
|---|-----|--------|--------|
| 1 | **Add overtime calculation** to time entries | High - payroll is wrong without it | Medium |
| 2 | **Add forgotten clock-out handling** (auto-timeout after 14h or admin force-out) | High - orphaned entries pollute data | Medium |
| 3 | **Add double-click / race condition protection** (disable buttons during async, DB constraints for active entries) | High - data corruption risk | Low |
| 4 | **Add loading.tsx skeletons** for major routes | High - blank screens during navigation | Low |
| 5 | **Add error.tsx boundaries** at /admin and /dashboard | High - unhandled errors crash the page | Low |
| 6 | **Add shift conflict detection** (overlapping shifts for same employee) | High - scheduling integrity | Medium |
| 7 | **Dynamic notification count** + notification inbox page | High - hardcoded "3" badge erodes trust | Medium |
| 8 | **Add input validation to server actions** (end > start, balance check for PTO, min wage) | High - bad data gets saved | Medium |
| 9 | **Add email notifications** (PTO approved/denied, payroll processed, shift published) | High - employees miss updates without checking app | High |
| 10 | **Fix tax calculations** to use filing_status and allowances | High - payroll compliance | Medium |
| 11 | **Add confirmation dialogs** for destructive actions (delete employee, delete entry, publish all) | Medium - prevents accidental data loss | Low |
| 12 | **Add edit request workflow** (employee requests edit -> admin reviews) | Medium - DB table exists, needs UI | Medium |
| 13 | **Add automatic PTO accrual** (cron job or pay-period trigger) | Medium - manual balance management is tedious | Medium |
| 14 | **Add copy-week for scheduling** | Medium - admin creates same schedule every week manually | Low |
| 15 | **Add ARIA labels** to icon buttons + keyboard nav for schedule grid | Medium - accessibility compliance | Low |
