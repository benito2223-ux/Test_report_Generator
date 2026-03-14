import type { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../theme'
import { useReportStore } from '../store/reportStore'
import { type Lang } from '../i18n'
import { useState, useEffect } from 'react'

const LANGS: Lang[] = ['EN', 'DE']

export default function Layout({ children, title, back }: { children: ReactNode; title?: string; back?: string }) {
  const { c, theme, toggle } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const { activeReport, updateReport } = useReportStore()
  const [lang, setLang] = useState<Lang>((localStorage.getItem('spk-lang') as Lang) || 'EN')

  useEffect(() => {
    const stored = (localStorage.getItem('spk-lang') as Lang) || 'EN'
    setLang(stored)
  }, [activeReport])

  const handleLang = (l: Lang) => {
    localStorage.setItem('spk-lang', l)
    setLang(l)
    if (activeReport) {
      updateReport({ language: l.toLowerCase() as 'en' | 'de' })
    }
    // Force re-render across the app
    window.dispatchEvent(new StorageEvent('storage', { key: 'spk-lang', newValue: l }))
  }

  return (
    <div style={{ minHeight: '100dvh', background: c.bg, color: c.text, fontFamily: 'DM Sans', display: 'flex', flexDirection: 'column' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: c.bgCard, borderBottom: `1px solid ${c.border}`, boxShadow: c.shadow }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${c.red} 0%, ${c.accent} 100%)` }} />

          {back && (
            <button onClick={() => nav(back)} style={{ background: 'transparent', border: 'none', color: c.textSub, fontSize: 22, cursor: 'pointer', padding: '4px 8px', borderRadius: 6, lineHeight: 1 }}>‹</button>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: c.red, letterSpacing: '-0.5px' }}>SPK</span>
            <span style={{ fontSize: 10, color: c.textMuted, fontWeight: 400 }}>by CeramTec</span>
          </div>

          {title && (
            <>
              <div style={{ width: 1, height: 20, background: c.border }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{title}</span>
            </>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Language pills */}
            <div style={{ display: 'flex', gap: 2, background: c.bgHover, borderRadius: 20, padding: '3px 4px' }}>
              {LANGS.map(l => (
                <button key={l} onClick={() => handleLang(l)} style={{
                  padding: '4px 10px', borderRadius: 16, border: 'none', cursor: 'pointer',
                  background: lang === l ? c.accent : 'transparent',
                  color: lang === l ? '#fff' : c.textMuted,
                  fontSize: 12, fontWeight: lang === l ? 700 : 400,
                  fontFamily: 'DM Sans', transition: 'all 0.15s',
                }}>
                  {l}
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button onClick={toggle} style={{ background: c.bgHover, border: `1px solid ${c.border}`, borderRadius: 20, padding: '5px 10px', fontSize: 13, cursor: 'pointer', color: c.textSub, display: 'flex', alignItems: 'center', gap: 5 }}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 900, margin: '0 auto', width: '100%', padding: '20px 16px calc(80px + env(safe-area-inset-bottom))' }}>
        {children}
      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: c.bgCard, paddingBottom: 'env(safe-area-inset-bottom)', borderTop: `1px solid ${c.border}`, boxShadow: `0 -2px 10px rgba(0,0,0,0.06)`, display: 'flex', zIndex: 100 }}>
        {[
          { icon: '📋', label: 'Reports', path: '/' },
          { icon: '✚', label: 'New', path: '/report/new', action: true },
        ].map(item => {
          const active = item.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith('/report')
          return (
            <button key={item.path} onClick={() => nav(item.path)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px 14px', background: 'transparent', border: 'none', cursor: 'pointer', color: item.action ? c.red : active && item.path !== '/' ? c.accent : item.path === '/' && loc.pathname === '/' ? c.accent : c.textMuted, fontFamily: 'DM Sans' }}>
              <span style={{ fontSize: item.action ? 24 : 20 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
