import { useReportStore } from '@/store/reportStore'
import { useTheme } from '@/theme'
import { Section, Row, NumField, Card, Divider } from '@/components/ui'

function MetricCard({ label, ref_val, spk_val, delta, unit = '', invert = false }: {
  label: string
  ref_val: string | number | null
  spk_val: string | number | null
  delta: number | null
  unit?: string
  invert?: boolean
}) {
  const isGood = delta !== null ? (invert ? delta < 0 : delta > 0) : null
  const deltaColor = isGood === null ? '#555' : isGood ? '#4caf50' : '#f44336'
  const deltaSign = delta !== null && delta > 0 ? '+' : ''

  return (
    <Card>
      <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>RÉFÉRENCE</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#f44336' }}>
            {ref_val !== null && ref_val !== '' ? `${ref_val}${unit}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, color: '#555', marginBottom: 2 }}>SPK</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#4caf50' }}>
            {spk_val !== null && spk_val !== '' ? `${spk_val}${unit}` : '—'}
          </div>
        </div>
      </div>
      {delta !== null && (
        <div style={{ background: '#0a0a0a', borderRadius: 6, padding: '6px 10px', textAlign: 'center' }}>
          <span style={{ fontSize: 18, fontWeight: 600, color: deltaColor }}>
            {deltaSign}{delta}{typeof delta === 'number' && Math.abs(delta) > 1 ? '%' : unit}
          </span>
          <span style={{ fontSize: 10, color: '#444', marginLeft: 4 }}>
            {isGood ? '▲ Gain' : '▼ Perte'}
          </span>
        </div>
      )}
    </Card>
  )
}

function RatioCard({ label, value, description }: { label: string; value: string | null; description?: string }) {
  return (
    <Card>
      <div style={{ fontSize: 10, color: '#666', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: '#C5001A' }}>{value ?? '—'}</div>
      {description && <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{description}</div>}
    </Card>
  )
}

export default function ROISection() {
  const { activeReport, updateSection, computeROI } = useReportStore()
  if (!activeReport) return null

  const d = activeReport.roiData
  const m = computeROI()

  const fmt = (v: number | null, decimals = 0) =>
    v !== null ? (decimals > 0 ? v.toFixed(decimals) : String(v)) : null

  return (
    <div>
      {/* ── Input data ── */}
      <Section title="Current Process Data (Reference)">
        <Row>
          <NumField label="Temps de cycle (min)" value={d.ref_cycleTime_min ?? ''}
            onChange={e => updateSection('roiData', { ref_cycleTime_min: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Arêtes / plaquette" value={d.ref_cuttingEdges ?? ''}
            onChange={e => updateSection('roiData', { ref_cuttingEdges: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Parts / Insert" value={d.ref_partsPerInsert ?? ''}
            onChange={e => updateSection('roiData', { ref_partsPerInsert: e.target.value ? Number(e.target.value) : null })} />
        </Row>
        <Row>
          <NumField label="MRR moyen (cm³/min)" value={d.ref_mrr ?? ''}
            hint="Vc × f × ap"
            onChange={e => updateSection('roiData', { ref_mrr: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Durée de vie arête (min)" value={d.ref_toolLife_min ?? ''}
            onChange={e => updateSection('roiData', { ref_toolLife_min: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Prix plaquette (€)" value={d.ref_insertPrice_eur ?? ''}
            onChange={e => updateSection('roiData', { ref_insertPrice_eur: e.target.value ? Number(e.target.value) : null })} />
        </Row>
      </Section>

      <Section title="Données Proposition SPK">
        <Row>
          <NumField label="Temps de cycle (min)" value={d.spk_cycleTime_min ?? ''}
            onChange={e => updateSection('roiData', { spk_cycleTime_min: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Arêtes / plaquette" value={d.spk_cuttingEdges ?? ''}
            onChange={e => updateSection('roiData', { spk_cuttingEdges: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Parts / Insert" value={d.spk_partsPerInsert ?? ''}
            onChange={e => updateSection('roiData', { spk_partsPerInsert: e.target.value ? Number(e.target.value) : null })} />
        </Row>
        <Row>
          <NumField label="MRR moyen (cm³/min)" value={d.spk_mrr ?? ''}
            hint="Vc × f × ap"
            onChange={e => updateSection('roiData', { spk_mrr: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Durée de vie arête (min)" value={d.spk_toolLife_min ?? ''}
            onChange={e => updateSection('roiData', { spk_toolLife_min: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Prix plaquette (€)" value={d.spk_insertPrice_eur ?? ''}
            onChange={e => updateSection('roiData', { spk_insertPrice_eur: e.target.value ? Number(e.target.value) : null })} />
        </Row>
      </Section>

      <Section title="Financial Context (optional)">
        <Row>
          <NumField label="Coût machine (€/h)" value={d.machineCostPerHour_eur ?? ''}
            hint="Pour calcul coût/pièce complet"
            onChange={e => updateSection('roiData', { machineCostPerHour_eur: e.target.value ? Number(e.target.value) : null })} />
          <NumField label="Durée poste (min)" value={d.shiftDuration_min}
            onChange={e => updateSection('roiData', { shiftDuration_min: e.target.value ? Number(e.target.value) : 480 })} />
          <NumField label="Taille de série (pièces)" value={d.seriesSize ?? ''}
            hint="Pour calcul ROI total série"
            onChange={e => updateSection('roiData', { seriesSize: e.target.value ? Number(e.target.value) : null })} />
        </Row>
      </Section>

      {/* ── Computed metrics ── */}
      <Section title="Tableau de bord ROI">
        {/* Row 1 — Core gains */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <MetricCard
            label="Temps de cycle"
            ref_val={d.ref_cycleTime_min !== null ? `${d.ref_cycleTime_min} min` : null}
            spk_val={d.spk_cycleTime_min !== null ? `${d.spk_cycleTime_min} min` : null}
            delta={m.cycleTimeGain_pct}
            invert={true}
          />
          <MetricCard
            label="Arêtes / plaquette"
            ref_val={d.ref_cuttingEdges}
            spk_val={d.spk_cuttingEdges}
            delta={m.cuttingEdgesGain_pct}
          />
          <MetricCard
            label="Parts / Insert"
            ref_val={d.ref_partsPerInsert}
            spk_val={d.spk_partsPerInsert}
            delta={m.partsPerInsertGain_pct}
          />
          <MetricCard
            label="Durée de vie arête"
            ref_val={d.ref_toolLife_min !== null ? `${d.ref_toolLife_min} min` : null}
            spk_val={d.spk_toolLife_min !== null ? `${d.spk_toolLife_min} min` : null}
            delta={d.ref_toolLife_min && d.spk_toolLife_min
              ? Math.round(((d.spk_toolLife_min - d.ref_toolLife_min) / d.ref_toolLife_min) * 100)
              : null}
          />
        </div>

        <Divider />

        {/* Row 2 — Ratios */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <RatioCard
            label="Ratio MRR"
            value={m.mrrRatio !== null ? `×${m.mrrRatio}` : null}
            description="SPK vs Reference"
          />
          <RatioCard
            label="Vol. métal / arête"
            value={m.volumePerEdge_spk !== null ? `${m.volumePerEdge_spk} cm³` : null}
            description={m.volumePerEdge_ref !== null ? `Réf: ${m.volumePerEdge_ref} cm³` : undefined}
          />
          <RatioCard
            label="Gain pièces / poste"
            value={m.piecesPerShiftGain !== null ? `+${m.piecesPerShiftGain}` : null}
            description={m.piecesPerShift_ref && m.piecesPerShift_spk
              ? `${m.piecesPerShift_ref} → ${m.piecesPerShift_spk} pcs/poste` : undefined}
          />
        </div>

        {/* Row 3 — Financial (only if data available) */}
        {(m.costPerPart_ref !== null || m.roiOnSeries_eur !== null) && (
          <>
            <Divider />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {m.costPerPart_ref !== null && m.costPerPart_spk !== null && (
                <MetricCard
                  label="Coût total / pièce"
                  ref_val={m.costPerPart_ref !== null ? `${m.costPerPart_ref} €` : null}
                  spk_val={m.costPerPart_spk !== null ? `${m.costPerPart_spk} €` : null}
                  delta={m.costPerPartGain_pct}
                  invert={true}
                />
              )}
              {m.roiOnSeries_eur !== null && (
                <RatioCard
                  label={`ROI sur série (${d.seriesSize} pcs)`}
                  value={`${m.roiOnSeries_eur > 0 ? '+' : ''}${m.roiOnSeries_eur} €`}
                  description="Économie totale estimée"
                />
              )}
              {m.toolChangesPerSeries_ref !== null && m.toolChangesPerSeries_spk !== null && (
                <MetricCard
                  label="Changements outil / série"
                  ref_val={m.toolChangesPerSeries_ref}
                  spk_val={m.toolChangesPerSeries_spk}
                  delta={m.toolChangesPerSeries_ref && m.toolChangesPerSeries_spk
                    ? Math.round(((m.toolChangesPerSeries_spk - m.toolChangesPerSeries_ref) / m.toolChangesPerSeries_ref) * 100)
                    : null}
                  invert={true}
                />
              )}
            </div>
          </>
        )}

        {/* Summary banner */}
        {m.cycleTimeGain_pct !== null && (
          <div style={{ background: '#0d0003', border: '1px solid #3a0005', borderRadius: 10, padding: '16px', marginTop: 4 }}>
            <div style={{ fontSize: 10, color: '#C5001A', letterSpacing: '1px', marginBottom: 8 }}>SYNTHÈSE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
              {m.cycleTimeGain_pct !== null && (
                <div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: Math.abs(m.cycleTimeGain_pct) > 0 ? '#4caf50' : '#f44336' }}>
                    {m.cycleTimeGain_pct > 0 ? '+' : ''}{m.cycleTimeGain_pct}%
                  </span>
                  <div style={{ fontSize: 10, color: '#555' }}>temps cycle</div>
                </div>
              )}
              {m.cuttingEdgesGain_pct !== null && (
                <div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#4caf50' }}>+{m.cuttingEdgesGain_pct}%</span>
                  <div style={{ fontSize: 10, color: '#555' }}>arêtes/plaquette</div>
                </div>
              )}
              {m.partsPerInsertGain_pct !== null && (
                <div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#4caf50' }}>+{m.partsPerInsertGain_pct}%</span>
                  <div style={{ fontSize: 10, color: '#555' }}>pièces/plaquette</div>
                </div>
              )}
              {m.mrrRatio !== null && (
                <div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#C5001A' }}>×{m.mrrRatio}</span>
                  <div style={{ fontSize: 10, color: '#555' }}>MRR SPK/Réf</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
