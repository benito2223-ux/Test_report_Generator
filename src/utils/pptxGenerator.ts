import type { Report, TestEntry, ROIMetrics } from '../types'
import pptxgen from 'pptxgenjs'

// SPK colors — NO # prefix for pptxgenjs
const BLUE = '1B6EB5'
const RED = 'C5001A'
const WHITE = 'FFFFFF'
const DARK = '1A1A2E'
const GRAY = '5A6478'
const LIGHT_BG = 'E8F1FB'
const BLUE_BG = '1B6EB5'

// Slide dimensions (LAYOUT_16x9): 10" × 5.625"
const W = 10
const H = 5.625
const M = 0.35  // margin inches

function ord(n: number) {
  if (n === 1) return 'st'; if (n === 2) return 'nd'; if (n === 3) return 'rd'; return 'th'
}

function computeROI(r: Report): ROIMetrics {
  const d = r.roiData
  const pct = (a: number | null, b: number | null) => a != null && b != null && b !== 0 ? Math.round(((a - b) / b) * 100) : null
  const costMin = d.machineCostPerHour_eur ? d.machineCostPerHour_eur / 60 : null
  const costRef = costMin && d.ref_cycleTime_min && d.ref_insertPrice_eur && d.ref_partsPerInsert
    ? Math.round((d.ref_insertPrice_eur / d.ref_partsPerInsert + costMin * d.ref_cycleTime_min) * 100) / 100 : null
  const costSpk = costMin && d.spk_cycleTime_min && d.spk_insertPrice_eur && d.spk_partsPerInsert
    ? Math.round((d.spk_insertPrice_eur / d.spk_partsPerInsert + costMin * d.spk_cycleTime_min) * 100) / 100 : null
  return {
    cycleTimeGain_pct: d.ref_cycleTime_min && d.spk_cycleTime_min && d.ref_cycleTime_min > 0
      ? Math.round(((d.spk_cycleTime_min - d.ref_cycleTime_min) / d.ref_cycleTime_min) * 100) : null,
    cuttingEdgesGain_pct: pct(d.spk_cuttingEdges, d.ref_cuttingEdges),
    partsPerInsertGain_pct: pct(d.spk_partsPerInsert, d.ref_partsPerInsert),
    mrrRatio: d.ref_mrr && d.spk_mrr && d.ref_mrr > 0 ? Math.round((d.spk_mrr / d.ref_mrr) * 10) / 10 : null,
    volumePerEdge_ref: null, volumePerEdge_spk: null,
    piecesPerShift_ref: d.ref_cycleTime_min ? Math.floor(d.shiftDuration_min / d.ref_cycleTime_min) : null,
    piecesPerShift_spk: d.spk_cycleTime_min ? Math.floor(d.shiftDuration_min / d.spk_cycleTime_min) : null,
    piecesPerShiftGain: null, costPerPart_ref: costRef, costPerPart_spk: costSpk,
    costPerPartGain_pct: null, roiOnSeries_eur: costRef && costSpk && d.seriesSize ? Math.round((costRef - costSpk) * d.seriesSize) : null,
    toolChangesPerSeries_ref: null, toolChangesPerSeries_spk: null,
  }
}

// Compute contained dimensions preserving aspect ratio
async function toJpeg(src: string): Promise<{data: string; w: number; h: number} | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width || 800
      canvas.height = img.naturalHeight || img.height || 600
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return } // iOS canvas context limit guard
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      resolve({ data: canvas.toDataURL('image/jpeg', 0.92), w: canvas.width, h: canvas.height })
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function containPhoto(src: string, bx: number, by: number, bw: number, bh: number) {
  if (!src) return null
  try {
    const result = await toJpeg(src)
    if (!result) return null
    const ratio = result.w / result.h
    let w = bw, h = bw / ratio
    if (h > bh) { h = bh; w = bh * ratio }
    if (w > bw) { w = bw; h = bw / ratio }
    return { x: bx + (bw - w) / 2, y: by + (bh - h) / 2, w, h, data: result.data }
  } catch { return null }
}

// ── slide builders ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Slide = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pres = any

function addSpkFooter(slide: Slide) {
  // SPK logo bottom right, subtle
  slide.addText([
    { text: 'SPK', options: { bold: true, color: RED } },
    { text: ' by CeramTec', options: { color: GRAY } },
  ], { x: W - 1.5, y: H - 0.28, w: 1.4, h: 0.22, fontSize: 8, align: 'right', margin: 0 })
}

function addPageNum(slide: Slide, n: number, total: number) {
  slide.addText(`${n}`, { x: M, y: H - 0.28, w: 0.3, h: 0.2, fontSize: 8, color: GRAY, margin: 0 })
  addSpkFooter(slide)
}

function slideCover(pres: Pres, r: Report) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }

  // Top red bar
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.08, fill: { color: RED }, line: { color: RED } })

  // Big italic title
  const title = r.opportunityRef ? `${r.opportunityRef} – MACHINING TEST` : 'MACHINING TEST'
  slide.addText(title, {
    x: M, y: H * 0.3, w: W - M * 2, h: 1.6,
    fontSize: 36, bold: true, italic: true, color: BLUE,
    align: 'left', fontFace: 'Calibri',
  })

  // Created / date
  const dateStr = new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  slide.addText(`Created : ${r.contacts.salesName || ''}`, { x: M, y: H - 1.0, w: 5, h: 0.3, fontSize: 13, bold: true, color: DARK, fontFace: 'Calibri' })
  slide.addText(`Date: ${dateStr}`, { x: M, y: H - 0.65, w: 5, h: 0.3, fontSize: 13, bold: true, color: DARK, fontFace: 'Calibri' })

  addSpkFooter(slide)
}

async function slideContacts(pres: Pres, r: Report, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }

  // Red top accent
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.25, h: 0.06, fill: { color: RED }, line: { color: RED } })

  // Left: workpiece photo
  if (r.workpiece.drawingPhoto) {
    const src = r.workpiece.drawingPhoto.annotatedBase64 || r.workpiece.drawingPhoto.originalBase64
    if (src) {
      const cp = await containPhoto(src, M, 0.3, W * 0.42 - M, H - 0.6)
      if (cp) slide.addImage({ data: cp.data, x: cp.x, y: cp.y, w: cp.w, h: cp.h })
    }
  } else {
    slide.addShape(pres.shapes.RECTANGLE, { x: M, y: 0.3, w: W * 0.42 - M, h: H - 0.6, fill: { color: LIGHT_BG }, line: { color: LIGHT_BG } })
  }

  // Right: contacts
  const rx = W * 0.48
  const cw = W - rx - M
  let y = 0.4

  const addSection = (title: string) => {
    slide.addText(title, { x: rx, y, w: cw, h: 0.25, fontSize: 10, bold: true, color: BLUE, fontFace: 'Calibri', margin: 0 })
    y += 0.3
  }
  const addLine = (text: string) => {
    slide.addText(text, { x: rx, y, w: cw, h: 0.22, fontSize: 10, color: DARK, fontFace: 'Calibri', margin: 0 })
    y += 0.23
  }

  addSection('SPK CONTACTS')
  addLine(`Sales: ${r.contacts.salesName || '—'}`)
  addLine(`Application Engineer: ${r.contacts.appEngineerName || '—'}`)
  y += 0.12

  addSection(`${(r.contacts.customerCompany || 'CUSTOMER').toUpperCase()} CONTACTS`)
  addLine(`${r.contacts.customerRole || 'Contact'}: ${r.contacts.customerContact || '—'}`)
  if (r.contacts.customerContact2) addLine(`${r.contacts.customerRole2 || ''}: ${r.contacts.customerContact2}`)
  y += 0.12

  addSection('WORKPIECE INFORMATIONS')
  if (r.workpiece.typology) addLine(`Typology: ${r.workpiece.typology}`)
  if (r.workpiece.material) addLine(`Material: ${r.workpiece.material}`)
  if (r.workpiece.hardnessValue) addLine(`Hardness: ${r.workpiece.hardnessValue} ${r.workpiece.hardness}`)
  if (r.workpiece.castingManufacturer) addLine(`Casting Manufacturer: ${r.workpiece.castingManufacturer}`)
  y += 0.12

  addSection('OPERATION INFORMATIONS')
  if (r.machine.manufacturer) addLine(`Machine Manufacturer: ${r.machine.manufacturer}`)
  if (r.machine.model) addLine(`Model: ${r.machine.model}`)
  if (r.machine.pumpPressure_bar) addLine(`Pump pressure: ${r.machine.pumpPressure_bar} bar`)
  if (r.machine.operation) addLine(`Operation: ${r.machine.operation}`)

  addPageNum(slide, n, total)
}

function slideScope(pres: Pres, r: Report, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.25, h: 0.06, fill: { color: RED }, line: { color: RED } })

  slide.addText('SCOPE OF THE TEST', { x: M, y: 0.35, w: W - M * 2, h: 0.55, fontSize: 26, bold: true, italic: true, color: BLUE, align: 'center', fontFace: 'Calibri' })

  const texts = [r.testScope.objective, r.testScope.backgroundContext].filter(Boolean).join('\n\n')
  slide.addText(texts || '—', { x: M * 2, y: 1.1, w: W - M * 4, h: H - 1.8, fontSize: 13, color: DARK, align: 'center', fontFace: 'Calibri', valign: 'top' })

  addPageNum(slide, n, total)
}

async function slideActualCycle(pres: Pres, r: Report, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.25, h: 0.06, fill: { color: RED }, line: { color: RED } })

  slide.addText('ACTUAL CYCLE', { x: M, y: 0.3, w: W - M * 2, h: 0.55, fontSize: 26, bold: true, italic: true, color: BLUE, align: 'center', fontFace: 'Calibri' })

  const p = r.currentProcess
  const lines: string[] = [
    p.totalCycleTime_min ? `Cycle time: ≃ ${p.totalCycleTime_min} min` : '',
    p.insertRef ? `Insert: ${p.insertRef}${p.insertSupplier ? ` (${p.insertSupplier})` : ''}` : '',
    p.toolholderRef ? `Tool holder: ${p.toolholderRef}` : '',
    ...r.currentProcess.passes.flatMap(pass => [
      pass.vc_m_min ? `Cutting speed: ${pass.vc_m_min} m/min` : '',
      pass.f_mm_rev ? `Cutting feed: ${pass.f_mm_rev} mm/r` : '',
      pass.ap_mm ? `Depth of cut: ${pass.ap_mm} mm` : '',
    ]),
    p.partsPerInsert ? `Parts / Insert: ${p.partsPerInsert}` : '',
  ].filter(Boolean)

  const textItems = lines.map((l, i) => ({ text: l, options: { breakLine: i < lines.length - 1 } }))
  slide.addText(textItems, { x: M * 2, y: 1.0, w: W * 0.45, h: H - 1.5, fontSize: 12, color: DARK, align: 'center', fontFace: 'Calibri', valign: 'top' })

  // Setup photos
  const photos = r.currentProcess.setupPhotos.slice(0, 3)
  if (photos.length > 0) {
    const gap = 0.1
    const ph = 2.2
    const pw = (W * 0.52 - M - gap * (photos.length - 1)) / photos.length
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const src = photo.annotatedBase64 || photo.originalBase64
      if (src) {
        const cp = await containPhoto(src, W * 0.48 + i * (pw + gap), H - ph - 0.3, pw, ph)
        if (cp) slide.addImage({ data: cp.data, x: cp.x, y: cp.y, w: cp.w, h: cp.h })
      }
    }
  }

  addPageNum(slide, n, total)
}

async function slideProposal(pres: Pres, r: Report, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.25, h: 0.06, fill: { color: RED }, line: { color: RED } })

  slide.addText('SPK PROPOSAL', { x: M, y: 0.3, w: W - M * 2, h: 0.55, fontSize: 26, bold: true, italic: true, color: BLUE, align: 'center', fontFace: 'Calibri' })

  const sp = r.spkProposal
  const lines: string[] = [
    sp.insertRef ? `Insert: ${sp.insertRef}${sp.insertPartNumber ? ` (${sp.insertPartNumber})` : ''}` : '',
    sp.toolholderRef ? `Tool holder: ${sp.toolholderRef}${sp.toolholderPartNumber ? ` (${sp.toolholderPartNumber})` : ''}` : '',
    sp.insertGrade ? `Grade: ${sp.insertGrade}` : '',
  ].filter(Boolean)

  const textItems = lines.map((l, i) => ({ text: l, options: { breakLine: i < lines.length - 1 } }))
  if (textItems.length > 0) {
    slide.addText(textItems, { x: M, y: 1.0, w: W - M * 2, h: 0.8, fontSize: 13, color: DARK, align: 'center', fontFace: 'Calibri' })
  }

  // Photos — 3 columns
  const photos = sp.setupPhotos.slice(0, 3)
  if (photos.length > 0) {
    const gap = 0.15
    const ph = H - 2.0
    const pw = (W - M * 2 - gap * (photos.length - 1)) / photos.length
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      const src = photo.annotatedBase64 || photo.originalBase64
      if (src) {
        const cp = await containPhoto(src, M + i * (pw + gap), 1.9, pw, ph)
        if (cp) slide.addImage({ data: cp.data, x: cp.x, y: cp.y, w: cp.w, h: cp.h })
      }
    }
  }

  addPageNum(slide, n, total)
}

function slideTransition(pres: Pres, text: string, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.25, h: 0.06, fill: { color: RED }, line: { color: RED } })
  slide.addText(text, { x: M * 2, y: H * 0.3, w: W - M * 4, h: H * 0.4, fontSize: 13, color: DARK, align: 'center', fontFace: 'Calibri', valign: 'middle' })
  addPageNum(slide, n, total)
}

async function slideTest(pres: Pres, test: TestEntry, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.25, h: 0.06, fill: { color: RED }, line: { color: RED } })

  const lx = M
  const rx = W * 0.5 + 0.1
  const cw = W * 0.5 - M - 0.1
  const lcw = W * 0.5 - M - 0.1

  // Titles
  slide.addText(`${test.testNumber}${ord(test.testNumber)} TEST`, { x: lx, y: 0.12, w: lcw, h: 0.45, fontSize: 20, bold: true, italic: true, color: BLUE, fontFace: 'Calibri', margin: 0 })
  slide.addText(`${test.workpieceNumber}${ord(test.workpieceNumber)} WORKPIECE`, { x: rx, y: 0.12, w: cw, h: 0.45, fontSize: 20, bold: true, italic: true, color: BLUE, fontFace: 'Calibri', margin: 0 })

  // Divider
  slide.addShape(pres.shapes.LINE, { x: lx, y: 0.62, w: W - M * 2, h: 0, line: { color: 'E2E6EA', width: 0.5 } })

  // Parameters
  const params: string[] = [
    test.passRef ? `Cutting: ${test.passRef}${test.passType ? ` (${test.passType})` : ''}` : '',
    test.parameters.vc_m_min ? `Cutting speed: ${test.parameters.vc_m_min} m/min` : '',
    test.parameters.f_mm_rev ? `Cutting feed: ${test.parameters.f_mm_rev} mm/r` : '',
    test.parameters.ap_mm ? `Depth of cut: ${test.parameters.ap_mm} mm` : '',
    test.results.insertLife_min ? `Insert life: ${test.results.insertLife_min} min` : '',
    test.results.insertLife_cuts ? `Cuts: ${test.results.insertLife_cuts}` : '',
    test.results.mrr ? `MRR: ${test.results.mrr} cm³/min` : '',
  ].filter(Boolean)

  const paramItems = params.map((p, i) => ({ text: p, options: { breakLine: i < params.length - 1 } }))
  if (paramItems.length > 0) {
    slide.addText(paramItems, { x: lx, y: 0.72, w: lcw, h: 2.4, fontSize: 11, color: DARK, align: 'left', fontFace: 'Calibri', valign: 'top' })
  }

  // Outcome badge
  const outcomeColors: Record<string, string> = { success: '1B8A4C', breakage: 'DC2626', wear: 'B45309', aborted: '6B7280', in_progress: BLUE }
  const outcomeLabels: Record<string, string> = { success: '✓ Success', breakage: '✗ Breakage', wear: '~ Wear', aborted: '— Aborted', in_progress: 'In Progress' }
  if (test.results.outcome) {
    const col = outcomeColors[test.results.outcome] || GRAY
    slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: lx, y: 3.2, w: 1.8, h: 0.3, fill: { color: col, transparency: 85 }, line: { color: col, width: 0.5 }, rectRadius: 0.05 })
    slide.addText(outcomeLabels[test.results.outcome] || test.results.outcome, { x: lx, y: 3.2, w: 1.8, h: 0.3, fontSize: 10, bold: true, color: col, align: 'center', fontFace: 'Calibri', margin: 0 })
  }

  // Observations
  if (test.observations) {
    slide.addText(test.observations, { x: lx, y: 3.6, w: lcw, h: H - 3.9, fontSize: 10, color: DARK, fontFace: 'Calibri', valign: 'top', wrap: true })
  }

  // Photos right column — up to 4 in a 2x2 grid
  const rightPhotos = test.photos.slice(0, 4)
  if (rightPhotos.length > 0) {
    const startY = 0.72
    const availH = H - 0.75
    const gap = 0.1

    if (rightPhotos.length === 1) {
      const photo = rightPhotos[0]
      const src = photo.annotatedBase64 || photo.originalBase64
      if (src) {
        const cp = await containPhoto(src, rx, startY, cw, availH)
        if (cp) slide.addImage({ data: cp.data, x: cp.x, y: cp.y, w: cp.w, h: cp.h })
        if (photo.caption) {
          slide.addText(photo.caption, { x: rx, y: startY + availH + 0.02, w: cw, h: 0.18, fontSize: 8, color: GRAY, align: 'center', italic: true, fontFace: 'Calibri', margin: 0 })
        }
      }
    } else if (rightPhotos.length === 2) {
      const ph = (availH - gap) / 2
      for (let i = 0; i < 2; i++) {
        const photo = rightPhotos[i]
        const src = photo.annotatedBase64 || photo.originalBase64
        if (src) {
          const by = startY + i * (ph + gap)
          const cp = await containPhoto(src, rx, by, cw, ph)
          if (cp) slide.addImage({ data: cp.data, x: cp.x, y: cp.y, w: cp.w, h: cp.h })
          if (photo.caption) {
            slide.addText(photo.caption, { x: rx, y: by + ph + 0.02, w: cw, h: 0.18, fontSize: 8, color: GRAY, align: 'center', italic: true, fontFace: 'Calibri', margin: 0 })
          }
        }
      }
    } else {
      // 3-4 photos: 2x2 grid
      const pw = (cw - gap) / 2
      const ph = (availH - gap) / 2
      for (let i = 0; i < rightPhotos.length; i++) {
        const col = i % 2
        const row = Math.floor(i / 2)
        const bx = rx + col * (pw + gap)
        const by = startY + row * (ph + gap)
        const photo = rightPhotos[i]
        const src = photo.annotatedBase64 || photo.originalBase64
        if (src) {
          const cp = await containPhoto(src, bx, by, pw, ph)
          if (cp) slide.addImage({ data: cp.data, x: cp.x, y: cp.y, w: cp.w, h: cp.h })
        }
      }
    }
  }

  addPageNum(slide, n, total)
}

function slideComparison(pres: Pres, r: Report, metrics: ROIMetrics, showFinancial: boolean, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: WHITE }
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.25, h: 0.06, fill: { color: RED }, line: { color: RED } })

  slide.addText('PROCESS COMPARISON', { x: M, y: 0.12, w: W - M * 2, h: 0.55, fontSize: 26, bold: true, italic: true, color: BLUE, align: 'center', fontFace: 'Calibri' })

  const d = r.roiData
  const col1x = M + 0.1
  const col2x = W * 0.38
  const col3x = W * 0.62
  const col4x = W - M - 0.6

  // SPK highlight box
  slide.addShape(pres.shapes.RECTANGLE, { x: col3x - 0.15, y: 0.75, w: W * 0.22, h: H - 1.1, fill: { color: LIGHT_BG }, line: { color: LIGHT_BG } })

  // Headers
  slide.addText('REFERENCE', { x: col2x, y: 0.78, w: 2, h: 0.25, fontSize: 11, bold: true, italic: true, color: BLUE, align: 'center', fontFace: 'Calibri', margin: 0 })
  slide.addText('SPK PROPOSAL', { x: col3x - 0.1, y: 0.78, w: 2.1, h: 0.25, fontSize: 11, bold: true, italic: true, color: BLUE, align: 'center', fontFace: 'Calibri', margin: 0 })

  const rows: [string, string, string, string][] = [
    ['INSERTS:', 'Carbide', 'Ceramic', ''],
    ['SUPPLIER:', r.currentProcess.insertSupplier || '—', 'SPK by CeramTec', ''],
    ['CUTTING EDGES:', d.ref_cuttingEdges?.toString() || '—', d.spk_cuttingEdges?.toString() || '—', metrics.cuttingEdgesGain_pct !== null ? `+${metrics.cuttingEdgesGain_pct}%` : ''],
    ['TOTAL TIME:', d.ref_cycleTime_min ? `${d.ref_cycleTime_min} min` : '—', d.spk_cycleTime_min ? `${d.spk_cycleTime_min} min` : '—', metrics.cycleTimeGain_pct !== null ? `${metrics.cycleTimeGain_pct}%` : ''],
    ['(*) INSERT LIFE:', '1', '1', '='],
    ['(#) PART/INSERT:', d.ref_partsPerInsert?.toString() || '—', d.spk_partsPerInsert?.toString() || '—', metrics.partsPerInsertGain_pct !== null ? `+${metrics.partsPerInsertGain_pct}%` : ''],
  ]

  rows.forEach(([label, ref, spk, delta], i) => {
    const y = 1.15 + i * 0.52
    slide.addText(label, { x: col1x, y, w: 1.8, h: 0.35, fontSize: 11, bold: true, color: BLUE, fontFace: 'Calibri', margin: 0 })
    slide.addText(ref, { x: col2x, y, w: 2, h: 0.35, fontSize: 12, color: DARK, align: 'center', fontFace: 'Calibri', margin: 0 })
    slide.addText(spk, { x: col3x - 0.1, y, w: 2.1, h: 0.35, fontSize: 12, color: DARK, align: 'center', fontFace: 'Calibri', margin: 0 })
    if (delta) {
      const positive = delta.startsWith('+')
      const neutral = delta === '='
      const col = neutral ? GRAY : positive ? '1B8A4C' : 'DC2626'
      slide.addText(delta, { x: col4x, y, w: 0.8, h: 0.35, fontSize: 18, bold: true, color: col, align: 'right', fontFace: 'Calibri', margin: 0 })
    }
    // Row divider
    if (i < rows.length - 1) {
      slide.addShape(pres.shapes.LINE, { x: col1x, y: y + 0.42, w: W - M * 2 - 0.2, h: 0, line: { color: 'E8ECF0', width: 0.3 } })
    }
  })

  // Footnote
  slide.addText('(*) 1 face + 1 diameter', { x: M, y: H - 0.45, w: W - M * 2, h: 0.2, fontSize: 8, italic: true, color: GRAY, align: 'center', fontFace: 'Calibri', margin: 0 })

  addPageNum(slide, n, total)
}

function slideSummary(pres: Pres, r: Report, n: number, total: number) {
  const slide = pres.addSlide()
  // Blue left half, white right — exact template
  slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W * 0.47, h: H, fill: { color: BLUE_BG }, line: { color: BLUE_BG } })
  slide.background = { color: WHITE }

  // Left: title + summary
  slide.addText('SUMMARY', { x: M, y: 0.2, w: W * 0.44, h: 0.55, fontSize: 24, bold: true, italic: true, color: WHITE, fontFace: 'Calibri', align: 'center' })

  const summaryText = r.conclusion.summary || ''
  if (summaryText) {
    slide.addText(summaryText, { x: M, y: 0.9, w: W * 0.43, h: 2.0, fontSize: 11, color: WHITE, fontFace: 'Calibri', valign: 'top', wrap: true })
  }

  // Key learnings as bullets
  if (r.conclusion.keyLearnings.length > 0) {
    const bulletItems = r.conclusion.keyLearnings.map((item, i) => ({
      text: item, options: { bullet: true, color: WHITE, breakLine: i < r.conclusion.keyLearnings.length - 1 }
    }))
    slide.addText(bulletItems, { x: M, y: 2.95, w: W * 0.43, h: H - 3.2, fontSize: 10, color: WHITE, fontFace: 'Calibri', valign: 'top' })
  }

  // Right: operating rules
  const rx = W * 0.5
  const rw = W - rx - M
  slide.addText('Operating Rules', { x: rx, y: 0.25, w: rw, h: 0.35, fontSize: 13, bold: true, color: BLUE, fontFace: 'Calibri' })

  if (r.conclusion.operatingRules.length > 0) {
    const bulletItems = r.conclusion.operatingRules.map((item, i) => ({
      text: item, options: { bullet: true, color: DARK, breakLine: i < r.conclusion.operatingRules.length - 1 }
    }))
    slide.addText(bulletItems, { x: rx, y: 0.7, w: rw, h: H * 0.4, fontSize: 10, color: DARK, fontFace: 'Calibri', valign: 'top' })
  }

  addPageNum(slide, n, total)
}

function slideNextSteps(pres: Pres, r: Report, n: number, total: number) {
  const slide = pres.addSlide()
  slide.background = { color: BLUE_BG }

  slide.addText('NEXT STEPS', { x: M, y: 0.4, w: W - M * 2, h: 0.7, fontSize: 30, bold: true, italic: true, color: WHITE, align: 'center', fontFace: 'Calibri' })

  const startY = 1.4
  const gap = 0.75
  r.conclusion.nextSteps.forEach((step, i) => {
    slide.addText(`${i + 1}- ${step.toUpperCase()}`, {
      x: M * 3, y: startY + i * gap, w: W - M * 6, h: 0.6,
      fontSize: 12, color: WHITE, align: 'center', fontFace: 'Calibri', wrap: true
    })
  })

  // SPK logo in white
  slide.addText([
    { text: 'SPK', options: { bold: true, color: WHITE } },
    { text: ' by CeramTec', options: { color: WHITE } },
  ], { x: W - 1.6, y: H - 0.3, w: 1.5, h: 0.22, fontSize: 9, align: 'right', margin: 0 })
}

// ── MAIN EXPORT ────────────────────────────────────────────────────────────

export async function generatePPTX(r: Report, showFinancial = true, _lang = 'EN'): Promise<void> {
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_16x9'
  pres.author = r.contacts.salesName || 'SPK by CeramTec'
  pres.title = r.opportunityRef ? `${r.opportunityRef} – Machining Test` : 'Machining Test'

  // Count total pages
  let total = 5
  r.testLog.forEach((t, i) => { if (i > 0 && t.workpieceNumber !== r.testLog[i - 1].workpieceNumber) total++ })
  total += r.testLog.length + 2 // comparison + summary
  if (r.conclusion.nextSteps.length > 0) total++

  let n = 1
  slideCover(pres, r); n++
  await slideContacts(pres, r, n, total); n++
  slideScope(pres, r, n, total); n++
  await slideActualCycle(pres, r, n, total); n++
  await slideProposal(pres, r, n, total); n++

  let lastWp = -1
  for (let i = 0; i < r.testLog.length; i++) {
    const test = r.testLog[i]
    if (test.workpieceNumber !== lastWp && i > 0) {
      slideTransition(pres, `Due to the results obtained on the ${lastWp}${ord(lastWp)} workpiece, we proceeded to machine a ${test.workpieceNumber}${ord(test.workpieceNumber)} workpiece.`, n, total); n++
    }
    lastWp = test.workpieceNumber
    await slideTest(pres, test, n, total); n++
  }

  const metrics = computeROI(r)
  slideComparison(pres, r, metrics, showFinancial, n, total); n++
  slideSummary(pres, r, n, total); n++
  if (r.conclusion.nextSteps.length > 0) { slideNextSteps(pres, r, n, total); n++ }

  const filename = `${(r.opportunityRef || 'SPK').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(r.contacts.customerCompany || 'Report').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date(r.createdAt).toISOString().slice(0, 10)}.pptx`
  // Use explicit blob URL download — pptxgen writeFile uses file-saver which fails on iOS Safari
  const data = await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer
  const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
