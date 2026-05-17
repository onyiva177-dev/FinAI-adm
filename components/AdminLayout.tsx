'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard, Users, Package, Activity,
  LogOut, Shield, BarChart3, Settings, ChevronRight
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',  label: 'Overview',   icon: LayoutDashboard },
  { href: '/users',      label: 'Users & Orgs',icon: Users },
  { href: '/packages',   label: 'Packages',   icon: Package },
  { href: '/activity',   label: 'Activity Log',icon: Activity },
  { href: '/settings',   label: 'Settings',   icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [admin, setAdmin]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      // Verify admin
      const { data: adminUser } = await supabase
        .from('admin_users').select('*').eq('user_id', session.user.id)
        .eq('is_active', true).single()
      if (!adminUser) { await supabase.auth.signOut(); router.replace('/login'); return }
      setAdmin(adminUser)
      setLoading(false)
    }
    check()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: 'var(--brand)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
        }}>
          <Shield size={22} color="white" />
        </div>
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)',
              animation: 'shimmer 0.8s infinite', animationDelay: `${i*0.2}s`
            }} />
          ))}
        </div>
      </div>
    </div>
  )

  const signOut = async () => { await supabase.auth.signOut(); router.replace('/login') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--sidebar)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={16} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>FinAI Admin</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--sub)' }}>Control Panel</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={`nav-item ${active ? 'active' : ''}`}>
                <Icon size={16} />
                {item.label}
                {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </Link>
            )
          })}
        </nav>

        {/* Admin user */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: 'rgba(79,142,247,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand)', flexShrink: 0,
            }}>
              {admin?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {admin?.name}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--sub)', textTransform: 'capitalize' }}>{admin?.role}</p>
            </div>
            <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--sub)', padding: 4 }}
              title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 28px' }}>
        {children}
      </main>
    </div>
  )
}
