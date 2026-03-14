import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReportStore } from '@/store/reportStore'
import Layout from '@/components/Layout'
import { Section, Row, Field, NumField, TextArea, Select, Btn, StepNav, Card, Divider } from '@/components/ui'
import PhotoCapture from '@/components/PhotoCapture'
import TestLogSection from './TestLogSection'
import ROISection from './ROISection'
import ConclusionSection from './ConclusionSection'

const STEPS = ['Header', 'Workpiece', 'Scope', 'Tests', 'ROI', 'Conclusion']

const MATERIALS = ['Inconel 718', 'Inconel 625', 'Waspaloy', 'Ti-6Al-4V', 'Ti-6Al-2Sn-4Zr-2Mo', 'GJL 250', 'GJS 500', 'GJS 700', 'CGI (GJV)', 'Acier traité > 55 HRC', 'Acier traité 40-55 HRC', 'Autre']
const PASS_TYPES = [
  { value: 'face', label: 'Dressage (Face)' },
  { value: 'diameter', label: 'Tournage cylindrique' },
  { value: 'profile', label: 'Profil / Contournage' },
  { value: 'groove', label: 'Rainurage / Gorge' },
  { value: 'contour', label: 'Contour libre' },
]

export default function ReportEditor() {
  const nav = useNavigate()
  const [step, setStep] = useState(0)
  const { activeReport, updateSection, updateReport, saveReport, isSaving } = useReportStore()

  useEffect(() => {
    if (!activeReport) nav('/')
  }, [activeReport, nav])

  if (!activeReport) return null

  const save = async () => {
    await saveReport()
  }

  const r = activeReport

  const handleNext = async () => {
    await save()
    if (step < STEPS.length - 1) setStep(s => s + 1)
  }

  return (
    <Layout
      title={r.opportunityRef || 'New Report'}
      back="/"
    >
      <StepNav steps={STEPS} current={step} onGo={setStep} />

      {/* STEP 0 — Header */}
      {step === 0 && (
        <div>
          <Section title="Reference">
            <Row>
              <Field label="N° Opportunité" value={r.opportunityRef} placeholder="Opp-07640"
                onChange={e => updateReport({ opportunityRef: e.target.value })} />
              <Field label="Titre" value={r.title}
                onChange={e => updateReport({ title: e.target.value })} />
            </Row>
            <Row>
              <Field label="Date" type="date" value={r.createdAt.slice(0, 10)}
                onChange={e => updateReport({ createdAt: e.target.value })} />
              <Select label="Language" value={r.language}
                onChange={e => updateReport({ language: e.target.value as typeof r.language })}
                options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }, { value: 'de', label: 'Deutsch' }, { value: 'it', label: 'Italiano' }]} />
            </Row>
          </Section>

          <Section title="SPK Contacts">
            <Row>
              <Field label="Commercial" value={r.contacts.salesName}
                onChange={e => updateSection('contacts', { salesName: e.target.value })} />
              <Field label="Application Engineer" value={r.contacts.appEngineerName}
                onChange={e => updateSection('contacts', { appEngineerName: e.target.value })} />
            </Row>
          </Section>

          <Section title="Contacts Client">
            <Field label="Société" value={r.contacts.customerCompany}
              onChange={e => updateSection('contacts', { customerCompany: e.target.value })} />
            <Row>
              <Field label="Contact principal" value={r.contacts.customerContact}
                onChange={e => updateSection('contacts', { customerContact: e.target.value })} />
              <Field label="Fonction" value={r.contacts.customerRole}
                onChange={e => updateSection('contacts', { customerRole: e.target.value })} />
            </Row>
            <Row>
              <Field label="Contact 2 (optionnel)" value={r.contacts.customerContact2 || ''}
                onChange={e => updateSection('contacts', { customerContact2: e.target.value })} />
              <Field label="Fonction 2" value={r.contacts.customerRole2 || ''}
                onChange={e => updateSection('contacts', { customerRole2: e.target.value })} />
            </Row>
          </Section>
        </div>
      )}

      {/* STEP 1 — Workpiece + Machine */}
      {step === 1 && (
        <div>
          <Section title="Workpiece">
            <Field label="Part Typology" value={r.workpiece.typology} placeholder="ex: Aerospace Component"
              onChange={e => updateSection('workpiece', { typology: e.target.value })} />
            <Row>
              <Select label="Material" value={r.workpiece.material}
                onChange={e => updateSection('workpiece', { material: e.target.value })}
                options={[{ value: '', label: 'Sélectionner...' }, ...MATERIALS.map(m => ({ value: m, label: m }))]} />
              <Row>
                <Select label="Dureté" value={r.workpiece.hardness}
                  onChange={e => updateSection('workpiece', { hardness: e.target.value })}
                  options={[{ value: 'HRC', label: 'HRC' }, { value: 'HB', label: 'HB' }, { value: 'HV', label: 'HV' }]} />
                <NumField label="Valeur" value={r.workpiece.hardnessValue ?? ''}
                  onChange={e => updateSection('workpiece', { hardnessValue: e.target.value ? Number(e.target.value) : null })} />
              </Row>
            </Row>
            <Field label="Fabricant brut / Fonderie" value={r.workpiece.castingManufacturer}
              onChange={e => updateSection('workpiece', { castingManufacturer: e.target.value })} />
            <TextArea label="Notes pièce" value={r.workpiece.notes}
              onChange={e => updateSection('workpiece', { notes: e.target.value })} />
            <PhotoCapture
              label="Plan pièce / Photo pièce (annoter les zones d'usinage)"
              photos={r.workpiece.drawingPhoto ? [r.workpiece.drawingPhoto] : []}
              onChange={photos => updateSection('workpiece', { drawingPhoto: photos[0] })}
              maxPhotos={1}
            />
          </Section>

          <Section title="Machine">
            <Row>
              <Field label="Machine Manufacturer" value={r.machine.manufacturer}
                onChange={e => updateSection('machine', { manufacturer: e.target.value })} />
              <Field label="Model" value={r.machine.model}
                onChange={e => updateSection('machine', { model: e.target.value })} />
            </Row>
            <Row>
              <Select label="Operation Type" value={r.machine.operationType}
                onChange={e => updateSection('machine', { operationType: e.target.value as 'turning' | 'milling' })}
                options={[{ value: 'turning', label: 'Tournage' }, { value: 'milling', label: 'Fraisage' }]} />
              <Field label="Operation" value={r.machine.operation} placeholder="OP10"
                onChange={e => updateSection('machine', { operation: e.target.value })} />
            </Row>
            <Row>
              <NumField label="Pump Pressure (bar)" value={r.machine.pumpPressure_bar ?? ''}
                onChange={e => updateSection('machine', { pumpPressure_bar: e.target.value ? Number(e.target.value) : null })} />
              <Select label="Type de lubrification" value={r.machine.coolantType}
                onChange={e => updateSection('machine', { coolantType: e.target.value })}
                options={[{ value: 'HPC', label: 'HPC (Haute Pression)' }, { value: 'flood', label: 'Arrosage classique' }, { value: 'mist', label: 'Brouillard' }, { value: 'dry', label: 'Sec' }]} />
            </Row>
            <Row>
              <NumField label="Vitesse max (tr/min)" value={r.machine.maxRPM ?? ''}
                onChange={e => updateSection('machine', { maxRPM: e.target.value ? Number(e.target.value) : null })} />
              <NumField label="Puissance (kW)" value={r.machine.maxPower_kW ?? ''}
                onChange={e => updateSection('machine', { maxPower_kW: e.target.value ? Number(e.target.value) : null })} />
            </Row>
          </Section>
        </div>
      )}

      {/* STEP 2 — Scope + Current Process */}
      {step === 2 && (
        <div>
          <Section title="Test Objective">
            <TextArea label="Objective" value={r.testScope.objective} rows={4}
              placeholder="Présenter le potentiel des plaquettes céramique sur ce matériau..."
              onChange={e => updateSection('testScope', { objective: e.target.value })} />
            <TextArea label="Historique / Problèmes actuels" value={r.testScope.backgroundContext} rows={3}
              placeholder="Le client n'arrivait pas à obtenir une stabilité satisfaisante avec les plaquettes carbure..."
              onChange={e => updateSection('testScope', { backgroundContext: e.target.value })} />
          </Section>

          <Section title="Current Process (Reference)">
            <Row>
              <Field label="Réf. plaquette" value={r.currentProcess.insertRef}
                onChange={e => updateSection('currentProcess', { insertRef: e.target.value })} />
              <Field label="Fournisseur" value={r.currentProcess.insertSupplier}
                onChange={e => updateSection('currentProcess', { insertSupplier: e.target.value })} />
            </Row>
            <Row>
              <Field label="Réf. porte-outil" value={r.currentProcess.toolholderRef}
                onChange={e => updateSection('currentProcess', { toolholderRef: e.target.value })} />
              <Field label="Toolholder Supplier" value={r.currentProcess.toolholderSupplier}
                onChange={e => updateSection('currentProcess', { toolholderSupplier: e.target.value })} />
            </Row>
            <Row>
              <NumField label="Cutting Edges / Insert" value={r.currentProcess.cuttingEdgesPerInsert ?? ''}
                onChange={e => updateSection('currentProcess', { cuttingEdgesPerInsert: e.target.value ? Number(e.target.value) : null })} />
              <NumField label="Parts / Insert" value={r.currentProcess.partsPerInsert ?? ''}
                onChange={e => updateSection('currentProcess', { partsPerInsert: e.target.value ? Number(e.target.value) : null })} />
              <NumField label="Temps cycle total (min)" value={r.currentProcess.totalCycleTime_min ?? ''}
                onChange={e => updateSection('currentProcess', { totalCycleTime_min: e.target.value ? Number(e.target.value) : null })} />
            </Row>

            {/* Passes */}
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>Passes d'usinage</div>
              {r.currentProcess.passes.map((pass, i) => (
                <Card key={i} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: '#C5001A', fontWeight: 500 }}>Passe {pass.passId}</span>
                    <button onClick={() => {
                      const passes = r.currentProcess.passes.filter((_, j) => j !== i)
                      updateSection('currentProcess', { passes })
                    }} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                  <Row>
                    <Select label="Type" value={pass.passType}
                      onChange={e => {
                        const passes = [...r.currentProcess.passes]
                        passes[i] = { ...passes[i], passType: e.target.value as typeof pass.passType }
                        updateSection('currentProcess', { passes })
                      }}
                      options={PASS_TYPES} />
                    <NumField label="Vc (m/min)" value={pass.vc_m_min ?? ''}
                      onChange={e => {
                        const passes = [...r.currentProcess.passes]
                        passes[i] = { ...passes[i], vc_m_min: e.target.value ? Number(e.target.value) : null }
                        updateSection('currentProcess', { passes })
                      }} />
                    <NumField label="f (mm/tr)" value={pass.f_mm_rev ?? ''}
                      onChange={e => {
                        const passes = [...r.currentProcess.passes]
                        passes[i] = { ...passes[i], f_mm_rev: e.target.value ? Number(e.target.value) : null }
                        updateSection('currentProcess', { passes })
                      }} />
                    <NumField label="ap (mm)" value={pass.ap_mm ?? ''}
                      onChange={e => {
                        const passes = [...r.currentProcess.passes]
                        passes[i] = { ...passes[i], ap_mm: e.target.value ? Number(e.target.value) : null }
                        updateSection('currentProcess', { passes })
                      }} />
                    <NumField label="Temps (min)" value={pass.cycleTime_min ?? ''}
                      onChange={e => {
                        const passes = [...r.currentProcess.passes]
                        passes[i] = { ...passes[i], cycleTime_min: e.target.value ? Number(e.target.value) : null }
                        updateSection('currentProcess', { passes })
                      }} />
                  </Row>
                </Card>
              ))}
              <Btn variant="ghost" onClick={() => {
                const newPass = { passId: `1.${r.currentProcess.passes.length + 1}`, passType: 'face' as const, vc_m_min: null, f_mm_rev: null, ap_mm: null, cycleTime_min: null, toolLife_cuts: null, toolLife_min: null }
                updateSection('currentProcess', { passes: [...r.currentProcess.passes, newPass] })
              }}>+ Add Pass</Btn>
            </div>
          </Section>

          <Section title="Proposition SPK">
            <Row>
              <Field label="Réf. plaquette" value={r.spkProposal.insertRef}
                onChange={e => updateSection('spkProposal', { insertRef: e.target.value })} />
              <Field label="Grade" value={r.spkProposal.insertGrade}
                onChange={e => updateSection('spkProposal', { insertGrade: e.target.value })} />
            </Row>
            <Field label="Internal Part Number" value={r.spkProposal.insertPartNumber}
              onChange={e => updateSection('spkProposal', { insertPartNumber: e.target.value })} />
            <Row>
              <Field label="Réf. porte-outil" value={r.spkProposal.toolholderRef}
                onChange={e => updateSection('spkProposal', { toolholderRef: e.target.value })} />
              <Field label="Code porte-outil" value={r.spkProposal.toolholderPartNumber}
                onChange={e => updateSection('spkProposal', { toolholderPartNumber: e.target.value })} />
            </Row>
            <Row>
              <NumField label="Cutting Edges / Insert" value={r.spkProposal.cuttingEdgesPerInsert ?? ''}
                onChange={e => updateSection('spkProposal', { cuttingEdgesPerInsert: e.target.value ? Number(e.target.value) : null })} />
            </Row>
            <TextArea label="Notes" value={r.spkProposal.notes}
              onChange={e => updateSection('spkProposal', { notes: e.target.value })} />
            <PhotoCapture
              label="Photos setup (plaquette, porte-outil, montage machine)"
              photos={r.spkProposal.setupPhotos}
              onChange={photos => updateSection('spkProposal', { setupPhotos: photos })}
              maxPhotos={5}
            />
          </Section>
        </div>
      )}

      {/* STEP 3 — Test Log */}
      {step === 3 && <TestLogSection />}

      {/* STEP 4 — ROI */}
      {step === 4 && <ROISection />}

      {/* STEP 5 — Conclusion */}
      {step === 5 && <ConclusionSection onExport={() => nav('/report/export')} />}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #1a1a1a' }}>
        {step > 0
          ? <Btn variant="ghost" onClick={() => setStep(s => s - 1)}>‹ Previous</Btn>
          : <div />}
        {step < STEPS.length - 1
          ? <Btn onClick={handleNext}>Next ›</Btn>
          : <Btn onClick={() => nav('/report/export')}>Exporter PDF ›</Btn>}
      </div>
    </Layout>
  )
}
