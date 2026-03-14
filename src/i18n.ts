// Centralised translations — EN (default) + DE
// All UI strings, PDF/PPTX slide titles and labels live here.

export type Lang = 'EN' | 'DE'

export const T = {
  // ── Navigation / Layout ──────────────────────────────────────────────
  reports:        { EN: 'Reports',        DE: 'Berichte' },
  newReport:      { EN: 'New Report',     DE: 'Neuer Bericht' },
  new:            { EN: 'New',            DE: 'Neu' },
  save:           { EN: 'Save',           DE: 'Speichern' },
  saving:         { EN: 'Saving…',        DE: 'Speichern…' },
  back:           { EN: 'Back',           DE: 'Zurück' },
  export:         { EN: 'Export',         DE: 'Exportieren' },
  generate:       { EN: 'Generate PDF',   DE: 'PDF generieren' },
  generatePptx:   { EN: 'Generate PowerPoint (.pptx)', DE: 'PowerPoint generieren (.pptx)' },
  generating:     { EN: 'Generating…',    DE: 'Wird generiert…' },
  downloadAgain:  { EN: 'Download again', DE: 'Erneut herunterladen' },
  dark:           { EN: 'Dark',           DE: 'Dunkel' },
  light:          { EN: 'Light',          DE: 'Hell' },

  // ── Dashboard ────────────────────────────────────────────────────────
  fieldReports:   { EN: 'Field Reports',  DE: 'Feldberichte' },
  total:          { EN: 'Total',          DE: 'Gesamt' },
  inProgress:     { EN: 'In Progress',    DE: 'In Bearbeitung' },
  exported:       { EN: 'Exported',       DE: 'Exportiert' },
  noReports:      { EN: 'No reports yet', DE: 'Noch keine Berichte' },
  noReportsSub:   { EN: 'Create your first machining test report', DE: 'Erstellen Sie Ihren ersten Bearbeitungsbericht' },
  noCustomer:     { EN: 'No customer',    DE: 'Kein Kunde' },
  tests:          { EN: 'tests',          DE: 'Tests' },
  photos:         { EN: 'photos',         DE: 'Fotos' },

  // ── Status tags ──────────────────────────────────────────────────────
  draft:          { EN: 'Draft',          DE: 'Entwurf' },
  completed:      { EN: 'Completed',      DE: 'Abgeschlossen' },

  // ── Report Editor steps ──────────────────────────────────────────────
  stepHeader:     { EN: 'Header',         DE: 'Kopfzeile' },
  stepWorkpiece:  { EN: 'Workpiece',      DE: 'Werkstück' },
  stepProcess:    { EN: 'Process',        DE: 'Prozess' },
  stepTests:      { EN: 'Tests',          DE: 'Tests' },
  stepROI:        { EN: 'ROI',            DE: 'ROI' },
  stepConclusion: { EN: 'Conclusion',     DE: 'Fazit' },

  // ── Section titles ───────────────────────────────────────────────────
  reference:      { EN: 'Reference',           DE: 'Referenz' },
  spkContacts:    { EN: 'SPK Contacts',         DE: 'SPK Kontakte' },
  customerContacts:{ EN: 'Customer Contacts',   DE: 'Kundenkontakte' },
  workpieceInfo:  { EN: 'Workpiece',            DE: 'Werkstück' },
  machineInfo:    { EN: 'Machine & Operation',  DE: 'Maschine & Betrieb' },
  testObjective:  { EN: 'Test Objective',       DE: 'Testziel' },
  currentProcess: { EN: 'Current Process (Reference)', DE: 'Aktueller Prozess (Referenz)' },
  spkProposal:    { EN: 'SPK Proposal',         DE: 'SPK-Vorschlag' },
  parameters:     { EN: 'Parameters',           DE: 'Parameter' },
  results:        { EN: 'Results',              DE: 'Ergebnisse' },
  observations:   { EN: 'Observations',         DE: 'Beobachtungen' },
  roiComparison:  { EN: 'ROI Comparison',       DE: 'ROI-Vergleich' },
  summary:        { EN: 'Summary',              DE: 'Zusammenfassung' },
  keyLearnings:   { EN: 'Key Learnings',        DE: 'Wichtige Erkenntnisse' },
  operatingRules: { EN: 'Operating Rules',      DE: 'Betriebsregeln' },
  nextSteps:      { EN: 'Next Steps',           DE: 'Nächste Schritte' },

  // ── Field labels ─────────────────────────────────────────────────────
  opportunityRef: { EN: 'Opportunity Reference', DE: 'Referenznummer' },
  language:       { EN: 'Language',             DE: 'Sprache' },
  salesName:      { EN: 'Sales Manager',         DE: 'Vertriebsmanager' },
  appEngineer:    { EN: 'Application Engineer',  DE: 'Anwendungstechniker' },
  company:        { EN: 'SPK Company',           DE: 'SPK Unternehmen' },
  customerCompany:{ EN: 'Customer Company',      DE: 'Kundenunternehmen' },
  customerContact:{ EN: 'Contact Name',          DE: 'Kontaktname' },
  customerRole:   { EN: 'Role',                  DE: 'Rolle' },
  typology:       { EN: 'Part Typology',         DE: 'Teiltypologie' },
  material:       { EN: 'Material',              DE: 'Material' },
  hardness:       { EN: 'Hardness Type',         DE: 'Härtetyp' },
  hardnessValue:  { EN: 'Hardness Value',        DE: 'Härtewert' },
  casting:        { EN: 'Casting Manufacturer',  DE: 'Gusshersteller' },
  machine:        { EN: 'Machine Manufacturer',  DE: 'Maschinenhersteller' },
  model:          { EN: 'Model',                 DE: 'Modell' },
  operation:      { EN: 'Operation',             DE: 'Betrieb' },
  operationType:  { EN: 'Operation Type',        DE: 'Betriebsart' },
  pumpPressure:   { EN: 'Pump Pressure (bar)',   DE: 'Pumpendruck (bar)' },
  coolant:        { EN: 'Coolant Type',          DE: 'Kühlmitteltyp' },
  objective:      { EN: 'Objective',             DE: 'Ziel' },
  background:     { EN: 'Background / Context',  DE: 'Hintergrund / Kontext' },
  insertRef:      { EN: 'Insert Reference',      DE: 'Schneideplattenreferenz' },
  insertSupplier: { EN: 'Insert Supplier',       DE: 'Schneidplattenlieferant' },
  toolholderRef:  { EN: 'Toolholder Reference',  DE: 'Werkzeughalterreferenz' },
  toolholderSupplier:{ EN: 'Toolholder Supplier',DE: 'Werkzeughalterlieferant' },
  insertPartNumber:{ EN: 'Insert Part Number',   DE: 'Artikelnummer Schneide' },
  toolholderPartNumber:{ EN: 'Toolholder Part Number', DE: 'Artikelnummer Werkzeughalter' },
  insertGrade:    { EN: 'Insert Grade',          DE: 'Schneidplattenqualität' },
  cuttingEdges:   { EN: 'Cutting Edges / Insert',DE: 'Schneidkanten / Schneide' },
  cycleTime:      { EN: 'Total Cycle Time (min)',DE: 'Gesamtzykluszeit (min)' },
  partsPerInsert: { EN: 'Parts / Insert',        DE: 'Teile / Schneide' },
  setupPhotos:    { EN: 'Setup Photos',          DE: 'Einrichtungsfotos' },
  addTest:        { EN: '+ Add Test',            DE: '+ Test hinzufügen' },
  testNumber:     { EN: 'Test #',                DE: 'Test Nr.' },
  workpieceNumber:{ EN: 'Workpiece #',           DE: 'Werkstück Nr.' },
  passRef:        { EN: 'Pass Reference',        DE: 'Durchgangsreferenz' },
  passType:       { EN: 'Pass Type',             DE: 'Durchgangstyp' },
  vcMMin:         { EN: 'Cutting Speed (m/min)', DE: 'Schnittgeschwindigkeit (m/min)' },
  fMmRev:         { EN: 'Feed (mm/r)',           DE: 'Vorschub (mm/U)' },
  apMm:           { EN: 'Depth of Cut (mm)',     DE: 'Schnitttiefe (mm)' },
  insertLife:     { EN: 'Insert Life (min)',      DE: 'Standzeit (min)' },
  insertLifeCuts: { EN: 'Insert Life (cuts)',     DE: 'Standzeit (Schnitte)' },
  outcome:        { EN: 'Outcome',               DE: 'Ergebnis' },
  mrr:            { EN: 'MRR (cm³/min)',         DE: 'Zerspanungsvolumen (cm³/min)' },
  machineCost:    { EN: 'Machine Cost (€/hr)',   DE: 'Maschinenkosten (€/Std)' },
  shiftDuration:  { EN: 'Shift Duration (min)',  DE: 'Schichtdauer (min)' },
  seriesSize:     { EN: 'Series Size (pcs)',      DE: 'Seriengröße (Stk)' },
  insertPrice:    { EN: 'Insert Price (€)',       DE: 'Schneidplattenpreis (€)' },
  noPhoto:        { EN: 'No photo',              DE: 'Kein Foto' },
  addPhoto:       { EN: 'Add Photo',             DE: 'Foto hinzufügen' },
  notes:          { EN: 'Notes',                 DE: 'Notizen' },

  // ── Outcome labels ───────────────────────────────────────────────────
  outcomeSuccess:    { EN: 'Success',      DE: 'Erfolg' },
  outcomeBreakage:   { EN: 'Breakage',     DE: 'Bruch' },
  outcomeWear:       { EN: 'Wear',         DE: 'Verschleiß' },
  outcomeAborted:    { EN: 'Aborted',      DE: 'Abgebrochen' },
  outcomeInProgress: { EN: 'In Progress',  DE: 'In Bearbeitung' },

  // ── Export page ──────────────────────────────────────────────────────
  reportContent:  { EN: 'Report Content',        DE: 'Berichtsinhalt' },
  pdfStructure:   { EN: 'PDF Structure',         DE: 'PDF-Struktur' },
  includeFinancial:{ EN: 'Include financial comparison', DE: 'Finanziellen Vergleich einschließen' },
  includeFinancialSub:{ EN: 'Cost/part, ROI on series — only if data available', DE: 'Kosten/Teil, ROI auf Serie — nur wenn Daten vorhanden' },
  pdfSuccess:     { EN: '✓ PDF generated and downloaded successfully', DE: '✓ PDF erfolgreich erstellt und heruntergeladen' },
  pptxSuccess:    { EN: '✓ PowerPoint generated and downloaded successfully', DE: '✓ PowerPoint erfolgreich erstellt und heruntergeladen' },

  // ── PDF / PPTX slide titles ──────────────────────────────────────────
  slideMachiningTest:  { EN: 'MACHINING TEST',      DE: 'BEARBEITUNGSTEST' },
  slideScope:          { EN: 'SCOPE OF THE TEST',   DE: 'TESTUMFANG' },
  slideActualCycle:    { EN: 'ACTUAL CYCLE',         DE: 'AKTUELLER ZYKLUS' },
  slideSpkProposal:    { EN: 'SPK PROPOSAL',         DE: 'SPK VORSCHLAG' },
  slideComparison:     { EN: 'PROCESS COMPARISON',  DE: 'PROZESSVERGLEICH' },
  slideSummary:        { EN: 'SUMMARY',              DE: 'ZUSAMMENFASSUNG' },
  slideNextSteps:      { EN: 'NEXT STEPS',           DE: 'NÄCHSTE SCHRITTE' },
  slideOperatingRules: { EN: 'Operating Rules',      DE: 'Betriebsregeln' },

  // ── PDF comparison table ─────────────────────────────────────────────
  cmpInserts:     { EN: 'INSERTS:',          DE: 'SCHNEIDPLATTEN:' },
  cmpSupplier:    { EN: 'SUPPLIER:',         DE: 'LIEFERANT:' },
  cmpEdges:       { EN: 'CUTTING EDGES:',    DE: 'SCHNEIDKANTEN:' },
  cmpTime:        { EN: 'TOTAL TIME:',       DE: 'GESAMTZEIT:' },
  cmpInsertLife:  { EN: 'INSERT LIFE:',      DE: 'STANDZEIT:' },
  cmpPartInsert:  { EN: 'PART/INSERT:',      DE: 'TEILE/SCHNEIDE:' },
  cmpFinancial:   { EN: 'FINANCIAL IMPACT',  DE: 'FINANZIELLER EINFLUSS' },
  cmpCostPart:    { EN: 'Cost/part:',        DE: 'Kosten/Teil:' },
  cmpRoi:         { EN: 'ROI on series',     DE: 'ROI auf Serie' },
  cmpFootnote:    { EN: '(*) 1 face + 1 diameter', DE: '(*) 1 Fläche + 1 Durchmesser' },
  cmpCarbide:     { EN: 'Carbide',           DE: 'Hartmetall' },
  cmpCeramic:     { EN: 'Ceramic',           DE: 'Keramik' },
  cmpSpkCompany:  { EN: 'SPK by CeramTec',   DE: 'SPK by CeramTec' },

  // ── PDF field labels ─────────────────────────────────────────────────
  pdfSales:       { EN: 'Sales:',                     DE: 'Vertrieb:' },
  pdfAppEng:      { EN: 'Application Engineer:',      DE: 'Anwendungstechniker:' },
  pdfTypology:    { EN: 'Typology:',                  DE: 'Typologie:' },
  pdfMaterial:    { EN: 'Material:',                  DE: 'Material:' },
  pdfHardness:    { EN: 'Hardness:',                  DE: 'Härte:' },
  pdfCasting:     { EN: 'Casting:',                   DE: 'Guss:' },
  pdfMachine:     { EN: 'Machine:',                   DE: 'Maschine:' },
  pdfModel:       { EN: 'Model:',                     DE: 'Modell:' },
  pdfPump:        { EN: 'Pump pressure:',             DE: 'Pumpendruck:' },
  pdfOperation:   { EN: 'Operation:',                 DE: 'Betrieb:' },
  pdfCycleTime:   { EN: 'Cycle time:',                DE: 'Zykluszeit:' },
  pdfInsert:      { EN: 'Insert:',                    DE: 'Schneide:' },
  pdfToolholder:  { EN: 'Tool holder:',               DE: 'Werkzeughalter:' },
  pdfFeed:        { EN: 'Feed:',                      DE: 'Vorschub:' },
  pdfDepth:       { EN: 'Depth of cut:',              DE: 'Schnitttiefe:' },
  pdfCuttingSpeed:{ EN: 'Cutting speed:',             DE: 'Schnittgeschwindigkeit:' },
  pdfGrade:       { EN: 'Grade:',                     DE: 'Qualität:' },
  pdfCutting:     { EN: 'Cutting:',                   DE: 'Schnitt:' },
  pdfInsertLife:  { EN: 'Insert life:',               DE: 'Standzeit:' },
  pdfCuts:        { EN: 'Cuts:',                      DE: 'Schnitte:' },
  pdfMrr:         { EN: 'MRR:',                       DE: 'Zerspanungsvolumen:' },
  pdfParts:       { EN: 'Parts / Insert:',            DE: 'Teile / Schneide:' },
  pdfCreated:     { EN: 'Created:',                   DE: 'Erstellt:' },
  pdfDate:        { EN: 'Date:',                      DE: 'Datum:' },

  // ── PDF section headers ──────────────────────────────────────────────
  pdfSpkContacts: { EN: 'SPK CONTACTS',               DE: 'SPK KONTAKTE' },
  pdfWorkpiece:   { EN: 'WORKPIECE',                  DE: 'WERKSTÜCK' },
  pdfOpInfo:      { EN: 'OPERATION',                  DE: 'BETRIEB' },
} as const

export type TKey = keyof typeof T

export function t(key: TKey, lang: Lang): string {
  return T[key][lang] ?? T[key]['EN']
}

// Reactive lang — read from localStorage
export function getLang(): Lang {
  return (localStorage.getItem('spk-lang') as Lang) || 'EN'
}
