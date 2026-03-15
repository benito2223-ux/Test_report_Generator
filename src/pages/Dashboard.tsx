import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReportStore } from '@/store/reportStore'
import { fetchAllReports, deleteReport } from '@/supabase'
import Layout from '@/components/Layout'
import { Tag } from '@/components/ui'
import { useTheme } from '@/theme'
import { useLang } from '@/useLang'
import type { Report } from '@/types'

export default function Dashboard() {
  const nav = useNavigate()
  const { c } = useTheme()
  const { tr } = useLang()
  const { newReport, loadReport } = useReportStore()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const data = await fetchAllReports()
      setReports(data)
    } catch (e) {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleNew = () => { newReport(); nav('/report/edit') }

  const handleOpen = async (r: Report) => {
    await loadReport(r.id, r)
    nav('/report/edit')
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this report?')) return
    await deleteReport(id)
    setReports(prev => prev.filter(r => r.id !== id))
  }

  const statusColor: Record<Report['status'], 'warning'|'info'|'success'> = { draft:'warning', completed:'info', exported:'success' }
  const statusLabel = (s: Report['status']) => s==='draft' ? tr('draft') : s==='completed' ? tr('completed') : tr('exported')

  return (
    <Layout title={tr('fieldReports')}>
      <div style={{ marginBottom:24, paddingBottom:18, borderBottom:`1px solid ${c.border}`, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:26, fontWeight:900, color:c.red, letterSpacing:'-1px', lineHeight:1 }}>SPK</div>
          <div style={{ fontSize:10, color:c.textMuted, letterSpacing:'2px', marginTop:2 }}>BY CERAMTEC — FIELD REPORTS</div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={load} style={{ background:c.bgHover, border:`1px solid ${c.border}`, borderRadius:8, padding:'8px 14px', fontSize:13, color:c.textSub, cursor:'pointer', fontFamily:'DM Sans' }}>
            ↻ Refresh
          </button>
          <button onClick={handleNew} style={{ background:c.accent, color:'#fff', border:'none', borderRadius:10, padding:'11px 20px', fontSize:14, fontWeight:700, fontFamily:'DM Sans', cursor:'pointer', boxShadow:c.shadowMd }}>
            + {tr('newReport')}
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:'center', padding:'60px 20px', color:c.textMuted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
          <div>Loading reports...</div>
        </div>
      )}

      {error && (
        <div style={{ background:c.dangerLight, border:`1px solid ${c.danger}`, borderRadius:10, padding:'14px 16px', marginBottom:16, color:c.danger, fontSize:13 }}>
          ⚠ {error} — <span style={{ cursor:'pointer', textDecoration:'underline' }} onClick={load}>Retry</span>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:24 }}>
          {[
            { label: tr('total'),      value: reports.length,                                      color: c.accent },
            { label: tr('inProgress'), value: reports.filter(r => r.status==='draft').length,      color: c.warning },
            { label: tr('exported'),   value: reports.filter(r => r.status==='exported').length,   color: c.success },
          ].map(s => (
            <div key={s.label} style={{ background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:12, padding:'14px 16px', boxShadow:c.shadow }}>
              <div style={{ fontSize:28, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:11, color:c.textMuted, letterSpacing:'0.5px', marginTop:4 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div style={{ textAlign:'center', padding:'70px 20px' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📋</div>
          <div style={{ fontSize:18, fontWeight:600, color:c.text, marginBottom:8 }}>{tr('noReports')}</div>
          <div style={{ fontSize:14, color:c.textMuted, marginBottom:24 }}>{tr('noReportsSub')}</div>
          <button onClick={handleNew} style={{ background:c.accent, color:'#fff', border:'none', borderRadius:10, padding:'14px 28px', fontSize:15, fontWeight:700, fontFamily:'DM Sans', cursor:'pointer' }}>
            + {tr('newReport')}
          </button>
        </div>
      )}

      {!loading && reports.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {reports.map(r => (
            <div key={r.id} onClick={() => handleOpen(r)}
              style={{ background:c.bgCard, border:`1px solid ${c.border}`, borderRadius:12, padding:'16px 18px', cursor:'pointer', boxShadow:c.shadow, transition:'box-shadow 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = c.shadowMd}
              onMouseLeave={e => e.currentTarget.style.boxShadow = c.shadow}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:c.text, marginBottom:2 }}>{r.opportunityRef || 'Untitled'}</div>
                  <div style={{ fontSize:13, color:c.textSub }}>{r.contacts?.customerCompany || tr('noCustomer')}{r.workpiece?.material ? ` — ${r.workpiece.material}` : ''}</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <Tag color={statusColor[r.status]}>{statusLabel(r.status)}</Tag>
                  <button onClick={e => handleDelete(e, r.id)} style={{ background:'transparent', border:'none', color:c.textMuted, cursor:'pointer', fontSize:16, padding:'2px 6px', borderRadius:4 }}>🗑</button>
                </div>
              </div>
              <div style={{ display:'flex', gap:16, fontSize:12, color:c.textMuted }}>
                <span>🧪 {r.testLog?.length || 0} {tr('tests')}</span>
                <span>📷 {r.testLog?.reduce((a,t) => a+t.photos.length, 0) || 0} {tr('photos')}</span>
                <span style={{ marginLeft:'auto' }}>{new Date(r.updatedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
