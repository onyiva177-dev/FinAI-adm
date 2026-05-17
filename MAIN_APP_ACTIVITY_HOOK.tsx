// ─────────────────────────────────────────────────────────────────────────────
// COPY THIS FILE into the main FinAI app:
//   app/dashboard/layout.tsx — inside the DashboardLayout component
//
// This adds activity tracking so the Admin Panel can see page visits.
// It fires a lightweight POST to /api/log on every page change.
// No financial data is ever sent.
// ─────────────────────────────────────────────────────────────────────────────

// 1. Add this hook INSIDE your existing DashboardLayout component,
//    after the session/profile is confirmed:

/*
  useEffect(() => {
    if (!profile) return                          // not logged in yet
    const log = (action: string, extra?: object) =>
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, page: pathname, ...extra }),
      }).catch(() => {})                          // fire-and-forget, never blocks UI

    log('page_view')                             // log every page navigation
  }, [pathname, profile])
*/

// 2. Create this API route in the MAIN FinAI app at:
//    app/api/log/route.ts
//    (Copy the content from the admin panel's app/api/log/route.ts)

// 3. Log login event — add to your login page handleSignIn() after success:
/*
  await fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', page: '/login' }),
  }).catch(() => {})
*/

// 4. Log logout — add to handleSignOut():
/*
  await fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout', page: pathname }),
  }).catch(() => {})
*/

export {} // module export — this file is instructions only
