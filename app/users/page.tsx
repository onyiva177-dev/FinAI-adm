'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { timeAgo, formatDate } from '@/lib/utils'
import AdminLayout from '@/components/AdminLayout'
import {
  Search, Filter, Building2, Users, ChevronDown,
  X, Save, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink
} from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-green', suspended: 'badge-red',
  trial: 'badge-amber', cancelled: 'badge-gray', none: 'badge-gray'
}
const TIER_BADGE: Record<string, string> = {
  Free: 'badge-gray', Starter: 'badge-blue', Pro: 'badge-purple', Enterprise: 'badge-amber'
}

export default function UsersPage() {
  const supabase = createClient()
  const [orgs, setOrgs]         = useState<any[]>([])
  const [tiers, setTiers]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [selected, setSelected] = useState<any>(null)  // org being edited
  const [saving, setSaving]     = useState(false)
  const [editForm, setEditForm] = useState({ tier_id:'', status:'active', notes:'' })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const [{ data: overview }, { data: tierList }] = await Promise.all([
      supabase.rpc('admin_get_org_overview'),
      supabase.from('tiers').select('*').eq('is_active', true).order('sort_order'),
    ])
    setOrgs(overview || [])
    setTiers(tierList || [])
    setLoading(false)
  }

  const openEdit = async (org: any) => {
    // Load current subscription
    const { data: sub } = await supabase.from('org_subscriptions')
      .select('*, tier:tiers(id,name)').eq('organization_id', org.org_id)
      .order('assigned_at', { ascending:false }).limit(1).single()
    setEditForm({
      tier_id: sub?.tier_id || '',
      status:  sub?.status  || 'active',
      notes:   sub?.notes   || '',
    })
    setSelected(org)
  }

  const saveSubscription = async () => {
    if (!selected || !editForm.tier_id) { alert('Select a tier'); return }
    setSaving(true)
    const { data: adminUser } = await supabase.from('admin_users')
      .select('id').eq('is_active', true).single()

    // Upsert subscription
    const { data: existingSub } = await supabase.from('org_subscriptions')
      .select('id').eq('organization_id', selected.org_id).single()

    if (existingSub) {
      await supabase.from('org_subscriptions').update({
        tier_id:    editForm.tier_id,
        status:     editForm.status,
        notes:      editForm.notes,
        assigned_at: new Date().toISOString(),
      }).eq('id', existingSub.id)
    } else {
      await supabase.from('org_subscriptions').insert({
        organization_id: selected.org_id,
        tier_id:         editForm.tier_id,
        status:          editForm.status,
        notes:           editForm.notes,
        assigned_by:     adminUser?.id || null,
      })
    }

    // Update the org's settings with enabled_modules from selected tier
    const selectedTier = tiers.find(t => t.id === editForm.tier_id)
    if (selectedTier) {
      await supabase.from('organizations').update({
        settings: { enabled_modules: selectedTier.enabled_modules }
      }).eq('id', selected.org_id)
    }

    // Log admin action to activity log
    await supabase.from('activity_log').insert({
      organization_id: selected.org_id,
      action: 'admin_subscription_change',
      page: '/admin/users',
      metadata: {
        tier_name: selectedTier?.name,
        status: editForm.status,
        notes: editForm.notes,
      }
    })

    setSaving(false)
    setSelected(null)
    load()
  }

  const suspendOrg = async (orgId: string) => {
    if (!confirm('Suspend this organisation? Their users will lose access immediately.')) return
    const { data: sub } = await supabase.from('org_subscriptions')
      .select('id').eq('organization_id', orgId).single()
    if (sub) {
      await supabase.from('org_subscriptions').update({ status:'suspended' }).eq('id', sub.id)
    }
    await supabase.from('activity_log').insert({
      organization_id: orgId, action:'admin_org_suspended', page:'/admin/users',
      metadata: { by_admin: true }
    })
    load()
  }

  const filtered = orgs.filter(o =>
    (filter === 'all' || o.sub_status === filter || o.tier_name === filter) &&
    (!search || o.org_name?.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <AdminLayout>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.25rem', color:'var(--text)' }}>Users & Organisations</h1>
            <p style={{ color:'var(--sub)', fontSize:'0.8125rem', marginTop:2 }}>
              {orgs.length} organisations · {orgs.reduce((s,o)=>s+Number(o.user_count),0)} total users
            </p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14}/>Refresh
          </button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--sub)' }}/>
            <input className="inp" placeholder="Search organisations…" value={search}
              onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32 }}/>
          </div>
          {['all','active','suspended','trial','Free','Starter','Pro','Enterprise'].map(f => (
            <button key={f} onClick={()=>setFilter(f)} className="btn"
              style={{
                background: filter===f ? 'var(--brand)' : 'transparent',
                color: filter===f ? 'white' : 'var(--sub)',
                border: `1px solid ${filter===f ? 'var(--brand)' : 'var(--border)'}`,
                fontSize:'0.75rem', padding:'5px 12px',
              }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card">
          <div style={{ overflowX:'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Sector</th>
                  <th>Country</th>
                  <th>Users</th>
                  <th>Entries</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Last Active</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array(8).fill(0).map((_,i)=>(
                  <tr key={i}>{Array(10).fill(0).map((_,j)=>(
                    <td key={j}><div className="skel" style={{ height:14, borderRadius:4 }}/></td>
                  ))}</tr>
                )) : filtered.length===0 ? (
                  <tr><td colSpan={10} style={{ textAlign:'center', padding:'40px 0', color:'var(--sub)' }}>
                    No organisations match this filter
                  </td></tr>
                ) : filtered.map((o:any) => (
                  <tr key={o.org_id}>
                    <td style={{ fontWeight:600, color:'var(--text)', whiteSpace:'nowrap' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:7, background:'rgba(79,142,247,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <Building2 size={13} style={{ color:'var(--brand)' }}/>
                        </div>
                        {o.org_name}
                      </div>
                    </td>
                    <td style={{ textTransform:'capitalize' }}>{o.sector||'—'}</td>
                    <td>{o.country||'KE'}</td>
                    <td>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                        <Users size={11} style={{ color:'var(--sub)' }}/>{o.user_count}
                      </span>
                    </td>
                    <td>{o.entry_count}</td>
                    <td><span className={`badge ${TIER_BADGE[o.tier_name]||'badge-gray'}`}>{o.tier_name}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[o.sub_status]||'badge-gray'}`}>{o.sub_status}</span></td>
                    <td style={{ whiteSpace:'nowrap' }}>{formatDate(o.created_at)}</td>
                    <td style={{ whiteSpace:'nowrap' }}>{timeAgo(o.last_activity)}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        <button className="btn btn-ghost" onClick={()=>openEdit(o)}
                          style={{ padding:'4px 10px', fontSize:'0.75rem' }}>
                          Manage
                        </button>
                        {o.sub_status !== 'suspended' && (
                          <button className="btn btn-danger" onClick={()=>suspendOrg(o.org_id)}
                            style={{ padding:'4px 10px', fontSize:'0.75rem' }}>
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manage Org modal */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div className="card fade-up" style={{ width:'100%', maxWidth:480, padding:0, overflow:'hidden' }}>
            {/* Header */}
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h2 style={{ fontWeight:700, color:'var(--text)', fontSize:'1rem' }}>{selected.org_name}</h2>
                <p style={{ fontSize:'0.75rem', color:'var(--sub)', marginTop:2 }}>
                  {selected.user_count} users · {selected.entry_count} journal entries · joined {formatDate(selected.created_at)}
                </p>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--sub)' }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16 }}>
              {/* Warning */}
              <div style={{ display:'flex', gap:10, padding:'10px 14px', borderRadius:8, background:'rgba(245,166,35,0.08)', border:'1px solid rgba(245,166,35,0.2)' }}>
                <AlertTriangle size={15} style={{ color:'var(--warning)', flexShrink:0, marginTop:1 }}/>
                <p style={{ fontSize:'0.8rem', color:'var(--warning)' }}>
                  Changing the tier updates which modules this organisation can access immediately.
                  No financial data is modified.
                </p>
              </div>

              {/* Tier */}
              <div>
                <label className="lbl">Package / Tier</label>
                <select className="inp" value={editForm.tier_id} onChange={e=>setEditForm(p=>({...p,tier_id:e.target.value}))}>
                  <option value="">— Select tier —</option>
                  {tiers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — KES {t.price_kes.toLocaleString()}/mo · {t.max_users} users
                    </option>
                  ))}
                </select>
                {editForm.tier_id && (
                  <div style={{ marginTop:8, padding:'8px 12px', borderRadius:8, background:'rgba(79,142,247,0.07)', border:'1px solid rgba(79,142,247,0.15)' }}>
                    <p style={{ fontSize:'0.75rem', color:'var(--brand)', fontWeight:600, marginBottom:4 }}>Enabled modules:</p>
                    <p style={{ fontSize:'0.75rem', color:'var(--sub)' }}>
                      {(tiers.find(t=>t.id===editForm.tier_id)?.enabled_modules as string[])?.join(', ')||'None'}
                    </p>
                  </div>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="lbl">Subscription Status</label>
                <select className="inp" value={editForm.status} onChange={e=>setEditForm(p=>({...p,status:e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="trial">Trial</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="lbl">Admin Notes (private)</label>
                <textarea className="inp" rows={3} placeholder="Notes about this account…"
                  value={editForm.notes} onChange={e=>setEditForm(p=>({...p,notes:e.target.value}))}
                  style={{ resize:'vertical', height:'auto' }}/>
              </div>
            </div>

            <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={()=>setSelected(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2, justifyContent:'center' }} onClick={saveSubscription} disabled={saving}>
                {saving
                  ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
                      Saving…
                    </span>
                  : <><Save size={14}/>Save & Apply</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  )
}
