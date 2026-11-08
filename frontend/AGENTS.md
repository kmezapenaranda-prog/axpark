<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: AxPark — Frontend (antes "Parki")

## Tech Stack

| Technology | Version | Notes |
|------------|---------|-------|
| Next.js | 16.2.6 | App Router, Turbopack |
| React | 19.2.4 | |
| TypeScript | 5.x | Strict mode |
| Tailwind CSS | v4 | CSS-first config (no tailwind.config.*) |
| shadcn/ui | v4.8.0 | Style: base-nova, @base-ui/react |
| Icons | lucide-react | Use these, NOT inline SVGs |
| Export | xlsx (Excel), jspdf (PDF) | |

## Project Structure

```
parking-frontend/
├── app/                          # App Router pages
│   ├── globals.css               # Theme system (CSS variables + @theme inline)
│   ├── layout.tsx                # Root layout (Server Component)
│   ├── page.tsx                  # Dashboard (client)
│   ├── login/page.tsx            # Login page
│   ├── parking/page.tsx          # Active vehicles
│   ├── vehiculos/page.tsx        # Vehicle CRUD + wizard
│   ├── clientes/page.tsx         # Client CRUD
│   ├── mensualidades/page.tsx    # Memberships
│   ├── tarifas/page.tsx          # Pricing config
│   ├── reportes/page.tsx         # Reports + caja
│   ├── usuarios/page.tsx         # User management
│   └── admin/                    # Platform admin
│       ├── page.tsx              # Business list
│       └── negocios/[id]/page.tsx# Business detail
├── components/
│   ├── app-shell.tsx             # Auth guard + layout wrapper
│   ├── auth-provider.tsx         # Auth context (JWT)
│   ├── sidebar.tsx               # Navigation sidebar
│   ├── theme-provider.tsx        # Dark/light theme context
│   └── ui/                       # shadcn/ui components
│       ├── button.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── skeleton.tsx
│       ├── tabs.tsx
│       ├── badge.tsx
│       ├── custom-select.tsx
│       ├── date-picker.tsx
│       └── notice-box.tsx
├── lib/
│   ├── api.ts                    # HTTP client (fetch + AbortController)
│   ├── submit-error.ts           # Error handling helpers
│   └── utils.ts                  # cn() helper (clsx + tailwind-merge)
└── public/                       # Static assets
```

## Conventions

### Language & Locale
- **UI language:** Spanish (es)
- **Date format:** DD/MM/YYYY (Colombian format)
- **Currency:** COP (Colombian Peso) — use `Intl.NumberFormat("es-CO", { style: "currency", currency: "COP" })`
- **Time:** 12-hour format with AM/PM

### State Management
- **Auth:** React Context (`AuthProvider`) + localStorage for JWT
- **Theme:** React Context (`ThemeProvider`) with class toggle
- **Local state:** useState/useReducer per page
- **No Redux, Zustand, or other state libraries**

### Routing & Roles
- **Platform admin (`platform_admin`):** Only access `/admin/*`
- **Business admin (`business_admin`):** Access everything except `/admin`
- **Operator (`operator`):** Access dashboard, parking, clients, vehicles, memberships
- **Route protection:** Handled in `app-shell.tsx` via useEffect

### API Communication
- All API calls go through `lib/api.ts` (`apiFetch` wrapper)
- Backend URL: `NEXT_PUBLIC_API_URL` (default: `http://localhost:3000`)
- Auth header: `Authorization: Bearer <jwt>`
- Error types: `ApiError` with `isConflict`, `isUnconfirmed` helpers

## Styling Rules

### Tailwind CSS
- **Prefer Tailwind classes** over inline `style={{}}` when possible
- Use `cn()` utility for conditional classes: `cn("base-class", condition && "conditional-class")`
- Theme colors are defined as CSS variables in `globals.css` and mapped to Tailwind via `@theme inline`

### CSS Variables (available as Tailwind classes)
```css
/* Backgrounds */
bg-page          /* Page background */
bg-sidebar       /* Sidebar background */
bg-card          /* Card background (with opacity) */
bg-card-hover    /* Card hover state */
bg-modal         /* Modal background */
bg-input         /* Input background */
bg-subtle        /* Subtle background */
bg-row-hover     /* Table row hover */

/* Borders */
border-soft      /* Subtle borders */
border-default   /* Default borders */
border-medium    /* Medium emphasis borders */
border-row       /* Table row borders */

/* Text */
text-primary     /* Main text (white in dark, dark in light) */
text-secondary   /* Secondary text */
text-muted       /* Muted text */
text-dim         /* Very muted text */
```

### Dark/Light Mode
- **Default:** Dark mode
- **Toggle:** Class-based (`html.dark` / `html.light`)
- **Implementation:** CSS variables change values per mode
- **Override:** `html.light .text-white { color: var(--text-primary); }` handles Tailwind's `text-white` in light mode

### Components
- **shadcn/ui components:** Located in `components/ui/`
- **Custom components:** Located in `components/` root
- **Icon library:** Use `lucide-react` — NEVER write inline SVGs
- **Custom selects:** Use `CustomSelect` from `components/ui/custom-select.tsx`
- **Date picker:** Use `DatePicker` from `components/ui/date-picker.tsx`

## Commands

```bash
npm run dev      # Start dev server on port 3001
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
```

## Important Notes

1. **No barrel files** — Import directly from specific files
2. **No inline SVGs** — Use lucide-react components
3. **Minimize style={{}}** — Prefer Tailwind classes + CSS variables
4. **Client components** — All pages use `"use client"` for auth/theme access
5. **Error handling** — Use `describeSubmitError()` + `NoticeBox` for user feedback
6. **Loading states** — Use `Skeleton` component for consistent loading UI
7. **Confirmations** — Use `Dialog` from shadcn for destructive actions

## API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login, returns JWT |
| GET/POST | `/tenants` | List/create businesses |
| GET/PUT/DELETE | `/tenants/:id` | Business CRUD |
| GET/POST | `/users` | List/create users |
| GET/PUT/DELETE | `/users/:id` | User CRUD |
| GET/PUT | `/settings` | App settings (tarifas) |
| GET/POST | `/clients` | List/create clients |
| GET/PUT/DELETE | `/clients/:id` | Client CRUD |
| GET/POST | `/vehicles` | List/create vehicles |
| GET/PUT/DELETE | `/vehicles/:id` | Vehicle CRUD |
| GET | `/parking/active` | Active vehicles in parking |
| POST | `/parking/exit` | Register vehicle exit |
| GET | `/parking/entries` | Parking history |
| GET/POST | `/memberships` | List/create memberships |
| GET/PUT/DELETE | `/memberships/:id` | Membership CRUD |
| PUT | `/memberships/:id/renew` | Renew membership |
| GET | `/memberships/expiring` | Expiring soon |
| GET | `/reports/caja` | Cash register report |
