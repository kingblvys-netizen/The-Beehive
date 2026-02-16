This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Knowledge + Announcements

The app now supports two content destinations managed from one editor:

- Public announcements feed: `/knowledge`
- Public announcement page: `/knowledge/[slug]`
- Staff internal docs: `/staff-knowledge`
- Staff internal document page: `/staff-knowledge/[slug]`
- Manager editor: `/admin/knowledge`

### Capabilities

- Create, edit, publish/unpublish, and delete content
- Choose post target per item: **Admin Knowledge Page (Staff/Internal)** or **Public Announcement Page**
- Organize with categories (rules, commands, procedures, etc.)
- Search across content metadata/body
- Markdown authoring with live preview
- One-click templates (Rules, Commands, Procedure, Mobile Quick Guide)
- Auto-save drafts, duplicate content workflow, and copy-link sharing
- Mobile-friendly editing/reading controls and touch targets
- Access control:
	- Everyone can read **public announcements** (`/knowledge`)
	- Staff and Managers/Admin can read **internal staff docs** (`/staff-knowledge`)
	- Managers/Admin can create/edit/delete content and manage destinations
	- Staff can enter Admin Panel in read-only mode for application review + staff knowledge access
	- Access is managed in Admin Panel via Discord ID role assignment (Staff/Manager)
	- Access actions are tracked in admin activity logs (Access Audit)

### Storage

Content is stored in a `knowledge_articles` PostgreSQL table. The table is auto-created on first knowledge API access.

### Data Minimization

- Applications store only Discord user ID, Discord username, role metadata, and application answers.
- Identity-like fields in submitted `answers` are stripped server-side to avoid duplicated personal data storage.
- Knowledge content is stored with admin author/update identifiers for auditability.

### Retention Cleanup

- Endpoint: `/api/admin/cleanup-applications` (POST)
- Deletes old application rows for statuses `declined` and/or `reset`.
- Default retention window is `APPLICATION_RETENTION_DAYS` from `lib/config.ts`.

Request body (optional):

```json
{
	"dryRun": true,
	"days": 180,
	"includeDeclined": true,
	"includeReset": true
}
```

Auth options:

- Admin session (dashboard/manual call), or
- Bearer token via `CLEANUP_CRON_SECRET` env var (for scheduled Vercel Cron).

Suggested Vercel Cron setup:

- Create `CLEANUP_CRON_SECRET` in Vercel env vars.
- Schedule a cron job (for example weekly).
- Call `POST /api/admin/cleanup-applications` with `Authorization: Bearer <CLEANUP_CRON_SECRET>`.

## Release Notes (Feb 2026)

- Added role-based access split:
	- Staff can open the Admin Panel in read-only mode.
	- Managers/Admin retain full management controls.
- Separated content destinations:
	- Public announcements for everyone at `/knowledge`.
	- Internal staff docs at `/staff-knowledge`.
- Updated editor and import flow so destination/audience is explicit per post.
- Added and standardized back navigation for knowledge/announcement pages.
- Completed end-to-end copy polish for public, staff, admin, API messages, and docs.
- Verified final state with clean ESLint runs.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
