import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { db } from '@/db'
import { useReportStore } from '@/store/reportStore'
import Layout from '@/components/Layout'
import { Tag } from '@/components/ui'
import { useTheme } from '@/theme'
import { useLang } from '@/useLang'
import type { Report } from '@/types'

export default function Dashboard() {
  const nav = useNavigate()
  const { c } = useTheme()
  const { tr } = useLang()
  const newReport = useReportStore(s => s.newReport)
  const loadReport = useReportStore(s => s.loadReport)
  const reports = useLiveQuery(() => db.reports.orderBy('updatedAt').reverse().toArray(), [])

  const handleNew = () => { newReport(); nav('/report/edit') }
  const handleOpen = async (id: string) => { await loadReport(id); nav('/report/edit') }

  const statusColor: Record<Report['status'], 'warning'|'info'|'success'> = { draft:'warning', completed:'info', exported:'success' }
  const statusLabel = (s: Report['status']) => s === 'draft' ? tr('draft') : s === 'completed' ? tr('completed') : tr('exported')

  return (
    <Layout title={tr('fieldReports')}>
      <div style={{ marginBottom: 24, paddingBottom: 18, borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: c.red, letterSpacing: '-1px', lineHeight: 1 }}>SPK</div>
          <div style={{ fontSize: 10, color: c.textMuted, letterSpacing: '2px', marginTop: 2 }}>BY CERAMTEC — {tr('fieldReports').toUpperCase()}</div>
        </div>
        <button onClick={handleNew} style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer', boxShadow: c.shadowMd }}>
          + {tr('newReport')}
        </button>
      </div>

      {reports && reports.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
          {[
            { label: tr('total'),      value: reports.length,                                      color: c.accent },
            { label: tr('inProgress'), value: reports.filter(r => r.status === 'draft').length,    color: c.warning },
            { label: tr('exported'),   value: reports.filter(r => r.status === 'exported').length, color: c.success },
          ].map(s => (
            <div key={s.label} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', boxShadow: c.shadow }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: c.textMuted, letterSpacing: '0.5px', marginTop: 4 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}

      {!reports || reports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '70px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: c.text, marginBottom: 8 }}>{tr('noReports')}</div>
          <div style={{ fontSize: 14, color: c.textMuted, marginBottom: 24 }}>{tr('noReportsSub')}</div>
          <button onClick={handleNew} style={{ background: c.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 28px', fontSize: 15, fontWeight: 700, fontFamily: 'DM Sans', cursor: 'pointer' }}>
            + {tr('newReport')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map(r => (
            <div key={r.id} onClick={() => handleOpen(r.id)} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 18px', cursor: 'pointer', boxShadow: c.shadow, transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = c.shadowMd)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = c.shadow)}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: c.text, marginBottom: 2 }}>{r.opportunityRef || 'Untitled'}</div>
                  <div style={{ fontSize: 13, color: c.textSub }}>{r.contacts?.customerCompany || tr('noCustomer')}{r.workpiece?.material ? ` — ${r.workpiece.material}` : ''}</div>
                </div>
                <Tag color={statusColor[r.status]}>{statusLabel(r.status)}</Tag>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: c.textMuted }}>
                <span>🧪 {r.testLog?.length || 0} {tr('tests')}</span>
                <span>📷 {r.testLog?.reduce((a, t) => a + t.photos.length, 0) || 0} {tr('photos')}</span>
                <span style={{ marginLeft: 'auto' }}>{new Date(r.updatedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
