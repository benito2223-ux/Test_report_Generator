import type { Report, TestEntry, ROIMetrics } from '../types'
import { jsPDF } from 'jspdf'
import { t, type Lang } from '../i18n'

const BLUE = '#1B6EB5'
const RED  = '#C5001A'
const WHITE = '#FFFFFF'
const DARK  = '#1A1A2E'
const GRAY  = '#5A6478'
const BG    = '#F0F5FB'

const W = 297
const H = 210
const M = 14

function ord(n: number) {
  if (n===1) return 'st'; if (n===2) return 'nd'; if (n===3) return 'rd'; return 'th'
}

// Safe arrow — avoid encoding issues with special chars in jsPDF
const ARROW = ' -> '

type Doc = InstanceType<typeof jsPDF>

function spkFooter(doc: Doc, n: number) {
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(GRAY)
  doc.text(String(n), M, H - 5)
  doc.setFontSize(10); doc.setFont('helvetica','bold'); doc.setTextColor(RED)
  doc.text('SPK', W - M - 20, H - 5)
  doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(GRAY)
  doc.text('by CeramTec', W - M - 4, H - 5, { align: 'right' })
}

// Thin blue left accent — replaces red bar on content slides
function blueAccent(doc: Doc) {
  doc.setFillColor(BLUE)
  doc.rect(0, 0, 2, H, 'F')
}

function slideTitle(doc: Doc, text: string) {
  doc.setFontSize(32); doc.setFont('helvetica','bolditalic'); doc.setTextColor(BLUE)
  doc.text(text, W / 2, 22, { align: 'center' })
}

function sectionLabel(doc: Doc, text: string, x: number, y: number) {
  doc.setFontSize(9); doc.setFont('helvetica','bold'); doc.setTextColor(BLUE)
  doc.text(text.toUpperCase(), x, y)
}

function bodyLine(doc: Doc, text: string, x: number, y: number, maxW = 120) {
  doc.setFontSize(14); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
  const lines = doc.splitTextToSize(text, maxW)
  lines.forEach((l: string, i: number) => doc.text(l, x, y + i * 7))
  return y + lines.length * 7
}

async function toJpegDataUrl(src: string): Promise<{data: string; w: number; h: number} | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalWidth  || img.width  || 800
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

async function addPhoto(doc: Doc, src: string, bx: number, by: number, bw: number, bh: number) {
  if (!src) return
  try {
    const result = await toJpegDataUrl(src)
    if (!result) return
    const ratio = result.w / result.h
    let w = bw, h = bw / ratio
    if (h > bh) { h = bh; w = bh * ratio }
    if (w > bw) { w = bw; h = bw / ratio }
    doc.addImage(result.data, 'JPEG', bx + (bw - w) / 2, by + (bh - h) / 2, w, h)
  } catch { /* skip */ }
}

function computeROI(r: Report): ROIMetrics {
  const d = r.roiData
  const pct = (a: number|null, b: number|null) => a!=null&&b!=null&&b!==0 ? Math.round(((a-b)/b)*100) : null
  const costMin = d.machineCostPerHour_eur ? d.machineCostPerHour_eur/60 : null
  const costRef = costMin&&d.ref_cycleTime_min&&d.ref_insertPrice_eur&&d.ref_partsPerInsert
    ? Math.round((d.ref_insertPrice_eur/d.ref_partsPerInsert + costMin*d.ref_cycleTime_min)*100)/100 : null
  const costSpk = costMin&&d.spk_cycleTime_min&&d.spk_insertPrice_eur&&d.spk_partsPerInsert
    ? Math.round((d.spk_insertPrice_eur/d.spk_partsPerInsert + costMin*d.spk_cycleTime_min)*100)/100 : null
  return {
    cycleTimeGain_pct: d.ref_cycleTime_min&&d.spk_cycleTime_min&&d.ref_cycleTime_min>0
      ? Math.round(((d.spk_cycleTime_min-d.ref_cycleTime_min)/d.ref_cycleTime_min)*100) : null,
    cuttingEdgesGain_pct: pct(d.spk_cuttingEdges,d.ref_cuttingEdges),
    partsPerInsertGain_pct: pct(d.spk_partsPerInsert,d.ref_partsPerInsert),
    mrrRatio: d.ref_mrr&&d.spk_mrr&&d.ref_mrr>0 ? Math.round((d.spk_mrr/d.ref_mrr)*10)/10 : null,
    volumePerEdge_ref:null, volumePerEdge_spk:null,
    piecesPerShift_ref: d.ref_cycleTime_min?Math.floor(d.shiftDuration_min/d.ref_cycleTime_min):null,
    piecesPerShift_spk: d.spk_cycleTime_min?Math.floor(d.shiftDuration_min/d.spk_cycleTime_min):null,
    piecesPerShiftGain:null, costPerPart_ref:costRef, costPerPart_spk:costSpk, costPerPartGain_pct:null,
    roiOnSeries_eur: costRef&&costSpk&&d.seriesSize ? Math.round((costRef-costSpk)*d.seriesSize) : null,
    toolChangesPerSeries_ref:null, toolChangesPerSeries_spk:null,
  }
}

// ── PAGES ──────────────────────────────────────────────────────────────────

function pageCover(doc: Doc, r: Report, lang: Lang = 'EN') {
  doc.setFillColor(WHITE); doc.rect(0,0,W,H,'F')
  // Thin blue left accent on cover too — consistent with other slides
  blueAccent(doc)

  const title = r.opportunityRef ? `${r.opportunityRef} - ${t('slideMachiningTest', lang)}` : t('slideMachiningTest', lang)
  doc.setFontSize(34); doc.setFont('helvetica','bolditalic'); doc.setTextColor(BLUE)
  const lines = doc.splitTextToSize(title, W - M*4)
  const startY = H/2 - (lines.length * 14)/2
  lines.forEach((l: string, i: number) => doc.text(l, W/2, startY + i*14, {align:'center'}))

  const dateStr = new Date(r.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'})
  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(DARK)
  doc.text(`${t('pdfCreated', lang)} ${r.contacts.salesName||''}`, M+4, H-28)
  doc.text(`${t('pdfDate', lang)} ${dateStr}`, M+4, H-20)

  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(GRAY)
  doc.text(t('cmpSpkCompany', lang), W-M-4, H-5, {align:'right'})
}

async function pageContacts(doc: Doc, r: Report, n: number, lang: Lang = 'EN') {
  doc.setFillColor(WHITE); doc.rect(0,0,W,H,'F')
  blueAccent(doc)

  const photoW = W/2 - M - 8
  const photoH = H - 20

  if (r.workpiece.drawingPhoto) {
    const src = r.workpiece.drawingPhoto.annotatedBase64 || r.workpiece.drawingPhoto.originalBase64
    if (src) await addPhoto(doc, src, 6, 10, photoW, photoH)
  } else {
    doc.setFillColor(BG); doc.roundedRect(6, 10, photoW, photoH, 3, 3, 'F')
    doc.setFontSize(10); doc.setTextColor(GRAY)
    doc.text('No photo', 6 + photoW/2, H/2, {align:'center'})
  }

  const rx = W/2 + 4
  const cw = W/2 - M - 4
  let y = 18

  const section = (t: string) => { sectionLabel(doc, t, rx, y); y += 8 }
  const line    = (t: string) => { y = bodyLine(doc, t, rx, y, cw) + 1 }

  section(t('pdfSpkContacts', lang))
  if (r.contacts.salesName)        line(`${t('pdfSales', lang)} ${r.contacts.salesName}`)
  if (r.contacts.appEngineerName)  line(`${t('pdfAppEng', lang)} ${r.contacts.appEngineerName}`)
  y += 4

  section(`${(r.contacts.customerCompany||'Customer').toUpperCase()} ${t('pdfSpkContacts', lang).replace('SPK ','')}`)
  if (r.contacts.customerContact)  line(`${r.contacts.customerRole||'Contact'}: ${r.contacts.customerContact}`)
  if (r.contacts.customerContact2) line(`${r.contacts.customerRole2||''}: ${r.contacts.customerContact2}`)
  y += 4

  section(t('pdfWorkpiece', lang))
  if (r.workpiece.typology)            line(`${t('pdfTypology', lang)} ${r.workpiece.typology}`)
  if (r.workpiece.material)            line(`${t('pdfMaterial', lang)} ${r.workpiece.material}`)
  if (r.workpiece.hardnessValue)       line(`${t('pdfHardness', lang)} ${r.workpiece.hardnessValue} ${r.workpiece.hardness}`)
  if (r.workpiece.castingManufacturer) line(`${t('pdfCasting', lang)} ${r.workpiece.castingManufacturer}`)
  y += 4

  section(t('pdfOpInfo', lang))
  if (r.machine.manufacturer)     line(`${t('pdfMachine', lang)} ${r.machine.manufacturer}`)
  if (r.machine.model)            line(`${t('pdfModel', lang)} ${r.machine.model}`)
  if (r.machine.pumpPressure_bar) line(`${t('pdfPump', lang)} ${r.machine.pumpPressure_bar} bar`)
  if (r.machine.operation)        line(`${t('pdfOperation', lang)} ${r.machine.operation}`)

  spkFooter(doc, n)
}

async function pageScope(doc: Doc, r: Report, n: number, lang: Lang = 'EN') {
  doc.setFillColor(WHITE); doc.rect(0,0,W,H,'F')
  blueAccent(doc)
  slideTitle(doc, t('slideScope', lang))
  let y = 38
  if (r.testScope.objective) {
    doc.setFontSize(14); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
    const lines = doc.splitTextToSize(r.testScope.objective, W - M*4 - 4)
    lines.forEach((l: string) => { doc.text(l, W/2, y, {align:'center'}); y += 7.5 })
    y += 6
  }
  if (r.testScope.backgroundContext) {
    doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(GRAY)
    const lines = doc.splitTextToSize(r.testScope.backgroundContext, W - M*4 - 4)
    lines.forEach((l: string) => { doc.text(l, W/2, y, {align:'center'}); y += 6.5 })
    y += 6
  }

  // Collect scope photos: workpiece drawing + current process setup photos
  const scopePhotos: { src: string; caption?: string }[] = []
  if (r.workpiece.drawingPhoto) {
    const src = r.workpiece.drawingPhoto.annotatedBase64 || r.workpiece.drawingPhoto.originalBase64
    if (src) scopePhotos.push({ src, caption: r.workpiece.drawingPhoto.caption || 'Workpiece' })
  }
  for (const ph of r.currentProcess.setupPhotos.slice(0, 2)) {
    const src = ph.annotatedBase64 || ph.originalBase64
    if (src) scopePhotos.push({ src, caption: ph.caption })
  }

  if (scopePhotos.length > 0) {
    const availH = H - y - 16
    if (availH > 20) {
      const cols = Math.min(scopePhotos.length, 3)
      const gap = 6
      const bw = (W - M*2 - gap*(cols-1)) / cols
      for (let i = 0; i < cols; i++) {
        await addPhoto(doc, scopePhotos[i].src, M + i*(bw+gap), y, bw, availH)
        if (scopePhotos[i].caption) {
          doc.setFontSize(8); doc.setFont('helvetica','italic'); doc.setTextColor(GRAY)
          doc.text(scopePhotos[i].caption!, M + i*(bw+gap) + bw/2, y + availH + 4, { align: 'center' })
        }
      }
    }
  }

  spkFooter(doc, n)
}

async function pageActualCycle(doc: Doc, r: Report, n: number, lang: Lang = 'EN') {
  doc.setFillColor(WHITE); doc.rect(0,0,W,H,'F')
  blueAccent(doc)
  slideTitle(doc, t('slideActualCycle', lang))

  const p = r.currentProcess
  const params: string[] = [
    p.totalCycleTime_min ? `${t('pdfCycleTime', lang)} ${p.totalCycleTime_min} min` : '',
    p.insertRef ? `${t('pdfInsert', lang)} ${p.insertRef}${p.insertSupplier ? ` (${p.insertSupplier})` : ''}` : '',
    p.toolholderRef ? `${t('pdfToolholder', lang)} ${p.toolholderRef}` : '',
    ...r.currentProcess.passes.flatMap(pass => [
      pass.vc_m_min ? `${t('pdfCuttingSpeed', lang)} ${pass.vc_m_min} m/min` : '',
      pass.f_mm_rev ? `${t('pdfFeed', lang)} ${pass.f_mm_rev} mm/r` : '',
      pass.ap_mm    ? `${t('pdfDepth', lang)} ${pass.ap_mm} mm` : '',
    ]),
    p.partsPerInsert ? `${t('pdfParts', lang)} ${p.partsPerInsert}` : '',
  ].filter(Boolean)

  let y = 38
  doc.setFontSize(14); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
  params.forEach(txt => { doc.text(txt, W*0.25, y, {align:'center'}); y += 8 })

  const photos = r.currentProcess.setupPhotos
  if (photos.length > 0) {
    const cols = Math.min(photos.length, 3)
    const gap = 5, bh = 58
    const bw = (W/2 - M - gap*(cols-1)) / cols
    for (let i = 0; i < Math.min(photos.length, cols); i++) {
      const ph = photos[i]
      const src = ph.annotatedBase64 || ph.originalBase64
      if (src) await addPhoto(doc, src, W/2 + 4 + i*(bw+gap), H - bh - 14, bw, bh)
    }
  }
  spkFooter(doc, n)
}

async function pageProposal(doc: Doc, r: Report, n: number, lang: Lang = 'EN') {
  doc.setFillColor(WHITE); doc.rect(0,0,W,H,'F')
  blueAccent(doc)
  slideTitle(doc, t('slideSpkProposal', lang))

  const sp = r.spkProposal
  const info: string[] = [
    sp.insertRef     ? `Insert: ${sp.insertRef}${sp.insertPartNumber ? ` (${sp.insertPartNumber})` : ''}` : '',
    sp.toolholderRef ? `Tool holder: ${sp.toolholderRef}${sp.toolholderPartNumber ? ` (${sp.toolholderPartNumber})` : ''}` : '',
    sp.insertGrade   ? `Grade: ${sp.insertGrade}` : '',
  ].filter(Boolean)

  let y = 38
  doc.setFontSize(14); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
  info.forEach(txt => { doc.text(txt, W/2, y, {align:'center'}); y += 8 })

  const photos = sp.setupPhotos
  if (photos.length > 0) {
    const cols = Math.min(photos.length, 3)
    const photoY = Math.max(y + 6, 38)
    const bh = Math.max(H - photoY - 14, 20)
    const gap = 6
    const bw = (W - M*2 - gap*(cols-1)) / cols
    for (let i = 0; i < Math.min(photos.length, cols); i++) {
      const ph = photos[i]
      const src = ph.annotatedBase64 || ph.originalBase64
      if (src) await addPhoto(doc, src, M + i*(bw+gap), photoY, bw, bh)
    }
  }
  spkFooter(doc, n)
}


async function pageTest(doc: Doc, test: TestEntry, n: number, lang: Lang = 'EN') {
  doc.setFillColor(WHITE); doc.rect(0,0,W,H,'F')
  blueAccent(doc)

  const lx = 6, rx = W/2+4
  const lcw = W/2 - M - 4, rcw = W/2 - M - 4

  doc.setFontSize(22); doc.setFont('helvetica','bolditalic'); doc.setTextColor(BLUE)
  doc.text(`${test.testNumber}${ord(test.testNumber)} TEST`, lx, 15)
  doc.text(`${test.workpieceNumber}${ord(test.workpieceNumber)} WORKPIECE`, W-M, 15, {align:'right'})

  doc.setDrawColor('#D0D8E4'); doc.setLineWidth(0.3)
  doc.line(lx, 18, W-M, 18)

  const params: string[] = [
    test.passRef ? `${t('pdfCutting', lang)} ${test.passRef}${test.passType?` (${test.passType})`:''}` : '',
    test.parameters.vc_m_min  ? `${t('pdfCuttingSpeed', lang)} ${test.parameters.vc_m_min} m/min` : '',
    test.parameters.f_mm_rev  ? `${t('pdfFeed', lang)} ${test.parameters.f_mm_rev} mm/r`  : '',
    test.parameters.ap_mm     ? `${t('pdfDepth', lang)} ${test.parameters.ap_mm} mm` : '',
    test.results.insertLife_min  ? `${t('pdfInsertLife', lang)} ${test.results.insertLife_min} min` : '',
    test.results.insertLife_cuts ? `${t('pdfCuts', lang)} ${test.results.insertLife_cuts}` : '',
    test.results.mrr             ? `${t('pdfMrr', lang)} ${test.results.mrr} cm3/min` : '',
  ].filter(Boolean)

  let ly = 26
  doc.setFontSize(14); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
  params.forEach(p => { doc.text(p, lx, ly); ly += 8 })

  // Outcome badge
  const outcomeColor: Record<string,string> = {success:'#1B8A4C',breakage:'#DC2626',wear:'#B45309',aborted:'#6B7280',in_progress:BLUE}
  const outcomeLabel: Record<string,string> = {success:'OK - Success',breakage:'FAIL - Breakage',wear:'WEAR',aborted:'Aborted',in_progress:'In Progress'}
  if (test.results.outcome) {
    const col = outcomeColor[test.results.outcome]||GRAY
    doc.setFillColor(BG); doc.roundedRect(lx, ly+1, 58, 9, 2, 2, 'F')
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(col)
    doc.text(outcomeLabel[test.results.outcome]||test.results.outcome, lx+29, ly+7, {align:'center'})
    ly += 14
  }

  if (test.observations) {
    doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
    const lines = doc.splitTextToSize(test.observations, lcw)
    lines.forEach((l: string) => { doc.text(l, lx, ly); ly += 6 })
  }

  // Photos right column
  const rightPhotos = test.photos.slice(0,2)
  if (rightPhotos.length > 0) {
    const availH = H - 22
    const ph = rightPhotos.length === 1 ? availH : (availH/2) - 4
    for (let i = 0; i < rightPhotos.length; i++) {
      const photo = rightPhotos[i]
      const src = photo.annotatedBase64 || photo.originalBase64
      if (src) {
        await addPhoto(doc, src, rx, 20 + i*(ph+6), rcw, ph)
        if (photo.caption) {
          doc.setFontSize(8); doc.setFont('helvetica','italic'); doc.setTextColor(GRAY)
          doc.text(photo.caption, rx+rcw/2, 20+i*(ph+6)+ph+4, {align:'center'})
        }
      }
    }
  }
  spkFooter(doc, n)
}

function pageComparison(doc: Doc, r: Report, metrics: ROIMetrics, showFinancial: boolean, n: number, lang: Lang = 'EN') {
  doc.setFillColor(WHITE); doc.rect(0,0,W,H,'F')
  blueAccent(doc)
  slideTitle(doc, t('slideComparison', lang))

  const d = r.roiData
  const c1=6, c2=90, c3=178, c4=W-M-6
  let y = 34

  doc.setFontSize(11); doc.setFont('helvetica','bolditalic'); doc.setTextColor(BLUE)
  doc.text('REFERENCE', c2+25, y, {align:'center'})
  doc.setFillColor(BG); doc.roundedRect(c3-8, y-6, 64, H-y-14, 3,3,'F')
  doc.setFontSize(11); doc.setFont('helvetica','bolditalic'); doc.setTextColor(BLUE)
  doc.text('SPK PROPOSAL', c3+24, y, {align:'center'})
  y += 10

  const rows: [string,string,string,string][] = [
    [t('cmpInserts', lang),         t('cmpCarbide', lang),                               t('cmpCeramic', lang),                               ''],
    [t('cmpSupplier', lang),        r.currentProcess.insertSupplier||'-',   t('cmpSpkCompany', lang),                       ''],
    [t('cmpEdges', lang),   d.ref_cuttingEdges?.toString()||'-',    d.spk_cuttingEdges?.toString()||'-',     metrics.cuttingEdgesGain_pct!==null?`+${metrics.cuttingEdgesGain_pct}%`:''],
    [t('cmpTime', lang),      d.ref_cycleTime_min?`${d.ref_cycleTime_min} min`:'-', d.spk_cycleTime_min?`${d.spk_cycleTime_min} min`:'-', metrics.cycleTimeGain_pct!==null?`${metrics.cycleTimeGain_pct}%`:''],
    [t('cmpInsertLife', lang),     '1',                                     '1',                                     '='],
    [t('cmpPartInsert', lang),     d.ref_partsPerInsert?.toString()||'-',  d.spk_partsPerInsert?.toString()||'-',   metrics.partsPerInsertGain_pct!==null?`+${metrics.partsPerInsertGain_pct}%`:''],
  ]

  rows.forEach(([label,ref,spk,delta]) => {
    doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(BLUE)
    doc.text(label, c1, y)
    doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
    doc.text(ref, c2+25, y, {align:'center'})
    doc.text(spk, c3+24, y, {align:'center'})
    if (delta) {
      const pos=delta.startsWith('+'), neut=delta==='='
      doc.setFont('helvetica','bold'); doc.setFontSize(14)
      doc.setTextColor(neut?GRAY:pos?'#1B8A4C':'#DC2626')
      doc.text(delta, c4, y, {align:'right'})
    }
    y += 10
    doc.setDrawColor('#E8ECF0'); doc.setLineWidth(0.2); doc.line(c1, y-1, c4, y-1)
  })

  if (showFinancial && (metrics.costPerPart_ref!==null || metrics.costPerPart_spk!==null)) {
    y += 4
    doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(BLUE)
    doc.text(t('cmpFinancial', lang), W/2, y, {align:'center'}); y+=8
    if (metrics.costPerPart_ref && metrics.costPerPart_spk) {
      doc.setFont('helvetica','normal'); doc.setTextColor(DARK); doc.setFontSize(13)
      // Use safe ASCII chars only — no arrows, no fancy quotes
      doc.text(`${t('cmpCostPart', lang)} ${metrics.costPerPart_ref} EUR  ->  ${metrics.costPerPart_spk} EUR`, W/2, y, {align:'center'}); y+=7
    }
    if (metrics.roiOnSeries_eur!==null && r.roiData.seriesSize) {
      doc.setFontSize(13); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
      const sign = metrics.roiOnSeries_eur>0?'+':''
      doc.text(`${t('cmpRoi', lang)} (${r.roiData.seriesSize} pcs): ${sign}${metrics.roiOnSeries_eur} EUR`, W/2, y, {align:'center'})
    }
  }

  doc.setFontSize(9); doc.setFont('helvetica','italic'); doc.setTextColor(GRAY)
  doc.text(t('cmpFootnote', lang), W/2, H-14, {align:'center'})
  spkFooter(doc, n)
}

function pageSummary(doc: Doc, r: Report, n: number, lang: Lang = 'EN') {
  doc.setFillColor(BLUE); doc.rect(0,0,W*0.47,H,'F')
  doc.setFillColor(WHITE); doc.rect(W*0.47,0,W*0.53,H,'F')

  doc.setFontSize(26); doc.setFont('helvetica','bolditalic'); doc.setTextColor(WHITE)
  doc.text(t('slideSummary', lang), W*0.235, 18, {align:'center'})

  let ly = 28
  if (r.conclusion.summary) {
    doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.setTextColor(WHITE)
    const lines = doc.splitTextToSize(r.conclusion.summary, W*0.44-M*2)
    lines.forEach((l: string) => { doc.text(l, W*0.235, ly, {align:'center'}); ly+=6.5 })
    ly+=4
  }
  r.conclusion.keyLearnings.forEach(item => {
    doc.setFillColor(RED); doc.circle(M+3, ly-2, 1.3, 'F')
    doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(WHITE)
    const lines = doc.splitTextToSize(item, W*0.44-M*2-7)
    lines.forEach((l: string) => { doc.text(l, M+8, ly); ly+=6 })
  })

  const rx = W*0.49, rw = W*0.47
  let ry = 16
  doc.setFontSize(14); doc.setFont('helvetica','bold'); doc.setTextColor(BLUE)
  doc.text(t('slideOperatingRules', lang), rx, ry); ry+=10

  r.conclusion.operatingRules.forEach(rule => {
    doc.setFillColor(BLUE); doc.circle(rx+2, ry-2, 1.3, 'F')
    doc.setFontSize(11); doc.setFont('helvetica','normal'); doc.setTextColor(DARK)
    const lines = doc.splitTextToSize(rule, rw-8)
    lines.forEach((l: string) => { doc.text(l, rx+7, ry); ry+=6 })
  })

  spkFooter(doc, n)
}

function pageNextSteps(doc: Doc, r: Report, n: number, lang: Lang = 'EN') {
  doc.setFillColor(BLUE); doc.rect(0,0,W,H,'F')
  doc.setFontSize(32); doc.setFont('helvetica','bolditalic'); doc.setTextColor(WHITE)
  doc.text(t('slideNextSteps', lang), W/2, 24, {align:'center'})

  const startY = 42
  r.conclusion.nextSteps.forEach((step,i) => {
    doc.setFontSize(14); doc.setFont('helvetica','normal'); doc.setTextColor(WHITE)
    const lines = doc.splitTextToSize(`${i+1}. ${step.toUpperCase()}`, W-M*6)
    lines.forEach((l: string, j: number) => doc.text(l, W/2, startY+i*18+j*8, {align:'center'}))
  })

  doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(WHITE)
  doc.text(t('cmpSpkCompany', lang), W-M-4, H-5, {align:'right'})
}

// ── MAIN ──────────────────────────────────────────────────────────────────

export async function generatePDF(r: Report, showFinancial = true, lang: Lang = 'EN'): Promise<void> {
  const doc = new jsPDF({ orientation:'landscape', unit:'mm', format:'a4' })
  doc.setFont('helvetica')

  let total = 5
  total += r.testLog.length + 2
  if (r.conclusion.nextSteps.length>0) total++

  let n=1
  pageCover(doc, r, lang); n++
  doc.addPage(); await pageContacts(doc, r, n, lang); n++
  doc.addPage(); await pageScope(doc, r, n, lang); n++
  doc.addPage(); await pageActualCycle(doc, r, n, lang); n++
  doc.addPage(); await pageProposal(doc, r, n, lang); n++

    for (let i=0; i<r.testLog.length; i++) {
    const test=r.testLog[i]
    doc.addPage(); await pageTest(doc, test, n, lang); n++
  }

  const metrics = computeROI(r)
  doc.addPage(); pageComparison(doc, r, metrics, showFinancial, n, lang); n++
  doc.addPage(); pageSummary(doc, r, n, lang); n++
  if (r.conclusion.nextSteps.length>0) { doc.addPage(); pageNextSteps(doc, r, n, lang) }

  const filename = `${(r.opportunityRef||'SPK').replace(/[^a-zA-Z0-9_-]/g,'_')}_${(r.contacts.customerCompany||'Report').replace(/[^a-zA-Z0-9_-]/g,'_')}_${new Date(r.createdAt).toISOString().slice(0,10)}.pdf`
  // Use explicit blob URL download — more reliable on iOS Safari than doc.save()
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
