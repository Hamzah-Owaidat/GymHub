# GymHub – App routing structure

## Public & auth
| Path | Description |
|------|--------------|
| `/` | Landing (guests) or user home with navbar (logged-in) |
| `/signin` | Sign in (auth layout) |
| `/signup` | Sign up (auth layout) |

## User area `(user)` – requires auth
Layout: `UserLayout` (fixed navbar: Home, Gyms, Sessions, profile dropdown, theme).
| Path | Description |
|------|--------------|
| `/gyms` | Gyms list (placeholder) |
| `/sessions` | Sessions (placeholder) |
| `/profile` | User profile |

## Dashboard – all dashboard pages under `/dashboard`
Layout: `DashboardLayout` (sidebar + header). Reusable components from the former `(admin)` group live under `src/components/`, `src/layout/`, etc.
| Path | Description |
|------|--------------|
| `/dashboard` | Main dashboard (Ecommerce) |
| `/dashboard/profile` | Dashboard profile |
| `/dashboard/calendar` | Calendar |
| `/dashboard/blank` | Blank page |
| `/dashboard/bar-chart` | Bar chart |
| `/dashboard/line-chart` | Line chart |
| `/dashboard/form-elements` | Form elements |
| `/dashboard/basic-tables` | Basic tables |
| `/dashboard/badge` | Badge UI |
| `/dashboard/buttons` | Buttons UI |
| `/dashboard/alerts` | Alerts UI |
| `/dashboard/modals` | Modals UI |
| `/dashboard/avatars` | Avatars UI |
| `/dashboard/videos` | Videos UI |
| `/dashboard/images` | Images UI |

## Folder structure
- `app/page.tsx` – Root: landing or user home (conditional on auth).
- `app/landing/page.tsx` – Landing page component (used by root when not authenticated).
- `app/(user)/layout.tsx` – Auth guard + `UserLayout` for `/gyms`, `/sessions`, `/profile`.
- `app/(user)/gyms|sessions|profile/page.tsx` – User area pages.
- `app/dashboard/layout.tsx` – Sidebar + header for all `/dashboard/*` routes.
- `app/dashboard/page.tsx` – Main dashboard; `app/dashboard/**/page.tsx` – Dashboard subpages.
- `app/auth/` – Sign in / sign up pages.

No route groups share the same URL: user profile is `/profile`, dashboard profile is `/dashboard/profile`.
