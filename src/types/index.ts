export type ReportStatus = 'draft' | 'completed' | 'exported'
export type OperationType = 'turning' | 'milling'
export type PassType = 'face' | 'diameter' | 'profile' | 'groove' | 'contour'
export type TestOutcome = 'success' | 'breakage' | 'wear' | 'aborted' | 'in_progress'
export type AnnotationTool = 'arrow' | 'curved_arrow' | 'rectangle' | 'circle' | 'freehand' | 'text' | 'crop'
export type AnnotationColor = '#E53935' | '#FDD835' | '#43A047' | '#FFFFFF' | '#000000' | '#1E88E5'

export interface Point { x: number; y: number }

export interface Annotation {
  id: string
  tool: AnnotationTool
  color: AnnotationColor
  strokeWidth: number
  points?: Point[]        // freehand
  start?: Point           // arrow, rect, circle
  end?: Point
  text?: string           // text annotation
  fontSize?: number
}

export interface ReportPhoto {
  id: string
  originalBase64: string
  annotatedBase64?: string
  caption: string
  takenAt: string
  ref?: string            // "Photo 1", "Photo 2" etc.
  annotations: Annotation[]
}

export interface ProcessPass {
  passId: string          // "1.1", "1.2"
  passType: PassType
  vc_m_min: number | null
  f_mm_rev: number | null
  ap_mm: number | null
  cycleTime_min: number | null
  toolLife_cuts: number | null
  toolLife_min: number | null
}

export interface TestEntry {
  id: string
  testNumber: number
  workpieceNumber: number
  passRef: string
  passType: PassType
  parameters: {
    vc_m_min: number | null
    f_mm_rev: number | null
    ap_mm: number | null
  }
  results: {
    insertLife_min: number | null
    insertLife_cuts: number | null
    outcome: TestOutcome
    mrr?: number          // auto-calculated: Vc × f × ap
  }
  observations: string
  photos: ReportPhoto[]
  createdAt: string
}

export interface ROIData {
  // Reference (current process)
  ref_cycleTime_min: number | null
  ref_insertRef: string
  ref_insertSupplier: string
  ref_cuttingEdges: number | null
  ref_partsPerInsert: number | null
  ref_insertPrice_eur: number | null
  ref_mrr: number | null
  ref_toolLife_min: number | null
  // SPK Proposal
  spk_cycleTime_min: number | null
  spk_cuttingEdges: number | null
  spk_partsPerInsert: number | null
  spk_insertPrice_eur: number | null
  spk_mrr: number | null
  spk_toolLife_min: number | null
  // Context
  machineCostPerHour_eur: number | null
  shiftDuration_min: number
  seriesSize: number | null
}

export interface Report {
  id: string
  opportunityRef: string
  title: string
  status: ReportStatus
  createdAt: string
  updatedAt: string
  language: 'fr' | 'en' | 'de' | 'it'

  contacts: {
    salesName: string
    appEngineerName: string
    company: string
    customerCompany: string
    customerContact: string
    customerRole: string
    customerContact2?: string
    customerRole2?: string
  }

  workpiece: {
    typology: string
    material: string
    hardness: string
    hardnessValue: number | null
    castingManufacturer: string
    notes: string
    drawingPhoto?: ReportPhoto   // annotatable part drawing
  }

  machine: {
    manufacturer: string
    model: string
    operationType: OperationType
    pumpPressure_bar: number | null
    maxRPM: number | null
    maxPower_kW: number | null
    coolantType: string
    operation: string
  }

  testScope: {
    objective: string
    backgroundContext: string
  }

  currentProcess: {
    insertRef: string
    insertSupplier: string
    toolholderRef: string
    toolholderSupplier: string
    cuttingEdgesPerInsert: number | null
    passes: ProcessPass[]
    totalCycleTime_min: number | null
    partsPerInsert: number | null
    setupPhotos: ReportPhoto[]
  }

  spkProposal: {
    insertRef: string
    insertPartNumber: string
    insertGrade: string
    toolholderRef: string
    toolholderPartNumber: string
    cuttingEdgesPerInsert: number | null
    notes: string
    setupPhotos: ReportPhoto[]
  }

  testLog: TestEntry[]

  roiData: ROIData

  conclusion: {
    summary: string
    keyLearnings: string[]
    operatingRules: string[]
    nextSteps: string[]
  }

  pdfExport: {
    lastExportedAt: string | null
    templateVersion: string
  }
}

export interface ROIMetrics {
  cycleTimeGain_pct: number | null
  cuttingEdgesGain_pct: number | null
  partsPerInsertGain_pct: number | null
  mrrRatio: number | null
  volumePerEdge_ref: number | null
  volumePerEdge_spk: number | null
  piecesPerShift_ref: number | null
  piecesPerShift_spk: number | null
  piecesPerShiftGain: number | null
  costPerPart_ref: number | null
  costPerPart_spk: number | null
  costPerPartGain_pct: number | null
  roiOnSeries_eur: number | null
  toolChangesPerSeries_ref: number | null
  toolChangesPerSeries_spk: number | null
}
