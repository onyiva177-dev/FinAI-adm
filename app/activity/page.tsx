'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDateTime, timeAgo } from '@/lib/utils'
import AdminLayout from '@/components/AdminLayout'
import { Activity, Search, RefreshCw, Download, Filter } from 'lucide-react'

const ACTION_BADGE: Record<string, string> = {
  login: 'badge-green', logout: 'badge-gray',
  page_view: 'badge-blue', feature_used: 'badge-purple',
  admin_subscription_change: 'badge-amber',
  admin_org_suspended: 'badge-red', archive_unlock_failed: 'badge-red',
  deleted: 'badge-red', posted: 'badge-green', created: 'badge-blue',
}

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':'Dashboard', '/dashboard/accounting':'Accounting',
  '/dashboard/transactions':'Transactions', '/dashboard/contacts':'Contacts',
  '/dashboard/inventory':'Inventory', '/dashboard/payroll':'Payroll',
  '/dashboard/analytics':'Analytics', '/dashboard/pos':'POS',
  '/dashboard/banking':'Banking', '/dashboard/tax':'Tax',
}

export default function ActivityPage() {
  const supabase = createClient()
  const [logs, setLogs]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [dateRange, setDateRange] = useState('7')  // days
  const [stats, setStats]         = useState({ total:0, logins:0, pageViews:0, adminActions:0 })

  useEffect(() => { load() }, [dateRange])

  const load = async () => {
    setLoading(true)
    const since = new Date(Date.now() - Number(dateRange) * 86400000).toISOString()
    const { data } = await supabase.from('activity_log')
      .select('*, org:organizations(name), profile:profiles!activity_log_user_id_fkey(full_name)')
      .gte('created_at', since)
      .order('created_at', { ascending:false })
      .limit(500)
    const rows = data || []
    setLogs(rows)
    setStats({
      total:        rows.length,
      logins:       rows.filter((r:any) => r.action==='login').length,
      pageViews:    rows.filter((r:any) => r.action==='page_view').length,
      adminActions: rows.filter((r:any) => r.action?.startsWith('admin_')).length,
    })
    setLoading(false)
  }

  const filtered = logs.filter(l =>
    (actionFilter==='all' || l.action===actionFilter) &&
    (!search ||
      (l.org as any)?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (l.profile as any)?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.page?.toLowerCase().includes(search.toLowerCase()))
  )

  const exportCSV = () => {
    const header = ['Timestamp','Organisation','User','Action','Page','Metadata']
    const rows = filtered.map(l => [
      formatDateTime(l.created_at),
      (l.org as any)?.name||'—',
      (l.profile as any)?.full_name||'—',
      l.action,
      l.page||'—',
      JSON.stringify(l.metadata||{}),
    ])
    const csv = [header, ...rows].map(r => r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }))
    a.download = `finai_activity_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const uniqueActions = [...new Set(logs.map(l => l.action))].filter(Boolean)

  return (
    <AdminLayout>
      <div className="fade-up" style={{ display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontWeight:700, fontSize:'1.25rem', color:'var(--text)' }}>Activity Log</h1>
            <p style={{ color:'var(--sub)', fontSize:'0.8125rem', marginTop:2 }}>
              Page views, logins and admin actions — no financial data
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <select className="inp" value={dateRange} onChange={e=>setDateRange(e.target.value)}
              style={{ width:'auto', padding:'7px 12px' }}>
              <option value="1">Last 24h</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <button className="btn btn-ghost" onClick={load}><RefreshCw size={13}/></button>
            <button className="btn btn-ghost" onClick={exportCSV}><Download size={13}/>Export</button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
          {[
            { label:'Total Events',    val:stats.total,        col:'var(--text)' },
            { label:'Logins',          val:stats.logins,       col:'var(--success)' },
            { label:'Page Views',      val:stats.pageViews,    col:'var(--brand)' },
            { label:'Admin Actions',   val:stats.adminActions, col:'var(--warning)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:'14px 16px' }}>
              <p style={{ fontSize:'0.75rem', color:'var(--sub)' }}>{s.label}</p>
              {loading
                ? <div className="skel" style={{ height:28, width:60, marginTop:6, borderRadius:6 }}/>
                : <p style={{ fontSize:'1.75rem', fontWeight:700, color:s.col, marginTop:4 }}>{s.val}</p>}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--sub)' }}/>
            <input className="inp" placeholder="Search org, user, action…" value={search}
              onChange={e=>setSearch(e.target.value)} style={{ paddingLeft:32 }}/>
          </div>
          <select className="inp" value={actionFilter} onChange={e=>setActionFilter(e.target.value)}
            style={{ width:'auto', padding:'7px 12px' }}>
            <option value="all">All actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g,' ')}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="card">
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:'0.8rem', color:'var(--sub)' }}>
              {loading ? 'Loading…' : `${filtered.length} events`}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--success)' }}/>
              <p style={{ fontSize:'0.75rem', color:'var(--sub)' }}>Live (no financial data shown)</p>
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Organisation</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Page / Context</th>
                  <th>Details</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array(10).fill(0).map((_,i)=>(
                  <tr key={i}>{Array(7).fill(0).map((_,j)=>(
                    <td key={j}><div className="skel" style={{ height:13, borderRadius:3 }}/></td>
                  ))}</tr>
                )) : filtered.length===0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', padding:'40px 0', color:'var(--sub)' }}>
                    <Activity size={28} style={{ display:'block', margin:'0 auto 8px', opacity:0.3 }}/>
                    No events in this period
                  </td></tr>
                ) : filtered.slice(0, 200).map((l:any, i) => (
                  <tr key={l.id||i}>
                    <td style={{ whiteSpace:'nowrap', fontFamily:'monospace', fontSize:'0.75rem', color:'var(--sub)' }}>
                      {formatDateTime(l.created_at)}
                    </td>
                    <td style={{ fontWeight:600, color:'var(--text)', whiteSpace:'nowrap' }}>
                      {(l.org as any)?.name||<span style={{ color:'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ whiteSpace:'nowrap' }}>
                      {(l.profile as any)?.full_name||<span style={{ color:'var(--muted)' }}>Unknown</span>}
                    </td>
                    <td>
                      <span className={`badge ${ACTION_BADGE[l.action]||'badge-gray'}`}>
                        {l.action?.replace(/_/g,' ')}
                      </span>
                    </td>
                    <td style={{ color:'var(--sub)', fontSize:'0.75rem' }}>
                      {l.page ? (PAGE_LABELS[l.page]||l.page) : '—'}
                    </td>
                    <td style={{ fontSize:'0.75rem', color:'var(--sub)', maxWidth:200 }}>
                      {l.metadata && Object.keys(l.metadata).length > 0
                        ? <span style={{ fontFamily:'monospace', fontSize:'0.7rem', background:'rgba(255,255,255,0.04)', padding:'2px 6px', borderRadius:4 }}>
                            {Object.entries(l.metadata as Record<string,any>).slice(0,2).map(([k,v])=>`${k}:${v}`).join(' · ')}
                          </span>
                        : '—'}
                    </td>
                    <td style={{ whiteSpace:'nowrap', color:'var(--sub)', fontSize:'0.75rem' }}>
                      {timeAgo(l.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <div style={{ padding:'12px 16px', textAlign:'center', fontSize:'0.8rem', color:'var(--sub)', borderTop:'1px solid var(--border)' }}>
              Showing first 200 of {filtered.length} events — use Export CSV for full data
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
