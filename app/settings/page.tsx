'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import AdminLayout from '@/components/AdminLayout'
import { Shield, UserPlus, Save, Trash2, AlertTriangle, CheckCircle2, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'

// Admin permission presets
const PERMISSION_PRESETS = [
  {
    role: 'super_admin',
    label: 'Super Admin',
    desc: 'Full access to everything',
    permissions: {
      pages: ['dashboard','users','packages','activity','settings'],
      can_suspend: true,
      can_change_tier: true,
      can_manage_admins: true,
    },
  },
  {
    role: 'billing_admin',
    label: 'Billing Admin',
    desc: 'Can manage packages and subscriptions only',
    permissions: {
      pages: ['dashboard','users','packages'],
      can_suspend: false,
      can_change_tier: true,
      can_manage_admins: false,
    },
  },
  {
    role: 'support_admin',
    label: 'Support Admin',
    desc: 'Read-only access to users and activity',
    permissions: {
      pages: ['dashboard','users','activity'],
      can_suspend: false,
      can_change_tier: false,
      can_manage_admins: false,
    },
  },
]

const PAGE_LABELS: Record<string,string> = {
  dashboard: 'Dashboard', users: 'Users & Orgs',
  packages: 'Packages', activity: 'Activity Log', settings: 'Settings',
}

export default function AdminSettingsPage() {
  const supabase = createClient()
  const [admins, setAdmins]           = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<any>(null)
  const [showInvite, setShowInvite]   = useState(false)
  const [editAdmin, setEditAdmin]     = useState<any>(null)
  const [newAdmin, setNewAdmin] = useState({
    email: '', name: '', role: 'support_admin',
  })

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { data: list } = await supabase
      .from('admin_users').select('*').order('created_at')
    setAdmins(list || [])
    const me = list?.find((a: any) => a.user_id === session?.user?.id)
    setCurrentAdmin(me)
    setLoading(false)
  }

  const addAdmin = async () => {
    if (!newAdmin.email || !newAdmin.name) { toast.error('Name and email required'); return }
    setSaving(true)
    const preset = PERMISSION_PRESETS.find(p => p.role === newAdmin.role)
    const { error } = await supabase.from('admin_users').insert({
      user_id:     '00000000-0000-0000-0000-000000000000',
      email:       newAdmin.email,
      name:        newAdmin.name,
      role:        newAdmin.role,
      permissions: preset?.permissions || {},
      is_active:   false,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success(`${newAdmin.name} invited — inactive until they first sign in`)
    setNewAdmin({ email: '', name: '', role: 'support_admin' })
    setShowInvite(false)
    setSaving(false)
    load()
  }

  const saveAdminRole = async () => {
    if (!editAdmin) return
    setSaving(true)
    const preset = PERMISSION_PRESETS.find(p => p.role === editAdmin.role)
    const { error } = await supabase.from('admin_users').update({
      role:        editAdmin.role,
      permissions: preset?.permissions || editAdmin.permissions,
    }).eq('id', editAdmin.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Role updated')
    setEditAdmin(null)
    setSaving(false)
    load()
  }

  const toggleActive = async (admin: any) => {
    if (admin.id === currentAdmin?.id) { toast.error("Can't deactivate yourself"); return }
    await supabase.from('admin_users')
      .update({ is_active: !admin.is_active }).eq('id', admin.id)
    load()
  }

  const removeAdmin = async (admin: any) => {
    if (admin.id === currentAdmin?.id) { toast.error("Can't remove yourself"); return }
    if (!confirm(`Remove ${admin.name} from admin panel?`)) return
    await supabase.from('admin_users').delete().eq('id', admin.id)
    toast.success(`${admin.name} removed`)
    load()
  }

  const ROLE_BADGE: Record<string,string> = {
    super_admin: 'badge-amber', billing_admin: 'badge-blue',
    support_admin: 'badge-purple', admin: 'badge-gray',
  }

  return (
    <AdminLayout>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:760 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.25rem', color:'var(--text)' }}>Admin Settings</h1>
            <p style={{ color:'var(--sub)', fontSize:'0.8125rem', marginTop:2 }}>
              Manage admin staff and their access levels
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <UserPlus size={14}/>Invite Admin Staff
          </button>
        </div>

        {/* You card */}
        {currentAdmin && (
          <div className="card" style={{ padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{
                width:42, height:42, borderRadius:'50%',
                background:'rgba(79,142,247,0.15)', display:'flex',
                alignItems:'center', justifyContent:'center',
                fontWeight:700, color:'var(--brand)', fontSize:'1.1rem',
              }}>
                {currentAdmin.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight:600, color:'var(--text)' }}>{currentAdmin.name}</p>
                <p style={{ fontSize:'0.8rem', color:'var(--sub)' }}>{currentAdmin.email}</p>
              </div>
              <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
                <span className={`badge ${ROLE_BADGE[currentAdmin.role]||'badge-gray'}`} style={{ textTransform:'capitalize' }}>
                  {currentAdmin.role?.replace('_',' ')}
                </span>
                <span className="badge badge-green">You</span>
              </div>
            </div>
            {/* Current permissions */}
            <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:'rgba(79,142,247,0.05)', border:'1px solid rgba(79,142,247,0.15)' }}>
              <p style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--brand)', marginBottom:6 }}>Your permissions</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {(currentAdmin.permissions?.pages || []).map((p: string) => (
                  <span key={p} className="badge badge-blue" style={{ fontSize:'0.7rem' }}>
                    {PAGE_LABELS[p] || p}
                  </span>
                ))}
                {currentAdmin.permissions?.can_suspend && <span className="badge badge-red" style={{ fontSize:'0.7rem' }}>Can suspend</span>}
                {currentAdmin.permissions?.can_change_tier && <span className="badge badge-amber" style={{ fontSize:'0.7rem' }}>Change tiers</span>}
                {currentAdmin.permissions?.can_manage_admins && <span className="badge badge-purple" style={{ fontSize:'0.7rem' }}>Manage admins</span>}
              </div>
            </div>
          </div>
        )}

        {/* Permission presets info */}
        <div className="card" style={{ padding:'16px 20px' }}>
          <h3 style={{ fontWeight:600, color:'var(--text)', fontSize:'0.9rem', marginBottom:12 }}>Role Presets</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
            {PERMISSION_PRESETS.map(preset => (
              <div key={preset.role} style={{ padding:'12px 14px', borderRadius:8, background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)' }}>
                <p style={{ fontWeight:600, color:'var(--text)', fontSize:'0.8125rem' }}>{preset.label}</p>
                <p style={{ fontSize:'0.75rem', color:'var(--sub)', marginTop:3 }}>{preset.desc}</p>
                <div style={{ marginTop:8, display:'flex', flexWrap:'wrap', gap:4 }}>
                  {preset.permissions.pages.map(p => (
                    <span key={p} className="badge badge-gray" style={{ fontSize:'0.6875rem' }}>{PAGE_LABELS[p]}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All admins table */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ fontWeight:600, color:'var(--text)', fontSize:'0.9rem' }}>Admin Staff ({admins.length})</h3>
          </div>
          {loading ? (
            <div style={{ padding:20 }}>
              {Array(3).fill(0).map((_,i) => (
                <div key={i} className="skel" style={{ height:52, borderRadius:8, marginBottom:8 }}/>
              ))}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Pages</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign:'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight:600, color:'var(--text)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{
                          width:28, height:28, borderRadius:'50%',
                          background:'rgba(79,142,247,0.1)',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          fontSize:'0.75rem', fontWeight:700, color:'var(--brand)', flexShrink:0,
                        }}>
                          {admin.name?.charAt(0)?.toUpperCase()}
                        </div>
                        {admin.name}
                        {admin.id === currentAdmin?.id && (
                          <span className="badge badge-green" style={{ fontSize:'0.65rem' }}>You</span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize:'0.8rem' }}>{admin.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[admin.role]||'badge-gray'}`} style={{ textTransform:'capitalize' }}>
                        {admin.role?.replace('_',' ')}
                      </span>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
                        {(admin.permissions?.pages || []).slice(0,3).map((p: string) => (
                          <span key={p} className="badge badge-gray" style={{ fontSize:'0.65rem' }}>
                            {PAGE_LABELS[p]}
                          </span>
                        ))}
                        {(admin.permissions?.pages || []).length > 3 && (
                          <span className="badge badge-gray" style={{ fontSize:'0.65rem' }}>
                            +{admin.permissions.pages.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${admin.is_active ? 'badge-green' : 'badge-gray'}`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize:'0.75rem', color:'var(--sub)', whiteSpace:'nowrap' }}>
                      {formatDate(admin.created_at)}
                    </td>
                    <td>
                      {admin.id !== currentAdmin?.id && (
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button className="btn btn-ghost" onClick={() => setEditAdmin({ ...admin })}
                            style={{ padding:'4px 8px', fontSize:'0.75rem' }}>
                            <Edit2 size={11}/>Role
                          </button>
                          <button className="btn btn-ghost" onClick={() => toggleActive(admin)}
                            style={{ padding:'4px 8px', fontSize:'0.75rem' }}>
                            {admin.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="btn btn-danger" onClick={() => removeAdmin(admin)}
                            style={{ padding:'4px 8px', fontSize:'0.75rem' }}>
                            <Trash2 size={11}/>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Privacy note */}
        <div style={{ display:'flex', gap:10, padding:'12px 16px', borderRadius:10, background:'rgba(52,209,122,0.05)', border:'1px solid rgba(52,209,122,0.15)' }}>
          <CheckCircle2 size={15} style={{ color:'var(--success)', flexShrink:0, marginTop:1 }}/>
          <div style={{ fontSize:'0.8rem', color:'var(--sub)' }}>
            <p style={{ fontWeight:600, color:'var(--success)', marginBottom:3 }}>Privacy by Design</p>
            <p>Admin staff never see financial data — transactions, journal entries, account balances or personal KRA PINs. They only see: org name, sector, user count, entry count, tier, and activity timestamps.</p>
          </div>
        </div>
      </div>

      {/* ── Invite Modal ── */}
      {showInvite && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="card fade-up" style={{ width:'100%', maxWidth:460, padding:0 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h2 style={{ fontWeight:700, color:'var(--text)' }}>Invite Admin Staff</h2>
              <button onClick={() => setShowInvite(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--sub)' }}>
                <X size={18}/>
              </button>
            </div>
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label className="lbl">Full Name *</label>
                <input className="inp" placeholder="Jane Wanjiku" value={newAdmin.name}
                  onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))}/>
              </div>
              <div>
                <label className="lbl">Email *</label>
                <input className="inp" type="email" placeholder="jane@finai.app" value={newAdmin.email}
                  onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))}/>
              </div>
              <div>
                <label className="lbl">Role *</label>
                <select className="inp" value={newAdmin.role}
                  onChange={e => setNewAdmin(p => ({ ...p, role: e.target.value }))}>
                  {PERMISSION_PRESETS.map(p => (
                    <option key={p.role} value={p.role}>{p.label} — {p.desc}</option>
                  ))}
                </select>
              </div>
              {/* Show what this role can do */}
              {newAdmin.role && (
                <div style={{ padding:'10px 14px', borderRadius:8, background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', fontSize:'0.8rem' }}>
                  <p style={{ color:'var(--brand)', fontWeight:600, marginBottom:4 }}>This role can access:</p>
                  <p style={{ color:'var(--sub)' }}>
                    {PERMISSION_PRESETS.find(p => p.role === newAdmin.role)?.permissions.pages.map(p => PAGE_LABELS[p]).join(', ')}
                  </p>
                </div>
              )}
              <div style={{ display:'flex', gap:8, padding:'10px 14px', borderRadius:8, background:'rgba(245,166,35,0.07)', border:'1px solid rgba(245,166,35,0.2)' }}>
                <AlertTriangle size={14} style={{ color:'var(--warning)', flexShrink:0, marginTop:1 }}/>
                <p style={{ fontSize:'0.8rem', color:'var(--warning)' }}>
                  The person must create a FinAI account with this email first. Their admin access will activate on first sign-in to this panel.
                </p>
              </div>
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2, justifyContent:'center' }} onClick={addAdmin} disabled={saving}>
                {saving ? <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'white', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>Saving…
                </span> : <><UserPlus size={14}/>Add Admin</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Role Modal ── */}
      {editAdmin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
          onClick={e => e.target === e.currentTarget && setEditAdmin(null)}>
          <div className="card fade-up" style={{ width:'100%', maxWidth:400, padding:0 }}>
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h2 style={{ fontWeight:700, color:'var(--text)' }}>Change Role — {editAdmin.name}</h2>
              <button onClick={() => setEditAdmin(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--sub)' }}>
                <X size={18}/>
              </button>
            </div>
            <div style={{ padding:20 }}>
              <label className="lbl">New Role</label>
              <select className="inp" value={editAdmin.role}
                onChange={e => setEditAdmin((p: any) => ({ ...p, role: e.target.value }))}>
                {PERMISSION_PRESETS.map(p => (
                  <option key={p.role} value={p.role}>{p.label} — {p.desc}</option>
                ))}
              </select>
              {editAdmin.role && (
                <div style={{ marginTop:12, padding:'10px 14px', borderRadius:8, background:'rgba(79,142,247,0.06)', border:'1px solid rgba(79,142,247,0.15)', fontSize:'0.8rem' }}>
                  <p style={{ color:'var(--brand)', fontWeight:600, marginBottom:4 }}>Will be able to access:</p>
                  <p style={{ color:'var(--sub)' }}>
                    {PERMISSION_PRESETS.find(p => p.role === editAdmin.role)?.permissions.pages.map(p => PAGE_LABELS[p]).join(', ')}
                  </p>
                </div>
              )}
            </div>
            <div style={{ padding:'14px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={() => setEditAdmin(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex:2, justifyContent:'center' }} onClick={saveAdminRole} disabled={saving}>
                <Save size={14}/>{saving ? 'Saving…' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </AdminLayout>
  )
}
