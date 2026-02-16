# Team Update — Feb 2026

## What Was Added
- Role-based access split:
  - Staff can open the Admin Panel in read-only mode.
  - Managers/Admin keep full control permissions.
- Public/internal content separation:
  - Public announcements at `/knowledge`.
  - Internal staff docs at `/staff-knowledge`.
- Destination-aware publishing:
  - Editor and bulk import now explicitly choose internal vs public target.

## What Was Improved
- Navigation polish:
  - Added/standardized back navigation on knowledge and staff knowledge pages.
- Wording consistency pass:
  - Public pages use announcement language.
  - Internal pages use staff knowledge/document language.
  - Shared API/admin messaging uses neutral content language.
- README documentation refresh:
  - Updated capabilities/access wording.
  - Added release notes section for this rollout.

## Security/Access Behavior (Current)
- Everyone: can read public announcements.
- Staff + Managers/Admin: can read internal staff docs.
- Staff: can access Admin Panel in read-only mode (no manager controls).
- Managers/Admin: can manage knowledge content/import, logs, and access control.

## Key Areas Updated
- UI routes/pages:
  - `app/knowledge/*`
  - `app/staff-knowledge/*`
  - `app/admin/knowledge/*`
  - `app/admin/page.tsx`
  - `app/page.tsx`
- Knowledge APIs:
  - `app/api/knowledge/articles/route.ts`
  - `app/api/knowledge/articles/[id]/route.ts`
  - `app/api/knowledge/import/route.ts`
- Docs:
  - `README.md`

## Validation
- ESLint run completed clean after the final sweep.

## Suggested Team Blurb (Copy/Paste)
“We shipped a full access + content model polish. Staff now have read-only admin panel access, while manager controls remain restricted. Knowledge is now split clearly into public announcements (`/knowledge`) and internal staff docs (`/staff-knowledge`), and editor/import flows require explicit destination targeting. We also completed end-to-end wording and navigation consistency, with clean lint validation.”
