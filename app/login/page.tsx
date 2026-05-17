'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function AdminLoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Enter your email and password'); return }
    setLoading(true)
    setError('')

    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
      return
    }

    // Sign in
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }
    if (!data.user) { setError('Sign in failed — no user returned'); setLoading(false); return }

    // Verify admin row
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('id, role, name')
      .eq('user_id', data.user.id)
      .eq('is_active', true)
      .single()

    if (!adminRow) {
      await supabase.auth.signOut()
      setError(
        'Access denied.\n\nYour user_id is not in admin_users or is_active = false.\n\n' +
        'Fix in Supabase SQL Editor:\n' +
        `UPDATE admin_users SET is_active = true WHERE email = '${email}';`
      )
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f1117', padding: 24, fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: 420, background: '#1a1d24',
        border: '1px solid #2a2d35', borderRadius: 16, padding: '44px 40px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18, background: '#4f8ef7',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ color: '#f0f2f5', fontWeight: 700, fontSize: 24, margin: '0 0 6px' }}>
            FinAI Admin
          </h1>
          <p style={{ color: '#8891a4', fontSize: 13, margin: 0 }}>Authorised personnel only</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(247,81,81,0.1)', border: '1px solid rgba(247,81,81,0.4)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 20,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <AlertCircle size={16} color="#f75151" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: '#f75151', fontSize: 12, margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {error}
            </p>
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', color: '#8891a4', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.03em' }}>
            ADMIN EMAIL
          </label>
          <input type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="onyiva177finai@gmail.com"
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              background: '#13151a', border: '1px solid #2a2d35',
              color: '#f0f2f5', fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }} />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', color: '#8891a4', fontSize: 12, fontWeight: 600, marginBottom: 6, letterSpacing: '0.03em' }}>
            PASSWORD
          </label>
          <div style={{ position: 'relative' }}>
            <input type={showPw ? 'text' : 'password'} value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '11px 42px 11px 14px', borderRadius: 10,
                background: '#13151a', border: '1px solid #2a2d35',
                color: '#f0f2f5', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              }} />
            <button type="button" onClick={() => setShowPw(s => !s)} style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#8891a4', padding: 0,
            }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Button */}
        <button onClick={handleLogin} disabled={loading} style={{
          width: '100%', padding: '13px 0', borderRadius: 10,
          background: loading ? '#3a6bc7' : '#4f8ef7',
          color: 'white', fontWeight: 700, fontSize: 15, border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          {loading && (
            <span style={{
              width: 16, height: 16,
              border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
              borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block',
            }} />
          )}
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <p style={{ textAlign: 'center', color: '#3a3d47', fontSize: 11, marginTop: 24, marginBottom: 0 }}>
          All sessions are logged and audited
        </p>
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #4f8ef7 !important; box-shadow: 0 0 0 3px rgba(79,142,247,0.15) !important; }
      `}</style>
    </div>
  )
}
