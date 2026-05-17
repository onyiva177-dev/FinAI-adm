# FinAI Admin Panel

A separate Next.js 15 application that connects to the **same Supabase project** as FinAI but is deployed independently. Only authorised admin accounts can log in.

---

## What it does

| Page | Purpose |
|------|---------|
| `/dashboard` | Platform KPIs — org count, user count, activity chart |
| `/users` | All organisations — assign tiers, suspend accounts |
| `/packages` | Create/edit pricing tiers and their module permissions |
| `/activity` | Activity log — logins, page views, admin actions |
| `/settings` | Manage admin users |

## What it CANNOT see

- Journal entries or their amounts
- Invoice or transaction details
- Account balances
- Payroll figures
- Any password or KRA PIN

---

## Setup

### 1. Run the SQL first
Run `ADMIN_SETUP.sql` in your Supabase SQL Editor (same project as main app).

### 2. Register yourself as admin
```sql
INSERT INTO admin_users (user_id, email, name, role)
SELECT id, 'your@email.com', 'Your Name', 'super_admin'
FROM auth.users WHERE email = 'your@email.com';
```

### 3. Clone and configure
```bash
git clone https://github.com/YOUR_USERNAME/finai-admin
cd finai-admin
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# (same values as your main FinAI app)
npm install
npm run dev  # runs on port 3001
```

### 4. Deploy to Vercel
- Create a **new Vercel project** pointing to this repo
- Add the same env vars as your main app
- Deploy — it will be at a different URL (e.g. `admin.finai.app`)

---

## Activity Tracking in the Main App

Add this to your main FinAI `app/dashboard/layout.tsx` to track page visits:

```typescript
// After user is confirmed logged in:
const logActivity = async (page: string) => {
  await fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'page_view', page }),
  }).catch(() => {})  // fire and forget
}

// Call on pathname change:
useEffect(() => { logActivity(pathname) }, [pathname])
```

Also call on login:
```typescript
await fetch('/api/log', { method:'POST', ... body: { action:'login', page:'/login' } })
```

---

## Tier module control

When you change a tier in `/packages`, it:
1. Updates the `tiers` table (the tier definition)
2. Pushes `enabled_modules` to `organizations.settings` for every active subscriber

The main FinAI layout reads `organization.settings.enabled_modules` and hides nav items that are not in the list. So module changes take effect **on the user's next page load** — no app restart needed.

---

## Security model

- Admin panel has its own auth check in `AdminLayout.tsx` — every page verifies the user exists in `admin_users` with `is_active = true`
- The `admin_get_org_overview` RPC is `SECURITY DEFINER` — it only returns aggregate data, never raw financial rows
- `activity_log` has no UPDATE or DELETE RLS policy — it is append-only
- Financial data (transactions, journal entries, balances) is never queried by any admin page
