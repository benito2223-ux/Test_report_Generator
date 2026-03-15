import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/db'
import { upsertReport } from '@/supabase'
import type { Report, TestEntry, ReportPhoto, ROIMetrics, ROIData } from '@/types'

function createEmptyReport(): Report {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    opportunityRef: 'Opp-07640',
    title: 'MACHINING TEST - Inconel 718',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    language: (localStorage.getItem('spk-lang') || 'EN').toLowerCase() as any,
    contacts: {
      salesName: 'Benjamin Rouquette',
      appEngineerName: 'Thomas Müller',
      company: 'SPK by CeramTec',
      customerCompany: 'SAFRAN Nacelles',
      customerContact: 'Jean-Pierre Martin',
      customerRole: 'Manufacturing Engineer',
    },
    workpiece: {
      typology: 'Turbine Ring',
      material: 'Inconel 718',
      hardness: 'HRC',
      hardnessValue: 38,
      castingManufacturer: 'Aubert & Duval',
      notes: 'Critical aerospace component. Tight tolerances on inner diameter.',
    },
    machine: {
      manufacturer: 'Mazak',
      model: 'Integrex i-400',
      operationType: 'turning',
      pumpPressure_bar: 80,
      maxRPM: 5000,
      maxPower_kW: 30,
      coolantType: 'HPC',
      operation: 'OP10',
    },
    testScope: {
      objective: 'Evaluate SPK SiAlON ceramic inserts on Inconel 718 turbine ring turning. Target: increase MRR ×3 vs carbide reference and achieve >15 min tool life.',
      backgroundContext: 'Customer currently uses carbide CNMG 120408 (Sandvik) at Vc = 45 m/min. Frequent insert breakage above 50 m/min. SPK SiAlON grade proposed as upgrade to unlock higher speeds.',
    },
    currentProcess: {
      insertRef: 'CNMG 120408',
      insertSupplier: 'Sandvik',
      toolholderRef: 'PCLNR 2525M 12',
      toolholderSupplier: 'Sandvik',
      cuttingEdgesPerInsert: 4,
      passes: [
        { passId: '1.1', passType: 'diameter', vc_m_min: 45, f_mm_rev: 0.2, ap_mm: 1.5, cycleTime_min: 8, toolLife_cuts: null, toolLife_min: 18 },
        { passId: '1.2', passType: 'face', vc_m_min: 45, f_mm_rev: 0.15, ap_mm: 0.5, cycleTime_min: 4, toolLife_cuts: null, toolLife_min: null },
      ],
      totalCycleTime_min: 12,
      partsPerInsert: 8,
      setupPhotos: [],
    },
    spkProposal: {
      insertRef: 'CNGA 120408',
      insertPartNumber: 'SPK-0001234',
      insertGrade: 'SiAlON',
      toolholderRef: 'PCLNR 2525M 12',
      toolholderPartNumber: 'SPK-TH-001',
      cuttingEdgesPerInsert: 2,
      notes: 'SiAlON grade optimized for heat-resistant superalloys (HRSA). Requires HPC coolant at min 80 bar. Target Vc: 130–160 m/min.',
      setupPhotos: [],
    },
    testLog: [],
    roiData: {
      ref_cycleTime_min: 12,
      ref_insertRef: 'CNMG 120408',
      ref_insertSupplier: 'Sandvik',
      ref_cuttingEdges: 4,
      ref_partsPerInsert: 8,
      ref_insertPrice_eur: 12,
      ref_mrr: 2.2,
      ref_toolLife_min: 18,
      spk_cycleTime_min: 5,
      spk_cuttingEdges: 2,
      spk_partsPerInsert: 15,
      spk_insertPrice_eur: 18,
      spk_mrr: 7.5,
      spk_toolLife_min: 22,
      machineCostPerHour_eur: 120,
      shiftDuration_min: 480,
      seriesSize: 500,
    },
    conclusion: {
      summary: 'SPK SiAlON ceramic inserts achieved a ×3.4 MRR increase vs carbide reference on Inconel 718 turning. Cycle time reduced from 12 min to 5 min with improved tool life.',
      keyLearnings: [
        'MRR ×3.4 vs carbide at Vc = 150 m/min',
        'Stable cutting observed up to 160 m/min',
        'Excellent surface finish Ra < 0.8 µm achieved',
      ],
      operatingRules: [
        'Minimum HPC coolant pressure: 80 bar',
        'Recommended Vc range: 130–160 m/min',
        'Avoid interrupted cuts — continuous engagement required',
      ],
      nextSteps: [
        'Validate on serial production batch of 10 parts',
        'Provide LSM800 grade for comparison test',
        'Submit formal commercial offer',
      ],
    },
    pdfExport: { lastExportedAt: null, templateVersion: '1.0' },
  }
}

interface ReportStore {
  activeReport: Report | null
  isSaving: boolean
  
  // Lifecycle
  newReport: () => void
  loadReport: (id: string, reportData?: any) => Promise<void>
  saveReport: () => Promise<void>
  
  // Section updates
  updateSection: <K extends keyof Report>(section: K, data: Partial<Report[K]>) => void
  updateReport: (data: Partial<Report>) => void
  
  // Test log
  addTest: (test: Omit<TestEntry, 'id' | 'createdAt'>) => void
  updateTest: (id: string, data: Partial<TestEntry>) => void
  removeTest: (id: string) => void
  addPhotoToTest: (testId: string, photo: ReportPhoto) => void
  
  // Computed ROI
  computeROI: () => ROIMetrics
}

export const useReportStore = create<ReportStore>((set, get) => ({
  activeReport: null,
  isSaving: false,

  newReport: () => set({ activeReport: createEmptyReport() }),

  loadReport: async (id, reportData?) => {
    if (reportData) { set({ activeReport: reportData }); return }
    const report = await db.reports.get(id)
    if (report) set({ activeReport: report })
  },

  saveReport: async () => {
    const { activeReport } = get()
    if (!activeReport) return
    set({ isSaving: true })
    const updated = { ...activeReport, updatedAt: new Date().toISOString() }
    // Save to Supabase (primary) and IndexedDB (local backup)
    await Promise.all([
      upsertReport(updated),
      db.reports.put(updated),
    ])
    set({ activeReport: updated, isSaving: false })
  },

  updateSection: (section, data) => {
    const { activeReport } = get()
    if (!activeReport) return
    set({
      activeReport: {
        ...activeReport,
        [section]: { ...(activeReport[section] as object), ...data },
        updatedAt: new Date().toISOString(),
      }
    })
  },

  updateReport: (data) => {
    const { activeReport } = get()
    if (!activeReport) return
    set({ activeReport: { ...activeReport, ...data, updatedAt: new Date().toISOString() } })
  },

  addTest: (test) => {
    const { activeReport } = get()
    if (!activeReport) return
    const newTest: TestEntry = { ...test, id: uuidv4(), createdAt: new Date().toISOString() }
    set({
      activeReport: {
        ...activeReport,
        testLog: [...activeReport.testLog, newTest],
        updatedAt: new Date().toISOString(),
      }
    })
  },

  updateTest: (id: string, data: any) => {
    const { activeReport } = get()
    if (!activeReport) return
    set({
      activeReport: {
        ...activeReport,
        testLog: activeReport.testLog.map((t: any) => t.id === id ? { ...t, ...data } : t),
        updatedAt: new Date().toISOString(),
      }
    })
  },

  removeTest: (id) => {
    const { activeReport } = get()
    if (!activeReport) return
    set({
      activeReport: {
        ...activeReport,
        testLog: activeReport.testLog.filter(t => t.id !== id),
        updatedAt: new Date().toISOString(),
      }
    })
  },

  addPhotoToTest: (testId: string, photo: any) => {
    const { activeReport } = get()
    if (!activeReport) return
    set({
      activeReport: {
        ...activeReport,
        testLog: activeReport.testLog.map((t: any) =>
          t.id === testId ? { ...t, photos: [...t.photos, photo] } : t
        ),
        updatedAt: new Date().toISOString(),
      }
    })
  },

  computeROI: (): ROIMetrics => {
    const { activeReport } = get()
    if (!activeReport) return {} as ROIMetrics
    const d = activeReport.roiData

    const pct = (a: number | null, b: number | null) =>
      a != null && b != null && b !== 0 ? Math.round(((a - b) / b) * 100) : null

    const cycleTimeGain_pct = pct(d.ref_cycleTime_min, d.spk_cycleTime_min)
      !== null ? pct(d.spk_cycleTime_min, d.ref_cycleTime_min) : null

    const mrrRatio = d.ref_mrr && d.spk_mrr && d.ref_mrr > 0
      ? Math.round((d.spk_mrr / d.ref_mrr) * 10) / 10 : null

    const piecesPerShift = (ct: number | null) =>
      ct && ct > 0 ? Math.floor(d.shiftDuration_min / ct) : null

    const piecesPerShift_ref = piecesPerShift(d.ref_cycleTime_min)
    const piecesPerShift_spk = piecesPerShift(d.spk_cycleTime_min)

    const volumePerEdge = (mrr: number | null, life: number | null) =>
      mrr && life ? Math.round(mrr * life) : null

    const costPerPart = (price: number | null, ppi: number | null, ct: number | null, mch: number | null) => {
      if (!ppi || ppi === 0) return null
      const toolCost = price ? price / ppi : 0
      const machineCost = mch && ct ? (mch / 60) * ct : 0
      return Math.round((toolCost + machineCost) * 100) / 100
    }

    const cpp_ref = costPerPart(d.ref_insertPrice_eur, d.ref_partsPerInsert, d.ref_cycleTime_min, d.machineCostPerHour_eur)
    const cpp_spk = costPerPart(d.spk_insertPrice_eur, d.spk_partsPerInsert, d.spk_cycleTime_min, d.machineCostPerHour_eur)

    return {
      cycleTimeGain_pct: d.ref_cycleTime_min && d.spk_cycleTime_min && d.ref_cycleTime_min > 0
        ? Math.round(((d.spk_cycleTime_min - d.ref_cycleTime_min) / d.ref_cycleTime_min) * 100) : null,
      cuttingEdgesGain_pct: pct(d.spk_cuttingEdges, d.ref_cuttingEdges),
      partsPerInsertGain_pct: pct(d.spk_partsPerInsert, d.ref_partsPerInsert),
      mrrRatio,
      volumePerEdge_ref: volumePerEdge(d.ref_mrr, d.ref_toolLife_min),
      volumePerEdge_spk: volumePerEdge(d.spk_mrr, d.spk_toolLife_min),
      piecesPerShift_ref,
      piecesPerShift_spk,
      piecesPerShiftGain: piecesPerShift_ref && piecesPerShift_spk ? piecesPerShift_spk - piecesPerShift_ref : null,
      costPerPart_ref: cpp_ref,
      costPerPart_spk: cpp_spk,
      costPerPartGain_pct: cpp_ref && cpp_spk && cpp_ref > 0
        ? Math.round(((cpp_spk - cpp_ref) / cpp_ref) * 100) : null,
      roiOnSeries_eur: cpp_ref && cpp_spk && d.seriesSize
        ? Math.round((cpp_ref - cpp_spk) * d.seriesSize) : null,
      toolChangesPerSeries_ref: d.ref_partsPerInsert && d.seriesSize && d.ref_partsPerInsert > 0
        ? Math.ceil(d.seriesSize / d.ref_partsPerInsert) : null,
      toolChangesPerSeries_spk: d.spk_partsPerInsert && d.seriesSize && d.spk_partsPerInsert > 0
        ? Math.ceil(d.seriesSize / d.spk_partsPerInsert) : null,
    }
  },
}))
