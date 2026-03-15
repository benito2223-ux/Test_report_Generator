import { useState } from 'react'
import { useReportStore } from '@/store/reportStore'
import { useTheme } from '@/theme'
import { Section, TextArea, Btn, Card } from '@/components/ui'

interface Props {
  onExport: () => void
}

function ListEditor({ label, items, onChange, placeholder }: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  const add = () => {
    if (!input.trim()) return
    onChange([...items, input.trim()])
    setInput('')
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>{label}</div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#C5001A', color: '#fff', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, background: '#111', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#ccc', border: '1px solid #1e1e1e' }}>
            {item}
          </div>
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            style={{ background: 'transparent', border: 'none', color: '#444', fontSize: 16, cursor: 'pointer', padding: '4px', flexShrink: 0 }}
          >×</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          style={{
            flex: 1, background: '#111', color: '#f0f0f0', border: '1px solid #2a2a2a',
            borderRadius: 6, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Sans', outline: 'none',
          }}
          onFocus={e => { e.target.style.borderColor = '#C5001A' }}
          onBlur={e => { e.target.style.borderColor = '#2a2a2a' }}
        />
        <Btn onClick={add} style={{ padding: '8px 14px' }}>+ Add</Btn>
      </div>
    </div>
  )
}

export default function ConclusionSection({ onExport }: Props) {
  const { activeReport, updateSection, updateReport } = useReportStore()
  if (!activeReport) return null

  const c = activeReport.conclusion

  return (
    <div>
      <Section title="Summary & Conclusion">
        <TextArea
          label="Test Summary"
          value={c.summary}
          rows={5}
          placeholder="Summarize results obtained, recommended operating conditions and identified potential..."
          onChange={e => updateSection('conclusion', { summary: e.target.value })}
        />
      </Section>

      <Section title="Key Learnings">
        <ListEditor
          label="Positive points, key discoveries"
          items={c.keyLearnings}
          onChange={items => updateSection('conclusion', { keyLearnings: items })}
          placeholder="e.g. Good stability in cylindrical turning, excellent surface finish..."
        />
      </Section>

      <Section title="Operating Rules">
        <ListEditor
          label="Mandatory conditions identified during tests"
          items={c.operatingRules}
          onChange={items => updateSection('conclusion', { operatingRules: items })}
          placeholder="e.g. ap min 0.5 mm to avoid breakage from interrupted cut..."
        />
      </Section>

      <Section title="Next Steps">
        <ListEditor
          label="Actions to follow up on after this test"
          items={c.nextSteps}
          onChange={items => updateSection('conclusion', { nextSteps: items })}
          placeholder="e.g. Provide LSM800 grade for additional test..."
        />
      </Section>

      {/* Status update */}
      <Section title="Report Status">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['draft', 'completed', 'exported'] as const).map(s => (
            <button key={s}
              onClick={() => updateReport({ status: s })}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                border: activeReport.status === s ? '2px solid #C5001A' : '1px solid #2a2a2a',
                background: activeReport.status === s ? '#1a0003' : '#0d0d0d',
                color: activeReport.status === s ? '#ff4d4d' : '#666',
                fontFamily: 'DM Sans',
              }}
            >
              {s === 'draft' ? 'Draft' : s === 'completed' ? 'Completed' : 'Exported'}
            </button>
          ))}
        </div>
      </Section>

      {/* Export CTA */}
      <Card style={{ background: '#0d0003', border: '1px solid #3a0005', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#f0f0f0', marginBottom: 4 }}>Report ready for export</div>
        <div style={{ fontSize: 12, color: '#555', marginBottom: 16 }}>
          {activeReport.testLog.length} test{activeReport.testLog.length !== 1 ? 's' : ''} ·{' '}
          {activeReport.testLog.reduce((acc, t) => acc + t.photos.length, 0)} photo{activeReport.testLog.reduce((acc, t) => acc + t.photos.length, 0) !== 1 ? 's' : ''}
        </div>
        <Btn onClick={onExport} style={{ width: '100%', padding: '14px', fontSize: 15 }}>
          Generate PDF →
        </Btn>
      </Card>
    </div>
  )
}
