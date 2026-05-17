'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AdminLayout from '@/components/AdminLayout'
import { Plus, Save, Edit2, X, CheckCircle2, Package } from 'lucide-react'

const ALL_MODULES = [
  { key:'accounting',   label:'Accounting (Journal, COA, Trial Balance)' },
  { key:'transactions', label:'Transactions (Invoices, Bills, Expenses)' },
  { key:'contacts',     label:'Contacts' },
  { key:'banking',      label:'Banking & Reconciliation' },
  { key:'inventory',    label:'Inventory & Stock' },
  { key:'payroll',      label:'Payroll (PAYE, NHIF, NSSF)' },
  { key:'tax',          label:'Tax & Compliance' },
  { key:'analytics',    label:'Analytics & AI Insights' },
  { key:'budgeting',    label:'Budgets' },
  { key:'pos',          label:'Point of Sale (POS)' },
  { key:'reports',      label:'Advanced Reports' },
]

const TIER_COLORS: Record<string, string> = {
  free:'var(--sub)', starter:'var(--brand)',
  pro:'var(--purple)', enterprise:'var(--warning)'
}

export default function PackagesPage() {
  const supabase = createClient()
  const [tiers, setTiers]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({
    name:'', slug:'', price_kes:'', max_users:'', max_transactions:'',
    enabled_modules:[] as string[], features:'', sort_order:'0',
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('tiers').select('*').order('sort_order')
    setTiers(data || [])
    setLoading(false)
  }

  const openEdit = (tier: any) => {
    setEditing(tier)
    setForm({
      name: tier.name, slug: tier.slug,
      price_kes: String(tier.price_kes),
      max_users: String(tier.max_users),
      max_transactions: String(tier.max_transactions),
      enabled_modules: tier.enabled_modules || [],
      features: (tier.features || []).join('\n'),
      sort_order: String(tier.sort_order),
    })
  }

  const openCreate = () => {
    setEditing('new')
    setForm({ name:'', slug:'', price_kes:'0', max_users:'1', max_transactions:'100', enabled_modules:[], features:'', sort_order:'99' })
  }

  const toggleModule = (key: string) =>
    setForm(p => ({
      ...p,
      enabled_modules: p.enabled_modules.includes(key)
        ? p.enabled_modules.filter(m => m !== key)
        : [...p.enabled_modules, key]
    }))

  const saveTier = async () => {
    if (!form.name || !form.slug) { alert('Name and slug required'); return }
    setSaving(true)
    const payload = {
      name: form.name, slug: form.slug.toLowerCase().replace(/\s+/g,'-'),
      price_kes: Number(form.price_kes)||0,
      max_users: Number(form.max_users)||1,
      max_transactions: Number(form.max_transactions)||100,
      enabled_modules: form.enabled_modules,
      features: form.features.split('\n').map(f=>f.trim()).filter(Boolean),
      sort_order: Number(form.sort_order)||0,
    }
    if (editing === 'new') {
      await supabase.from('tiers').insert({ ...payload, is_active:true })
    } else {
      await supabase.from('tiers').update(payload).eq('id', editing.id)
      // Push updated modules to all orgs on this tier
      const { data: subs } = await supabase.from('org_subscriptions')
        .select('organization_id').eq('tier_id', editing.id).eq('status','active')
      if (subs && subs.length > 0) {
        await Promise.all(subs.map((s:any) =>
          supabase.from('organizations').update({
            settings: { enabled_modules: form.enabled_modules }
          }).eq('id', s.organization_id)
        ))
      }
    }
    setSaving(false)
    setEditing(null)
    load()
  }

  const toggleActive = async (tier: any) => {
    await supabase.from('tiers').update({ is_active: !tier.is_active }).eq('id', tier.id)
    load()
  }

  return (
    <AdminLayout>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.25rem', color:'var(--text)' }}>Packages & Tiers</h1>
            <p style={{ color:'var(--sub)', fontSize:'0.8125rem', marginTop:2 }}>
              Control which modules each pricing tier unlocks
            </p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={14}/>New Tier</button>
        </div>

        {/* Tier cards */}
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
            {Array(4).fill(0).map((_,i) => <div key={i} className="card skel" style={{ height:320 }}/>)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
            {tiers.map(tier => (
              <div key={tier.id} className="card" style={{ padding:0, overflow:'hidden', opacity:tier.is_active?1:0.6 }}>
                {/* Header */}
                <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:TIER_COLORS[tier.slug]||'var(--sub)' }}/>
                      <h3 style={{ fontWeight:700, color:'var(--text)', fontSize:'1rem' }}>{tier.name}</h3>
                      {!tier.is_active && <span className="badge badge-gray">Inactive</span>}
                    </div>
                    <p style={{ fontSize:'1.25rem', fontWeight:700, color:TIER_COLORS[tier.slug]||'var(--sub)', marginTop:4 }}>
                      KES {Number(tier.price_kes).toLocaleString()}
                      <span style={{ fontSize:'0.75rem', fontWeight:400, color:'var(--sub)' }}>/mo</span>
                    </p>
                  </div>
                  <button className="btn btn-ghost" onClick={()=>openEdit(tier)} style={{ padding:'4px 10px', fontSize:'0.75rem' }}>
                    <Edit2 size={12}/>Edit
                  </button>
                </div>

                {/* Limits */}
                <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', gap:16 }}>
                  {[
                    { label:'Users',   val:tier.max_users },
                    { label:'Txn/mo',  val:tier.max_transactions===999999?'∞':tier.max_transactions },
                  ].map(l => (
                    <div key={l.label}>
                      <p style={{ fontSize:'0.6875rem', color:'var(--sub)' }}>{l.label}</p>
                      <p style={{ fontWeight:700, color:'var(--text)' }}>{l.val}</p>
                    </div>
                  ))}
                </div>

                {/* Modules */}
                <div style={{ padding:'12px 20px', flex:1 }}>
                  <p style={{ fontSize:'0.6875rem', fontWeight:600, color:'var(--sub)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
                    Modules
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {ALL_MODULES.map(m => {
                      const on = (tier.enabled_modules || []).includes(m.key)
                      return (
                        <div key={m.key} style={{ display:'flex', alignItems:'center', gap:6, opacity:on?1:0.35 }}>
                          <div style={{ width:14, height:14, borderRadius:4, background:on?'rgba(52,209,122,0.15)':'rgba(136,145,164,0.1)', border:`1px solid ${on?'var(--success)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            {on && <CheckCircle2 size={9} style={{ color:'var(--success)' }}/>}
                          </div>
                          <span style={{ fontSize:'0.75rem', color:on?'var(--text)':'var(--sub)' }}>{m.label.split('(')[0].trim()}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ padding:'10px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={()=>toggleActive(tier)}
                    className={`btn ${tier.is_active?'btn-danger':'btn-ghost'}`}
                    style={{ fontSize:'0.75rem', padding:'4px 12px' }}>
                    {tier.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Create modal */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e=>e.target===e.currentTarget&&setEditing(null)}>
          <div className="card fade-up" style={{ width:'100%', maxWidth:560, maxHeight:'90vh', display:'flex', flexDirection:'column', padding:0 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h2 style={{ fontWeight:700, color:'var(--text)' }}>{editing==='new'?'New Tier':'Edit '+editing.name}</h2>
              <button onClick={()=>setEditing(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--sub)' }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label className="lbl">Tier Name *</label>
                  <input className="inp" placeholder="Pro" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/>
                </div>
                <div>
                  <label className="lbl">Slug * (no spaces)</label>
                  <input className="inp" placeholder="pro" value={form.slug} onChange={e=>setForm(p=>({...p,slug:e.target.value}))}/>
                </div>
                <div>
                  <label className="lbl">Price (KES/month)</label>
                  <input className="inp" type="number" min="0" value={form.price_kes} onChange={e=>setForm(p=>({...p,price_kes:e.target.value}))}/>
                </div>
                <div>
                  <label className="lbl">Max Users</label>
                  <input className="inp" type="number" min="1" value={form.max_users} onChange={e=>setForm(p=>({...p,max_users:e.target.value}))}/>
                </div>
                <div>
                  <label className="lbl">Max Transactions/mo</label>
                  <input className="inp" type="number" min="0" value={form.max_transactions} onChange={e=>setForm(p=>({...p,max_transactions:e.target.value}))}/>
                </div>
                <div>
                  <label className="lbl">Sort Order</label>
                  <input className="inp" type="number" value={form.sort_order} onChange={e=>setForm(p=>({...p,sort_order:e.target.value}))}/>
                </div>
              </div>

              {/* Modules */}
              <div>
                <label className="lbl" style={{ marginBottom:10 }}>Enabled Modules (tick to include)</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {ALL_MODULES.map(m => {
                    const on = form.enabled_modules.includes(m.key)
                    return (
                      <button key={m.key} onClick={()=>toggleModule(m.key)}
                        style={{
                          display:'flex', alignItems:'center', gap:8, padding:'7px 10px',
                          borderRadius:8, cursor:'pointer', textAlign:'left',
                          background: on?'rgba(52,209,122,0.07)':'transparent',
                          border: `1px solid ${on?'var(--success)':'var(--border)'}`,
                          color: on?'var(--success)':'var(--sub)',
                          fontSize:'0.75rem',
                        }}>
                        <div style={{ width:14, height:14, borderRadius:4, background:on?'rgba(52,209,122,0.15)':'rgba(136,145,164,0.1)', border:`1px solid ${on?'var(--success)':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {on&&<CheckCircle2 size={9} style={{ color:'var(--success)' }}/>}
                        </div>
                        {m.label.split('(')[0].trim()}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="lbl">Feature Bullets (one per line)</label>
                <textarea className="inp" rows={4} placeholder="Journal entries&#10;Chart of accounts&#10;Trial balance"
                  value={form.features} onChange={e=>setForm(p=>({...p,features:e.target.value}))}
                  style={{ resize:'vertical' }}/>
              </div>
            </div>

            <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2, justifyContent:'center' }} onClick={saveTier} disabled={saving}>
                {saving
                  ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>Saving…
                    </span>
                  : <><Save size={14}/>{editing==='new'?'Create Tier':'Save & Push to Users'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  )
}
