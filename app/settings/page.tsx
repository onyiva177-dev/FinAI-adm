'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import AdminLayout from '@/components/AdminLayout'
import { Shield, UserPlus, Save, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const supabase = createClient()
  const [admins, setAdmins]       = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [newAdmin, setNewAdmin]   = useState({ email:'', name:'', role:'admin' })
  const [currentAdmin, setCurrentAdmin] = useState<any>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: admins } = await supabase.from('admin_users').select('*').order('created_at')
    setAdmins(admins || [])
    const me = admins?.find((a:any) => a.user_id === session?.user?.id)
    setCurrentAdmin(me)
    setLoading(false)
  }

  const addAdmin = async () => {
    if (!newAdmin.email || !newAdmin.name) { toast.error('Email and name required'); return }
    setSaving(true)
    // Look up the auth user by email — they must already have a Supabase account
    const { data: users, error } = await supabase.auth.admin?.listUsers?.() || { data: null, error: null }
    // Note: admin.listUsers requires service role — in practice, the admin must first
    // create their account via the main FinAI app, then you add them here by their user_id.
    // For now we store email and the user links themselves on first login.
    const { error: insertError } = await supabase.from('admin_users').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // Placeholder — update after they log in
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      is_active: false, // Inactive until linked
    })
    if (insertError) { toast.error('Failed: '+insertError.message); setSaving(false); return }
    toast.success(`${newAdmin.name} invited — they must sign in with ${newAdmin.email} to activate`)
    setNewAdmin({ email:'', name:'', role:'admin' })
    setSaving(false)
    load()
  }

  const toggleAdmin = async (admin: any) => {
    if (admin.id === currentAdmin?.id) { toast.error("Can't deactivate yourself"); return }
    await supabase.from('admin_users').update({ is_active: !admin.is_active }).eq('id', admin.id)
    load()
  }

  const removeAdmin = async (admin: any) => {
    if (admin.id === currentAdmin?.id) { toast.error("Can't remove yourself"); return }
    if (!confirm(`Remove ${admin.name} from admin panel?`)) return
    await supabase.from('admin_users').delete().eq('id', admin.id)
    load()
  }

  return (
    <AdminLayout>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:700 }}>
        <div>
          <h1 style={{ fontWeight:700, fontSize:'1.25rem', color:'var(--text)' }}>Admin Settings</h1>
          <p style={{ color:'var(--sub)', fontSize:'0.8125rem', marginTop:2 }}>
            Manage who has access to this control panel
          </p>
        </div>

        {/* Current admin info */}
        {currentAdmin && (
          <div className="card" style={{ padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(79,142,247,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--brand)', fontSize:'1.1rem', flexShrink:0 }}>
                {currentAdmin.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight:600, color:'var(--text)' }}>{currentAdmin.name}</p>
                <p style={{ fontSize:'0.8rem', color:'var(--sub)' }}>{currentAdmin.email}</p>
              </div>
              <span className="badge badge-purple" style={{ marginLeft:'auto', textTransform:'capitalize' }}>
                {currentAdmin.role}
              </span>
              <span className="badge badge-green">You</span>
            </div>
          </div>
        )}

        {/* Admin users list */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
            <Shield size={15} style={{ color:'var(--brand)' }}/>
            <h3 style={{ fontWeight:600, color:'var(--text)' }}>Admin Accounts</h3>
            <span className="badge badge-gray" style={{ marginLeft:'auto' }}>{admins.length}</span>
          </div>
          {loading ? (
            <div style={{ padding:20 }}>{Array(2).fill(0).map((_,i) => <div key={i} className="skel" style={{ height:52, borderRadius:8, marginBottom:8 }}/>)}</div>
          ) : (
            <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
              {admins.map(admin => (
                <div key={admin.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:8,
                  background: admin.is_active ? 'transparent' : 'rgba(247,81,81,0.04)',
                  border: `1px solid ${admin.id===currentAdmin?.id ? 'var(--brand)' : 'var(--border)'}`,
                  opacity: admin.is_active ? 1 : 0.6,
                }}>
                  <div style={{ width:34, height:34, borderRadius:'50%', background:'rgba(79,142,247,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'var(--brand)', flexShrink:0 }}>
                    {admin.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:600, color:'var(--text)', fontSize:'0.875rem' }}>{admin.name}</p>
                    <p style={{ fontSize:'0.75rem', color:'var(--sub)' }}>{admin.email} · Joined {formatDate(admin.created_at)}</p>
                  </div>
                  <span className={`badge ${admin.role==='super_admin'?'badge-amber':'badge-blue'}`} style={{ textTransform:'capitalize', flexShrink:0 }}>
                    {admin.role?.replace('_',' ')}
                  </span>
                  <span className={`badge ${admin.is_active?'badge-green':'badge-gray'}`} style={{ flexShrink:0 }}>
                    {admin.is_active?'Active':'Inactive'}
                  </span>
                  {admin.id !== currentAdmin?.id && (
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button className="btn btn-ghost" onClick={()=>toggleAdmin(admin)}
                        style={{ padding:'4px 8px', fontSize:'0.75rem' }}>
                        {admin.is_active?'Deactivate':'Activate'}
                      </button>
                      <button className="btn btn-danger" onClick={()=>removeAdmin(admin)}
                        style={{ padding:'4px 8px', fontSize:'0.75rem' }}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new admin */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
            <UserPlus size={15} style={{ color:'var(--brand)' }}/>
            <h3 style={{ fontWeight:600, color:'var(--text)' }}>Invite Admin</h3>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label className="lbl">Full Name *</label>
                <input className="inp" placeholder="Evans Onjiri" value={newAdmin.name}
                  onChange={e=>setNewAdmin(p=>({...p,name:e.target.value}))}/>
              </div>
              <div>
                <label className="lbl">Email *</label>
                <input className="inp" type="email" placeholder="admin@finai.app" value={newAdmin.email}
                  onChange={e=>setNewAdmin(p=>({...p,email:e.target.value}))}/>
              </div>
            </div>
            <div>
              <label className="lbl">Role</label>
              <select className="inp" value={newAdmin.role} onChange={e=>setNewAdmin(p=>({...p,role:e.target.value}))}>
                <option value="admin">Admin (read + manage users)</option>
                <option value="super_admin">Super Admin (full access)</option>
              </select>
            </div>

            <div style={{ display:'flex', gap:8, padding:'10px 14px', borderRadius:8, background:'rgba(245,166,35,0.07)', border:'1px solid rgba(245,166,35,0.2)' }}>
              <AlertTriangle size={14} style={{ color:'var(--warning)', flexShrink:0, marginTop:1 }}/>
              <p style={{ fontSize:'0.8rem', color:'var(--warning)' }}>
                The invited person must already have a FinAI account with this email.
                They will be activated the next time they sign into the admin panel.
              </p>
            </div>

            <button className="btn btn-primary" onClick={addAdmin} disabled={saving}
              style={{ alignSelf:'flex-start' }}>
              {saving
                ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>Saving…
                  </span>
                : <><UserPlus size={14}/>Add Admin</>}
            </button>
          </div>
        </div>

        {/* Privacy note */}
        <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, background:'rgba(52,209,122,0.05)', border:'1px solid rgba(52,209,122,0.15)' }}>
          <CheckCircle2 size={15} style={{ color:'var(--success)', flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:'0.8rem', color:'var(--sub)' }}>
            <p style={{ fontWeight:600, color:'var(--success)', marginBottom:4 }}>Privacy by Design</p>
            <p>This admin panel never exposes user financial data. Transactions, journal entries, invoices, and account balances are only accessible by the organisations that own them. Admins can see: organisation name, sector, user count, entry count, tier assignment, and activity timestamps only.</p>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  )
}
