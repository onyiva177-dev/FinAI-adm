import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL  = 'https://ubswompebgkwpohwhaij.supabase.co'
const SUPABASE_ANON = 'PASTE_YOUR_ANON_KEY_HERE'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, page, metadata } = body

    const ALLOWED_ACTIONS = [
      'login','logout','page_view','feature_used',
      'archive_unlock_failed','admin_subscription_change','admin_org_suspended',
    ]
    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ error: 'Action not allowed' }, { status: 400 })
    }

    // Get auth token from request header
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No auth token' }, { status: 401 })
    }

    // Get user from token
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` }
    })
    if (!userRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const user = await userRes.json()

    // Get profile
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=organization_id&limit=1`,
      { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${token}` } }
    )
    const profiles = await profileRes.json()
    const orgId = profiles?.[0]?.organization_id || null

    // Strip financial fields
    const safeMetadata = { ...metadata }
    ;['amount','balance','debit','credit','salary','total','tax_amount','password'].forEach(k => delete safeMetadata[k])

    // Insert log
    await fetch(`${SUPABASE_URL}/rest/v1/activity_log`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        organization_id: orgId,
        user_id: user.id,
        action,
        page: page || null,
        metadata: safeMetadata,
      })
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
