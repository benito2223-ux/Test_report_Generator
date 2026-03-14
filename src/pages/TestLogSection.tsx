import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useReportStore } from '@/store/reportStore'
import { Section, Row, NumField, TextArea, Select, Btn, Card, Tag, Divider } from '@/components/ui'
import PhotoCapture from '@/components/PhotoCapture'
import type { TestEntry, PassType, TestOutcome, ReportPhoto } from '@/types'

const PASS_TYPES: { value: PassType; label: string }[] = [
  { value: 'face', label: 'Facing' },
  { value: 'diameter', label: 'Turning (diameter)' },
  { value: 'profile', label: 'Profile' },
  { value: 'groove', label: 'Grooving' },
  { value: 'contour', label: 'Contour' },
]

const OUTCOMES: { value: TestOutcome; label: string; color: 'success' | 'danger' | 'warning' | 'info' }[] = [
  { value: 'success', label: 'Success', color: 'success' },
  { value: 'breakage', label: 'Breakage', color: 'danger' },
  { value: 'wear', label: 'Wear', color: 'warning' },
  { value: 'aborted', label: 'Aborted', color: 'info' },
  { value: 'in_progress', label: 'En cours', color: 'info' },
]

function computeMRR(vc: number | null, f: number | null, ap: number | null): number | null {
  if (!vc || !f || !ap) return null
  return Math.round(vc * f * ap * 1000) / 1000
}

export default function TestLogSection() {
  const { activeReport, addTest, updateTest, removeTest } = useReportStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newTest, setNewTest] = useState<Partial<TestEntry> | null>(null)

  if (!activeReport) return null
  const tests = activeReport.testLog

  const getNextNumbers = () => {
    const testNumbers = tests.map(t => t.testNumber)
    const testNumber = testNumbers.length > 0 ? Math.max(...testNumbers) + 1 : 1
    const wpNumbers = tests.map(t => t.workpieceNumber)
    const workpieceNumber = wpNumbers.length > 0 ? Math.max(...wpNumbers) : 1
    return { testNumber, workpieceNumber }
  }

  const startNewTest = () => {
    const { testNumber, workpieceNumber } = getNextNumbers()
    setNewTest({
      id: uuidv4(),
      testNumber,
      workpieceNumber,
      passRef: '1.1',
      passType: 'face',
      parameters: { vc_m_min: null, f_mm_rev: null, ap_mm: null },
      results: { insertLife_min: null, insertLife_cuts: null, outcome: 'in_progress' },
      observations: '',
      photos: [],
    })
  }

  const saveNewTest = () => {
    if (!newTest) return
    addTest(newTest as Omit<TestEntry, 'id' | 'createdAt'>)
    setNewTest(null)
  }

  const outcomeObj = (o: TestOutcome) => OUTCOMES.find(x => x.value === o) || OUTCOMES[0]

  return (
    <div>
      <Section title={`Journal de tests (${tests.length} test${tests.length !== 1 ? 's' : ''})`}>
        {tests.length === 0 && !newTest && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#444' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🔬</div>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Aucun test enregistré</div>
            <div style={{ fontSize: 12, color: '#333' }}>Ajoutez votre premier test ci-dessous</div>
          </div>
        )}

        {tests.map((test, idx) => {
          const mrr = computeMRR(test.parameters.vc_m_min, test.parameters.f_mm_rev, test.parameters.ap_mm)
          const isExpanded = expandedId === test.id
          const oc = outcomeObj(test.results.outcome)

          return (
            <Card key={test.id} style={{ borderLeft: `3px solid ${oc.color === 'success' ? '#4caf50' : oc.color === 'danger' ? '#f44336' : oc.color === 'warning' ? '#ffb300' : '#1e88e5'}` }}>
              {/* Card header */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: isExpanded ? 12 : 0 }}
                onClick={() => setExpandedId(isExpanded ? null : test.id)}
              >
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#C5001A', flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#f0f0f0' }}>
                    Test #{test.testNumber} — Workpiece #{test.workpieceNumber} — {PASS_TYPES.find(p => p.value === test.passType)?.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>
                    {test.parameters.vc_m_min && `Vc ${test.parameters.vc_m_min} m/min`}
                    {test.parameters.f_mm_rev && ` · f ${test.parameters.f_mm_rev} mm/tr`}
                    {test.parameters.ap_mm && ` · ap ${test.parameters.ap_mm} mm`}
                    {mrr && ` · MRR ${mrr} cm³/min`}
                  </div>
                </div>
                <Tag color={oc.color}>{oc.label}</Tag>
                {test.photos.length > 0 && (
                  <span style={{ fontSize: 10, color: '#555' }}>📷 {test.photos.length}</span>
                )}
                <span style={{ color: '#444', fontSize: 14, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <Divider />
                  <Row>
                    <NumField label="N° Test" value={test.testNumber}
                      onChange={e => updateTest(test.id, { testNumber: Number(e.target.value) })} />
                    <NumField label="Workpiece #" value={test.workpieceNumber}
                      onChange={e => updateTest(test.id, { workpieceNumber: Number(e.target.value) })} />
                    <Select label="Pass Type" value={test.passType}
                      onChange={e => updateTest(test.id, { passType: e.target.value as PassType })}
                      options={PASS_TYPES} />
                  </Row>

                  <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#C5001A', letterSpacing: '0.5px', marginBottom: 8 }}>PARAMÈTRES DE COUPE</div>
                    <Row>
                      <NumField label="Vc (m/min)" value={test.parameters.vc_m_min ?? ''}
                        onChange={e => updateTest(test.id, { parameters: { ...test.parameters, vc_m_min: e.target.value ? Number(e.target.value) : null } })} />
                      <NumField label="f (mm/tr)" value={test.parameters.f_mm_rev ?? ''}
                        onChange={e => updateTest(test.id, { parameters: { ...test.parameters, f_mm_rev: e.target.value ? Number(e.target.value) : null } })} />
                      <NumField label="ap (mm)" value={test.parameters.ap_mm ?? ''}
                        onChange={e => updateTest(test.id, { parameters: { ...test.parameters, ap_mm: e.target.value ? Number(e.target.value) : null } })} />
                    </Row>
                    {mrr && (
                      <div style={{ marginTop: 8, fontSize: 11, color: '#888' }}>
                        MRR calculé : <span style={{ color: '#C5001A', fontWeight: 500 }}>{mrr} cm³/min</span>
                        <span style={{ color: '#444' }}> (Vc × f × ap)</span>
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#C5001A', letterSpacing: '0.5px', marginBottom: 8 }}>RÉSULTATS</div>
                    <Row>
                      <NumField label="Durée de vie (min)" value={test.results.insertLife_min ?? ''}
                        onChange={e => updateTest(test.id, { results: { ...test.results, insertLife_min: e.target.value ? Number(e.target.value) : null } })} />
                      <NumField label="Insert Life (cuts)" value={test.results.insertLife_cuts ?? ''}
                        onChange={e => updateTest(test.id, { results: { ...test.results, insertLife_cuts: e.target.value ? Number(e.target.value) : null } })} />
                    </Row>
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Résultat</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {OUTCOMES.map(o => (
                          <button key={o.value}
                            onClick={() => updateTest(test.id, { results: { ...test.results, outcome: o.value } })}
                            style={{
                              padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                              border: test.results.outcome === o.value ? '2px solid #C5001A' : '1px solid #2a2a2a',
                              background: test.results.outcome === o.value ? '#1a0003' : '#0d0d0d',
                              color: test.results.outcome === o.value ? '#ff4d4d' : '#888',
                            }}
                          >{o.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <TextArea label="Observations et analyse" value={test.observations} rows={3}
                    placeholder="Décrire le comportement de la plaquette, le type d'usure, les problèmes identifiés..."
                    onChange={e => updateTest(test.id, { observations: e.target.value })} />

                  <PhotoCapture
                    label="Photos (cutting edge · chips · surface finish · details)"
                    photos={test.photos}
                    onChange={photos => updateTest(test.id, { photos })}
                    maxPhotos={8}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
                    <Btn variant="danger" onClick={() => {
                      removeTest(test.id)
                      setExpandedId(null)
                    }}>Delete test</Btn>
                  </div>
                </div>
              )}
            </Card>
          )
        })}

        {/* New test form */}
        {newTest && (
          <Card style={{ border: '1px solid #C5001A' }}>
            <div style={{ fontSize: 12, color: '#C5001A', fontWeight: 500, marginBottom: 12 }}>
              Nouveau test #{newTest.testNumber}
            </div>
            <Row>
              <NumField label="Workpiece #" value={newTest.workpieceNumber ?? ''}
                onChange={e => setNewTest(t => ({ ...t!, workpieceNumber: Number(e.target.value) }))} />
              <Select label="Pass Type" value={newTest.passType || 'face'}
                onChange={e => setNewTest(t => ({ ...t!, passType: e.target.value as PassType }))}
                options={PASS_TYPES} />
            </Row>
            <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 12, marginTop: 8 }}>
              <div style={{ fontSize: 10, color: '#C5001A', letterSpacing: '0.5px', marginBottom: 8 }}>PARAMÈTRES</div>
              <Row>
                <NumField label="Vc (m/min)" value={newTest.parameters?.vc_m_min ?? ''}
                  onChange={e => setNewTest(t => ({ ...t!, parameters: { ...t!.parameters!, vc_m_min: e.target.value ? Number(e.target.value) : null } }))} />
                <NumField label="f (mm/tr)" value={newTest.parameters?.f_mm_rev ?? ''}
                  onChange={e => setNewTest(t => ({ ...t!, parameters: { ...t!.parameters!, f_mm_rev: e.target.value ? Number(e.target.value) : null } }))} />
                <NumField label="ap (mm)" value={newTest.parameters?.ap_mm ?? ''}
                  onChange={e => setNewTest(t => ({ ...t!, parameters: { ...t!.parameters!, ap_mm: e.target.value ? Number(e.target.value) : null } }))} />
              </Row>
              {(() => {
                const m = computeMRR(newTest.parameters?.vc_m_min ?? null, newTest.parameters?.f_mm_rev ?? null, newTest.parameters?.ap_mm ?? null)
                return m ? <div style={{ marginTop: 8, fontSize: 11, color: '#C5001A' }}>MRR = {m} cm³/min</div> : null
              })()}
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6 }}>Résultat initial</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {OUTCOMES.map(o => (
                  <button key={o.value}
                    onClick={() => setNewTest(t => ({ ...t!, results: { ...t!.results!, outcome: o.value } }))}
                    style={{
                      padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                      border: newTest.results?.outcome === o.value ? '2px solid #C5001A' : '1px solid #2a2a2a',
                      background: newTest.results?.outcome === o.value ? '#1a0003' : '#0d0d0d',
                      color: newTest.results?.outcome === o.value ? '#ff4d4d' : '#888',
                    }}
                  >{o.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn onClick={saveNewTest}>Add test</Btn>
              <Btn variant="ghost" onClick={() => setNewTest(null)}>Annuler</Btn>
            </div>
          </Card>
        )}

        {!newTest && (
          <Btn onClick={startNewTest}>+ Add test</Btn>
        )}
      </Section>
    </div>
  )
}
