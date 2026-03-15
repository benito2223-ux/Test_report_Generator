import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReportStore } from '@/store/reportStore'
import { generatePDF } from '@/utils/pdfGenerator'
import { generatePPTX } from '@/utils/pptxGenerator'
import Layout from '@/components/Layout'
import { Card, Btn, Tag } from '@/components/ui'
import { useTheme } from '@/theme'
import { useLang } from '@/useLang'
import { getLang } from '@/i18n'

export default function ExportPage() {
  const nav = useNavigate()
  const { c } = useTheme()
  const { tr } = useLang()
  const { activeReport, updateReport, saveReport } = useReportStore()
  const [generating, setGenerating] = useState(false)
  const [generatingPptx, setGeneratingPptx] = useState(false)
  const [done, setDone] = useState(false)
  const [donePptx, setDonePptx] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFinancial, setShowFinancial] = useState(true)

  useEffect(() => { if (!activeReport) nav('/') }, [activeReport, nav])
  if (!activeReport) return null

  const r = activeReport
  const totalPhotos = r.testLog.reduce((acc, t) => acc + t.photos.length, 0)

  const checks = [
    { label: 'Header (contacts)', ok: !!(r.contacts.customerCompany && r.contacts.salesName) },
    { label: 'Workpiece & Machine', ok: !!(r.workpiece.material && r.machine.model) },
    { label: 'Test objective', ok: !!r.testScope.objective },
    { label: 'SPK Proposal', ok: !!r.spkProposal.insertRef },
    { label: `Tests (${r.testLog.length})`, ok: r.testLog.length > 0 },
    { label: 'ROI data', ok: !!(r.roiData.ref_cycleTime_min && r.roiData.spk_cycleTime_min) },
    { label: 'Conclusion', ok: !!(r.conclusion.summary || r.conclusion.nextSteps.length > 0) },
  ]

  const handleGenerate = async () => {
    setGenerating(true); setError(null)
    try {
      await generatePDF(r, showFinancial, getLang())
      updateReport({ status: 'exported' })
      await saveReport()
      setDone(true)
    } catch (e) {
      setError(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setGenerating(false) }
  }

  const handlePptx = async () => {
    setGeneratingPptx(true); setError(null)
    try {
      await generatePPTX(r, showFinancial, getLang())
      setDonePptx(true)
    } catch (e) {
      setError(`PPTX Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setGeneratingPptx(false) }
  }

  return (
    <Layout title="Export PDF" back="/report/edit">
      {/* Report summary */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.text, marginBottom: 3 }}>{r.opportunityRef || 'Untitled'}</div>
            <div style={{ fontSize: 13, color: c.textSub }}>{r.contacts.customerCompany}{r.workpiece.material && ` — ${r.workpiece.material}`}</div>
          </div>
          <Tag color={r.status === 'exported' ? 'success' : r.status === 'completed' ? 'info' : 'warning'}>
            {r.status === 'draft' ? 'Draft' : r.status === 'completed' ? 'Completed' : 'Exported'}
          </Tag>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[{ n: r.testLog.length, lbl: 'Tests' }, { n: totalPhotos, lbl: 'Photos' }, { n: r.conclusion.nextSteps.length, lbl: 'Next Steps' }].map(s => (
            <div key={s.lbl} style={{ background: c.bgHover, borderRadius: 8, padding: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: c.accent }}>{s.n}</div>
              <div style={{ fontSize: 10, color: c.textMuted, letterSpacing: '0.5px' }}>{s.lbl.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Financial toggle */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>Include financial comparison</div>
            <div style={{ fontSize: 12, color: c.textMuted }}>Cost/part, ROI on series — only if data available</div>
          </div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowFinancial(v => !v)}
            onTouchEnd={e => { e.preventDefault(); setShowFinancial(v => !v) }}
            style={{ width: 44, height: 24, borderRadius: 12, background: showFinancial ? c.accent : c.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', WebkitTapHighlightColor: 'transparent' }}
          >
            <div style={{ position: 'absolute', top: 3, left: showFinancial ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', pointerEvents: 'none' }} />
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
          Report content ({checks.filter(c => c.ok).length}/{checks.length})
        </div>
        {checks.map(ch => (
          <div key={ch.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${c.border}` }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: ch.ok ? c.successLight : c.bgHover, border: `2px solid ${ch.ok ? c.success : c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {ch.ok && <span style={{ color: c.success, fontSize: 11, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 13, color: ch.ok ? c.text : c.textMuted }}>{ch.label}</span>
          </div>
        ))}
      </Card>

      {/* PDF structure */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: c.accent, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>PDF Structure</div>
        {[
          { icon: '▪', label: 'Cover page', ok: true },
          { icon: '▪', label: 'Contacts & Workpiece info', ok: true },
          { icon: '▪', label: 'Scope of the test', ok: !!r.testScope.objective },
          { icon: '▪', label: 'Actual cycle (reference)', ok: !!r.currentProcess.insertRef },
          { icon: '▪', label: 'SPK Proposal', ok: !!r.spkProposal.insertRef },
          ...r.testLog.map(t => ({ icon: '▸', label: `${t.testNumber}${['','st','nd','rd'][t.testNumber] || 'th'} Test — Workpiece #${t.workpieceNumber} (${t.photos.length} photo${t.photos.length !== 1 ? 's' : ''})`, ok: true })),
          { icon: '▪', label: 'Process comparison', ok: !!(r.roiData.ref_cycleTime_min && r.roiData.spk_cycleTime_min) },
          { icon: '▪', label: 'Summary', ok: !!r.conclusion.summary },
          { icon: '▪', label: 'Next Steps', ok: r.conclusion.nextSteps.length > 0 },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ color: item.ok ? c.accent : c.textMuted, fontSize: 10 }}>{item.icon}</span>
            <span style={{ fontSize: 12, color: item.ok ? c.textSub : c.textMuted }}>{item.label}</span>
          </div>
        ))}
      </Card>

      {error && <div style={{ background: c.dangerLight, border: `1px solid ${c.danger}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: c.danger }}>{error}</div>}
      {done && <div style={{ background: c.successLight, border: `1px solid ${c.success}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: c.success, textAlign: 'center' }}>✓ PDF generated and downloaded successfully</div>}
      {donePptx && <div style={{ background: c.successLight, border: `1px solid ${c.success}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: c.success, textAlign: 'center' }}>✓ PowerPoint generated and downloaded successfully</div>}

      {/* PDF button */}
      <button onClick={handleGenerate} disabled={generating} style={{ width: '100%', padding: '16px', borderRadius: 12, border: 'none', background: generating ? c.border : c.red, color: generating ? c.textMuted : '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: generating ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
        {generating ? `⏳ ${tr('generating')}` : done ? `↓ ${tr('downloadAgain')}` : `↓ ${tr('generate')}`}
      </button>

      {/* PPTX button */}
      <button onClick={handlePptx} disabled={generatingPptx} style={{ width: '100%', padding: '16px', borderRadius: 12, border: `2px solid ${c.accent}`, background: 'transparent', color: generatingPptx ? c.textMuted : c.accent, fontSize: 16, fontWeight: 700, fontFamily: 'DM Sans', cursor: generatingPptx ? 'not-allowed' : 'pointer', marginBottom: 8 }}>
        {generatingPptx ? `⏳ ${tr('generating')}` : donePptx ? `↓ ${tr('downloadAgain')}` : `📊 ${tr('generatePptx')}`}
      </button>

      <div style={{ textAlign: 'center', marginTop: 6, fontSize: 11, color: c.textMuted }}>A4 Landscape · SPK Design · {r.language?.toUpperCase() || 'EN'}</div>
    </Layout>
  )
}
