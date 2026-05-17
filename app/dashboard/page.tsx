'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { timeAgo, formatDate } from '@/lib/utils'
import AdminLayout from '@/components/AdminLayout'
import { Users, Building2, Activity, Package, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function AdminDashboard() {
  const supabase = createClient()
  const [orgs, setOrgs]           = useState<any[]>([])
  const [activityStats, setActivityStats] = useState<any[]>([])
  const [totals, setTotals]       = useState({ orgs:0, users:0, active:0, suspended:0 })
  const [loading, setLoading]     = useState(true)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    // Use the SECURITY DEFINER RPC — no raw data access
    const { data } = await supabase.rpc('admin_get_org_overview')
    const rows = data || []
    setOrgs(rows.slice(0, 10))
    setTotals({
      orgs:      rows.length,
      users:     rows.reduce((s:number, r:any) => s + Number(r.user_count), 0),
      active:    rows.filter((r:any) => r.sub_status === 'active').length,
      suspended: rows.filter((r:any) => r.sub_status === 'suspended').length,
    })

    // Activity by day (last 14 days)
    const since = new Date(Date.now() - 14 * 86400000).toISOString()
    const { data: acts } = await supabase.from('activity_log')
      .select('created_at, action').gte('created_at', since)
    if (acts) {
      const map: Record<string, number> = {}
      acts.forEach((a: any) => {
        const day = new Date(a.created_at).toLocaleDateString('en-KE', { month:'short', day:'numeric' })
        map[day] = (map[day] || 0) + 1
      })
      setActivityStats(Object.entries(map).map(([day, count]) => ({ day, count })).slice(-14))
    }
    setLoading(false)
  }

  const TIER_BADGE: Record<string,string> = {
    Free:'badge-gray', Starter:'badge-blue', Pro:'badge-purple', Enterprise:'badge-amber', none:'badge-gray'
  }
  const STATUS_BADGE: Record<string,string> = {
    active:'badge-green', suspended:'badge-red', trial:'badge-amber', cancelled:'badge-gray', none:'badge-gray'
  }

  return (
    <AdminLayout>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:24 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.25rem', color:'var(--text)' }}>Platform Overview</h1>
            <p style={{ color:'var(--sub)', fontSize:'0.8125rem', marginTop:2 }}>
              {new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {[
            { label:'Total Organisations', val:totals.orgs,      icon:Building2, col:'var(--brand)',   bg:'rgba(79,142,247,0.1)' },
            { label:'Total Users',         val:totals.users,     icon:Users,     col:'var(--success)', bg:'rgba(52,209,122,0.1)' },
            { label:'Active Subscriptions',val:totals.active,    icon:TrendingUp,col:'var(--purple)',  bg:'rgba(167,139,250,0.1)' },
            { label:'Suspended Accounts',  val:totals.suspended, icon:AlertTriangle,col:'var(--danger)',bg:'rgba(247,81,81,0.1)' },
          ].map(s => (
            <div key={s.label} className="card stat-card" style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div className="stat-icon" style={{ background:s.bg, flexShrink:0 }}>
                <s.icon size={16} style={{ color:s.col }}/>
              </div>
              <div>
                <p style={{ fontSize:'0.75rem', color:'var(--sub)' }}>{s.label}</p>
                {loading
                  ? <div className="skel" style={{ height:24, width:48, marginTop:4 }}/>
                  : <p style={{ fontSize:'1.5rem', fontWeight:700, color:s.col }}>{s.val}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Activity Chart */}
        <div className="card" style={{ padding:'20px 20px 12px' }}>
          <h3 style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--text)', marginBottom:16 }}>
            Platform Activity — Last 14 Days
          </h3>
          {activityStats.length === 0 ? (
            <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--sub)', fontSize:'0.8125rem' }}>
              No activity data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={activityStats} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="day" tick={{ fontSize:10, fill:'var(--sub)' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10, fill:'var(--sub)' }} axisLine={false} tickLine={false} width={28}/>
                <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:12 }}/>
                <Bar dataKey="count" name="Events" fill="var(--brand)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Orgs table */}
        <div className="card">
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <h3 style={{ fontWeight:600, fontSize:'0.9rem', color:'var(--text)' }}>Recent Organisations</h3>
            <a href="/users" style={{ fontSize:'0.8rem', color:'var(--brand)', textDecoration:'none' }}>View all →</a>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="tbl">
              <thead>
                <tr><th>Organisation</th><th>Sector</th><th>Users</th><th>Entries</th><th>Tier</th><th>Status</th><th>Last Active</th></tr>
              </thead>
              <tbody>
                {loading ? Array(5).fill(0).map((_,i) => (
                  <tr key={i}>{Array(7).fill(0).map((_,j) => <td key={j}><div className="skel" style={{ height:14, borderRadius:4 }}/></td>)}</tr>
                )) : orgs.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:'40px 0', color:'var(--sub)' }}>No organisations yet</td></tr>
                ) : orgs.map((o:any) => (
                  <tr key={o.org_id}>
                    <td style={{ fontWeight:600, color:'var(--text)' }}>{o.org_name}</td>
                    <td style={{ textTransform:'capitalize' }}>{o.sector||'—'}</td>
                    <td>{o.user_count}</td>
                    <td>{o.entry_count}</td>
                    <td><span className={`badge ${TIER_BADGE[o.tier_name]||'badge-gray'}`}>{o.tier_name}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[o.sub_status]||'badge-gray'}`}>{o.sub_status}</span></td>
                    <td>{timeAgo(o.last_activity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
