# Interactive Shift Detail Sheet

## Context

The schedule page has 3 views (list, week, month) but shifts/PTO are display-only. This adds click-to-inspect behavior across all views, opening a responsive detail sheet with contextual actions and a deep-link to pre-fill PTO requests.

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/use-is-mobile.ts` | **Create** — small `matchMedia` hook for responsive sheet side |
| `src/app/dashboard/schedule/actions.ts` | **Edit** — add `id, status` to PTO select |
| `src/app/dashboard/schedule/page.tsx` | **Edit** — add `id, status` to PTO select |
| `src/app/dashboard/schedule/schedule-client.tsx` | **Edit** — add `SelectedItem` type, `PTOReq` update, `buildPTOMap` enrichment, click handlers in all 3 views, render sheet |
| `src/app/dashboard/schedule/shift-detail-sheet.tsx` | **Create** — the detail sheet component |
| `src/app/dashboard/pto/pto-client.tsx` | **Edit** — read `?date` searchParam, auto-open and pre-fill request sheet |

## Implementation Steps

### 1. `src/hooks/use-is-mobile.ts` (new)
- `useIsMobile()` hook: `matchMedia("(max-width: 640px)")`, SSR-safe (default false)
- Returns boolean, updates on resize via `change` event listener

### 2. Data layer: enrich PTO queries
- **`actions.ts`**: Change `getEmployeePTO` select to `"id, start_date, end_date, total_hours, status, pto_policies(name, color)"`
- **`page.tsx`**: Same select change in the inline query; also remove `.eq("status", "approved")` so we can show pending PTO status in the sheet (or keep approved filter but add `id, status` to the select)
  - Decision: keep `approved` filter for calendar display (only show approved PTO on calendar), just add `id, status` fields

### 3. `schedule-client.tsx` updates

**Types:**
```ts
interface PTOReq { id: string; start_date: string; end_date: string; total_hours: number; status: string; pto_policies: { name: string; color: string } | null }

type SelectedItem =
  | { kind: "shift"; shift: Shift; date: Date }
  | { kind: "pto"; date: Date; ptoName: string; ptoColor: string; req: PTOReq }
```

**buildPTOMap**: store the full `PTOReq` ref in the map value: `{ name, color, req }`

**State + handler:**
```ts
const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
const [detailOpen, setDetailOpen] = useState(false);
const router = useRouter();
function openDetail(item: SelectedItem) { setSelectedItem(item); setDetailOpen(true); }
```

**Click wiring per view:**
- **List view**: pass `onShiftClick` and `onPTOClick` callbacks to `ShiftList`; add `onClick`, `cursor-pointer`, `role="button"`, `tabIndex={0}` on each card
- **Week view**: add `onClick` to each shift block div and PTO indicator div
- **Month view**: add `onClick` to each shift indicator and PTO indicator; on mobile, make the count circle clickable (opens first shift for that day)

**Render sheet** outside AnimatePresence:
```tsx
<ShiftDetailSheet item={selectedItem} open={detailOpen} onOpenChange={setDetailOpen} />
```

### 4. `shift-detail-sheet.tsx` (new)

**Props:** `{ item: SelectedItem | null; open: boolean; onOpenChange: (b: boolean) => void }`

**Layout:**
- `<Sheet>` with `side={isMobile ? "bottom" : "right"}`
- Bottom sheet: `max-h-[85vh] rounded-t-2xl`
- Right sheet: `sm:max-w-[420px]`

**Header:** date formatted as "Wednesday, Apr 8" + status badge

**Shift detail card** (when `kind === "shift"`):
- Clock icon + "Shift Time" label (muted, uppercase, xs)
- Time range in `font-mono text-xl`
- Duration via `formatHours()`
- Department with colored dot
- Notes if present

**Actions (future shifts):**
- "Request Time Off" — amber, Palmtree icon → `router.push(/dashboard/pto?date=YYYY-MM-DD)`
- "Request Shift Swap" — indigo outline, ArrowLeftRight icon → `toast("Shift swap requests coming soon")`
- "Report Issue" — grey ghost, AlertCircle icon → `toast("Issue reported")`

**Past shifts:**
- Hide future-only actions
- Show "View in Timesheet" link → `/dashboard/timesheet`

**PTO detail** (when `kind === "pto"`):
- Policy name with colored dot, amber styling
- Date range, hours, status badge
- "Cancel Request" button if status is pending (import `cancelPTORequest` from pto actions)

**Icons needed:** `Clock`, `Palmtree`, `ArrowLeftRight`, `AlertCircle`, `Building2`, `FileText`, `ExternalLink`

### 5. PTO pre-fill (`pto-client.tsx`)
- Import `useSearchParams` from `next/navigation`
- Read `dateParam = searchParams.get("date")`
- Init `sheetOpen` as `!!dateParam`
- Pass `initialDate={dateParam}` to `RequestSheet`
- `RequestSheet`: init `startDate`/`endDate` with `initialDate ?? ""`

## Verification
1. Start dev server: `npm run dev`
2. Navigate to `/dashboard/schedule`
3. Click a shift in list view → sheet opens from right (desktop) or bottom (mobile)
4. Click a shift in week view → same sheet
5. Click a shift/indicator in month view → same sheet
6. Verify past shifts show "View in Timesheet" and hide action buttons
7. Verify PTO days show PTO details with cancel option
8. Click "Request Time Off" → navigates to `/dashboard/pto?date=...` → request sheet auto-opens with date pre-filled
9. Click "Request Shift Swap" → toast appears
10. Resize to mobile width → sheet slides up from bottom
