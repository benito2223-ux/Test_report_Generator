import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/db'
import type { Report, TestEntry, ReportPhoto, ROIMetrics, ROIData } from '@/types'

function createEmptyReport(): Report {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    opportunityRef: '',
    title: 'MACHINING TEST',
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    language: (localStorage.getItem('spk-lang') || 'EN').toLowerCase() as any,
    contacts: {
      salesName: 'Marco Di Giorgio',
      appEngineerName: '',
      company: 'SPK by CeramTec',
      customerCompany: '',
      customerContact: '',
      customerRole: '',
    },
    workpiece: {
      typology: '',
      material: '',
      hardness: 'HRC',
      hardnessValue: null,
      castingManufacturer: '',
      notes: '',
    },
    machine: {
      manufacturer: '',
      model: '',
      operationType: 'turning',
      pumpPressure_bar: null,
      maxRPM: null,
      maxPower_kW: null,
      coolantType: 'HPC',
      operation: 'OP10',
    },
    testScope: { objective: '', backgroundContext: '' },
    currentProcess: {
      insertRef: '',
      insertSupplier: '',
      toolholderRef: '',
      toolholderSupplier: '',
      cuttingEdgesPerInsert: null,
      passes: [],
      totalCycleTime_min: null,
      partsPerInsert: null,
      setupPhotos: [],
    },
    spkProposal: {
      insertRef: '',
      insertPartNumber: '',
      insertGrade: '',
      toolholderRef: '',
      toolholderPartNumber: '',
      cuttingEdgesPerInsert: null,
      notes: '',
      setupPhotos: [],
    },
    testLog: [],
    roiData: {
      ref_cycleTime_min: null,
      ref_insertRef: '',
      ref_insertSupplier: '',
      ref_cuttingEdges: null,
      ref_partsPerInsert: null,
      ref_insertPrice_eur: null,
      ref_mrr: null,
      ref_toolLife_min: null,
      spk_cycleTime_min: null,
      spk_cuttingEdges: null,
      spk_partsPerInsert: null,
      spk_insertPrice_eur: null,
      spk_mrr: null,
      spk_toolLife_min: null,
      machineCostPerHour_eur: null,
      shiftDuration_min: 480,
      seriesSize: null,
    },
    conclusion: {
      summary: '',
      keyLearnings: [],
      operatingRules: [],
      nextSteps: [],
    },
    pdfExport: { lastExportedAt: null, templateVersion: '1.0' },
  }
}

interface ReportStore {
  activeReport: Report | null
  isSaving: boolean
  
  // Lifecycle
  newReport: () => void
  loadReport: (id: string) => Promise<void>
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

  loadReport: async (id) => {
    const report = await db.reports.get(id)
    if (report) set({ activeReport: report })
  },

  saveReport: async () => {
    const { activeReport } = get()
    if (!activeReport) return
    set({ isSaving: true })
    const updated = { ...activeReport, updatedAt: new Date().toISOString() }
    await db.reports.put(updated)
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

  updateTest: (id, data) => {
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
