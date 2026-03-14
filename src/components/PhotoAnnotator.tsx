import { useRef, useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Annotation, AnnotationTool, AnnotationColor, Point, ReportPhoto } from '@/types'

interface Props {
  photo: ReportPhoto
  onSave: (annotatedBase64: string, annotations: Annotation[], caption: string, keepOriginal: boolean) => void
  onCancel: () => void
}

const COLORS: { value: AnnotationColor; label: string }[] = [
  { value: '#E53935', label: 'Red' },
  { value: '#FDD835', label: 'Yellow' },
  { value: '#43A047', label: 'Green' },
  { value: '#FFFFFF', label: 'White' },
  { value: '#000000', label: 'Black' },
  { value: '#1E88E5', label: 'Blue' },
]

const TOOLS: { value: AnnotationTool; icon: string; label: string }[] = [
  { value: 'arrow',        icon: '↗', label: 'Arrow' },
  { value: 'curved_arrow', icon: '↝', label: 'Curved' },
  { value: 'rectangle',   icon: '▭', label: 'Rect' },
  { value: 'circle',      icon: '○', label: 'Circle' },
  { value: 'freehand',    icon: '✏', label: 'Draw' },
  { value: 'text',        icon: 'T',  label: 'Text' },
  { value: 'crop',        icon: '⊡', label: 'Crop' },
]

// Draw a single annotation onto a context
function drawAnn(ctx: CanvasRenderingContext2D, ann: Annotation) {
  ctx.save()
  ctx.strokeStyle = ann.color
  ctx.fillStyle   = ann.color
  ctx.lineWidth   = ann.strokeWidth
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'

  switch (ann.tool) {
    case 'freehand':
      if (!ann.points || ann.points.length < 2) break
      ctx.beginPath()
      ctx.moveTo(ann.points[0].x, ann.points[0].y)
      ann.points.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
      break

    case 'arrow': {
      if (!ann.start || !ann.end) break
      ctx.beginPath(); ctx.moveTo(ann.start.x, ann.start.y); ctx.lineTo(ann.end.x, ann.end.y); ctx.stroke()
      const a = Math.atan2(ann.end.y - ann.start.y, ann.end.x - ann.start.x)
      const hl = 14 + ann.strokeWidth * 2
      ctx.beginPath(); ctx.moveTo(ann.end.x, ann.end.y)
      ctx.lineTo(ann.end.x - hl*Math.cos(a-0.4), ann.end.y - hl*Math.sin(a-0.4))
      ctx.lineTo(ann.end.x - hl*Math.cos(a+0.4), ann.end.y - hl*Math.sin(a+0.4))
      ctx.closePath(); ctx.fill()
      break
    }

    case 'curved_arrow': {
      if (!ann.points || ann.points.length < 3) break
      const [p0, cp, p1] = ann.points
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y); ctx.stroke()
      // Tangent at t=0.99 for arrowhead direction
      const t = 0.99
      const tx = 2*(1-t)*(cp.x-p0.x) + 2*t*(p1.x-cp.x)
      const ty = 2*(1-t)*(cp.y-p0.y) + 2*t*(p1.y-cp.y)
      const a = Math.atan2(ty, tx)
      const hl = 14 + ann.strokeWidth * 2
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p1.x - hl*Math.cos(a-0.4), p1.y - hl*Math.sin(a-0.4))
      ctx.lineTo(p1.x - hl*Math.cos(a+0.4), p1.y - hl*Math.sin(a+0.4))
      ctx.closePath(); ctx.fill()
      break
    }

    case 'rectangle':
      if (!ann.start || !ann.end) break
      ctx.strokeRect(ann.start.x, ann.start.y, ann.end.x - ann.start.x, ann.end.y - ann.start.y)
      break

    case 'circle': {
      if (!ann.start || !ann.end) break
      const rx = (ann.end.x - ann.start.x) / 2
      const ry = (ann.end.y - ann.start.y) / 2
      ctx.beginPath()
      ctx.ellipse(ann.start.x + rx, ann.start.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2*Math.PI)
      ctx.stroke()
      break
    }

    case 'text':
      if (!ann.text || !ann.start) break
      ctx.font = `bold ${ann.fontSize || 18}px DM Sans, sans-serif`
      ctx.shadowColor = ann.color === '#FFFFFF' ? '#000' : '#fff'
      ctx.shadowBlur = 4
      ctx.fillText(ann.text, ann.start.x, ann.start.y)
      break
  }
  ctx.restore()
}

export default function PhotoAnnotator({ photo, onSave, onCancel }: Props) {
  // bgCanvas: image only, never touched after load
  const bgRef      = useRef<HTMLCanvasElement>(null)
  // annCanvas: committed annotations drawn here
  const annRef     = useRef<HTMLCanvasElement>(null)
  // overlayCanvas: live preview while drawing / crop UI
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef     = useRef<HTMLImageElement | null>(null)

  const [activeTool,    setActiveTool]    = useState<AnnotationTool>('arrow')
  const [activeColor,   setActiveColor]   = useState<AnnotationColor>('#E53935')
  const [strokeWidth,   setStrokeWidth]   = useState(3)
  const [annotations,   setAnnotations]   = useState<Annotation[]>(photo.annotations || [])
  const [caption,       setCaption]       = useState(photo.caption || '')
  const [isDrawing,     setIsDrawing]     = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [startPoint,    setStartPoint]    = useState<Point | null>(null)
  const [textInput,     setTextInput]     = useState('')
  const [textPosition,  setTextPosition]  = useState<Point | null>(null)
  const [keepOriginal,  setKeepOriginal]  = useState(true)
  const [size,          setSize]          = useState({ w: 0, h: 0 })
  const [cropStart,     setCropStart]     = useState<Point | null>(null)
  const [cropRect,      setCropRect]      = useState<{x:number,y:number,w:number,h:number}|null>(null)
  const [isCropping,    setIsCropping]    = useState(false)

  // Load image onto bg canvas once
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const container = containerRef.current
      if (!container) return
      const maxW = container.clientWidth - 24
      const maxH = window.innerHeight * 0.55
      const ratio = Math.min(maxW / img.width, maxH / img.height)
      const w = Math.floor(img.width  * ratio)
      const h = Math.floor(img.height * ratio)
      setSize({ w, h })
      // Draw image on bg canvas
      setTimeout(() => {
        const bg = bgRef.current
        if (!bg) return
        bg.width = w; bg.height = h
        bg.getContext('2d')!.drawImage(img, 0, 0, w, h)
        // Draw existing annotations on ann canvas
        const ann = annRef.current
        if (!ann) return
        ann.width = w; ann.height = h
        const ctx = ann.getContext('2d')!
        ;(photo.annotations || []).forEach(a => drawAnn(ctx, a))
      }, 50)
    }
    img.src = photo.originalBase64
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = overlayRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left)*scaleX, y: (e.touches[0].clientY - rect.top)*scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left)*scaleX, y: ((e as React.MouseEvent).clientY - rect.top)*scaleY }
  }

  const clearOverlay = () => {
    const o = overlayRef.current
    if (o) o.getContext('2d')!.clearRect(0, 0, o.width, o.height)
  }

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    if (activeTool === 'text') { setTextPosition(pos); return }
    if (activeTool === 'crop') { setCropStart(pos); setCropRect(null); setIsCropping(true); return }
    setIsDrawing(true)
    setStartPoint(pos)
    setCurrentPoints([pos])
  }

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)

    // Crop UI
    if (activeTool === 'crop' && isCropping && cropStart) {
      const x = Math.min(cropStart.x, pos.x), y = Math.min(cropStart.y, pos.y)
      const w = Math.abs(pos.x - cropStart.x), h = Math.abs(pos.y - cropStart.y)
      setCropRect({ x, y, w, h })
      const o = overlayRef.current; if (!o) return
      const ctx = o.getContext('2d')!
      ctx.clearRect(0, 0, o.width, o.height)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, o.width, o.height)
      ctx.clearRect(x, y, w, h)
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6,3])
      ctx.strokeRect(x, y, w, h); ctx.setLineDash([])
      ;([[x,y],[x+w,y],[x,y+h],[x+w,y+h]] as [number,number][]).forEach(([hx,hy]) => {
        ctx.fillStyle='#fff'; ctx.fillRect(hx-5, hy-5, 10, 10)
      })
      return
    }

    if (!isDrawing) return

    // Live preview on overlay
    const o = overlayRef.current; if (!o) return
    const ctx = o.getContext('2d')!
    ctx.clearRect(0, 0, o.width, o.height)
    ctx.strokeStyle = activeColor; ctx.fillStyle = activeColor
    ctx.lineWidth = strokeWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'

    if (activeTool === 'freehand') {
      setCurrentPoints(prev => [...prev, pos])
      const pts = [...currentPoints, pos]
      if (pts.length > 1) {
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y)
        pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke()
      }
    } else if (startPoint) {
      if (activeTool === 'arrow') {
        ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y); ctx.lineTo(pos.x, pos.y); ctx.stroke()
        const a = Math.atan2(pos.y-startPoint.y, pos.x-startPoint.x)
        const hl = 14+strokeWidth*2
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(pos.x-hl*Math.cos(a-0.4), pos.y-hl*Math.sin(a-0.4))
        ctx.lineTo(pos.x-hl*Math.cos(a+0.4), pos.y-hl*Math.sin(a+0.4))
        ctx.closePath(); ctx.fill()
      } else if (activeTool === 'curved_arrow') {
        const mx = (startPoint.x+pos.x)/2-(pos.y-startPoint.y)*0.35
        const my = (startPoint.y+pos.y)/2+(pos.x-startPoint.x)*0.35
        ctx.beginPath(); ctx.moveTo(startPoint.x, startPoint.y)
        ctx.quadraticCurveTo(mx, my, pos.x, pos.y); ctx.stroke()
        const t=0.99, tx=2*(1-t)*(mx-startPoint.x)+2*t*(pos.x-mx), ty=2*(1-t)*(my-startPoint.y)+2*t*(pos.y-my)
        const a=Math.atan2(ty,tx), hl=14+strokeWidth*2
        ctx.beginPath(); ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(pos.x-hl*Math.cos(a-0.4), pos.y-hl*Math.sin(a-0.4))
        ctx.lineTo(pos.x-hl*Math.cos(a+0.4), pos.y-hl*Math.sin(a+0.4))
        ctx.closePath(); ctx.fill()
      } else if (activeTool === 'rectangle') {
        ctx.strokeRect(startPoint.x, startPoint.y, pos.x-startPoint.x, pos.y-startPoint.y)
      } else if (activeTool === 'circle') {
        const rx=(pos.x-startPoint.x)/2, ry=(pos.y-startPoint.y)/2
        ctx.beginPath(); ctx.ellipse(startPoint.x+rx, startPoint.y+ry, Math.abs(rx), Math.abs(ry), 0, 0, 2*Math.PI); ctx.stroke()
      }
    }
  }

  const onPointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (activeTool === 'crop') { setIsCropping(false); return }
    if (!isDrawing) return
    const pos = getPos(e)
    setIsDrawing(false)
    clearOverlay()

    let newAnn: Annotation | null = null
    if (activeTool === 'freehand') {
      const pts = [...currentPoints, pos]
      if (pts.length > 1) newAnn = { id: uuidv4(), tool: 'freehand', color: activeColor, strokeWidth, points: pts }
    } else if (startPoint) {
      if (activeTool === 'arrow') {
        newAnn = { id: uuidv4(), tool: 'arrow', color: activeColor, strokeWidth, start: startPoint, end: pos }
      } else if (activeTool === 'curved_arrow') {
        const mx=(startPoint.x+pos.x)/2-(pos.y-startPoint.y)*0.35
        const my=(startPoint.y+pos.y)/2+(pos.x-startPoint.x)*0.35
        newAnn = { id: uuidv4(), tool: 'curved_arrow', color: activeColor, strokeWidth, points: [startPoint,{x:mx,y:my},pos] }
      } else if (activeTool === 'rectangle') {
        newAnn = { id: uuidv4(), tool: 'rectangle', color: activeColor, strokeWidth, start: startPoint, end: pos }
      } else if (activeTool === 'circle') {
        newAnn = { id: uuidv4(), tool: 'circle', color: activeColor, strokeWidth, start: startPoint, end: pos }
      }
    }

    if (newAnn) {
      // PRIMARY: bake into bg canvas immediately — this persists on iOS WebKit
      const bg = bgRef.current
      if (bg) drawAnn(bg.getContext('2d')!, newAnn)
      // SECONDARY: also draw on ann canvas for undo support
      const ann = annRef.current
      if (ann) drawAnn(ann.getContext('2d')!, newAnn)
      setAnnotations(prev => [...prev, newAnn!])
    }
    setCurrentPoints([]); setStartPoint(null)
  }

  // Apply crop: flatten bg + ann canvases, crop, reset
  const applyCrop = () => {
    if (!cropRect) return
    const { x, y, w, h } = cropRect
    if (w < 10 || h < 10) return

    const bg  = bgRef.current
    const ann = annRef.current
    const o   = overlayRef.current

    // Step 1: flatten everything into one offscreen canvas BEFORE resizing anything
    const flat = document.createElement('canvas')
    flat.width  = size.w
    flat.height = size.h
    const fctx = flat.getContext('2d')!
    fctx.fillStyle = '#FFFFFF'
    fctx.fillRect(0, 0, size.w, size.h)
    if (bg)  fctx.drawImage(bg,  0, 0)
    if (ann) fctx.drawImage(ann, 0, 0)

    // Step 2: extract crop region from the flat canvas
    const cropped = document.createElement('canvas')
    cropped.width  = w
    cropped.height = h
    const cctx = cropped.getContext('2d')!
    cctx.fillStyle = '#FFFFFF'
    cctx.fillRect(0, 0, w, h)
    cctx.drawImage(flat, x, y, w, h, 0, 0, w, h)

    // Step 3: update state first so React re-renders canvases at new size
    setSize({ w, h })
    setAnnotations([])
    setCropRect(null); setCropStart(null); setIsCropping(false)

    // Step 4: after state update, resize canvases and draw cropped image
    // Use requestAnimationFrame to wait for DOM update
    requestAnimationFrame(() => {
      const bg2  = bgRef.current
      const ann2 = annRef.current
      const o2   = overlayRef.current
      if (bg2) {
        bg2.width  = w; bg2.height = h
        const bctx = bg2.getContext('2d')!
        bctx.fillStyle = '#FFFFFF'
        bctx.fillRect(0, 0, w, h)
        bctx.drawImage(cropped, 0, 0)
      }
      if (ann2) { ann2.width = w; ann2.height = h }
      if (o2)   { o2.width  = w; o2.height  = h }
      // Update imgRef for future redraws
      const img = new Image()
      img.onload = () => { imgRef.current = img }
      img.src = cropped.toDataURL('image/jpeg', 0.95)
    })

    setSize({ w, h })
    setAnnotations([])
    setCropRect(null); setCropStart(null); setIsCropping(false)
  }

  const addTextAnnotation = () => {
    if (!textPosition || !textInput.trim()) return
    const ann: Annotation = { id: uuidv4(), tool: 'text', color: activeColor, strokeWidth, start: textPosition, text: textInput, fontSize: 16+strokeWidth*2 }
    const annCanvas = annRef.current
    if (annCanvas) drawAnn(annCanvas.getContext('2d')!, ann)
    setAnnotations(prev => [...prev, ann])
    setTextInput(''); setTextPosition(null)
  }

  const undo = () => {
    setAnnotations(prev => {
      const next = prev.slice(0, -1)
      const bg  = bgRef.current
      const ann = annRef.current
      const img = imgRef.current
      // Redraw bg from scratch: img + remaining annotations
      if (bg && img) {
        const ctx = bg.getContext('2d')!
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, bg.width, bg.height)
        ctx.drawImage(img, 0, 0, bg.width, bg.height)
        next.forEach(a => drawAnn(ctx, a))
      }
      if (ann) {
        ann.getContext('2d')!.clearRect(0, 0, ann.width, ann.height)
        next.forEach(a => drawAnn(ann.getContext('2d')!, a))
      }
      return next
    })
  }

  const clearAll = () => {
    setAnnotations([])
    const ann = annRef.current
    if (ann) ann.getContext('2d')!.clearRect(0, 0, ann.width, ann.height)
  }

  const handleSave = () => {
    // Flatten bg + ann into final image
    const flat = document.createElement('canvas')
    flat.width = size.w; flat.height = size.h
    const ctx = flat.getContext('2d')!
    const bg  = bgRef.current
    const ann = annRef.current
    if (bg)  ctx.drawImage(bg, 0, 0)
    if (ann) ctx.drawImage(ann, 0, 0)
    onSave(flat.toDataURL('image/jpeg', 0.92), annotations, caption, keepOriginal)
  }

  const cursor = activeTool === 'crop' ? 'crosshair' : 'crosshair'

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:1000, display:'flex', flexDirection:'column' }}>
      {/* Toolbar */}
      <div style={{ background:'#111', padding:'8px 12px', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', borderBottom:'1px solid #333', flexShrink:0 }}>
        <div style={{ display:'flex', gap:3 }}>
          {TOOLS.map(tool => (
            <button key={tool.value} onClick={() => setActiveTool(tool.value)} title={tool.label}
              style={{ padding:'6px 9px', borderRadius:6, border:'none', cursor:'pointer', fontSize:15, fontFamily:'DM Sans',
                background: activeTool===tool.value ? '#1B6EB5' : '#222',
                color: activeTool===tool.value ? '#fff' : '#aaa' }}>
              {tool.icon}
            </button>
          ))}
        </div>
        <div style={{ width:1, height:26, background:'#333' }} />
        <div style={{ display:'flex', gap:4 }}>
          {COLORS.map(col => (
            <button key={col.value} onClick={() => setActiveColor(col.value)} title={col.label}
              style={{ width:22, height:22, borderRadius:'50%', border: activeColor===col.value ? '3px solid #fff' : '2px solid #555',
                background:col.value, cursor:'pointer' }} />
          ))}
        </div>
        <div style={{ width:1, height:26, background:'#333' }} />
        <input type="range" min={1} max={8} value={strokeWidth} onChange={e => setStrokeWidth(+e.target.value)} style={{ width:65, accentColor:'#1B6EB5' }} />
        <div style={{ marginLeft:'auto', display:'flex', gap:5 }}>
          <button onClick={undo} style={{ padding:'5px 9px', borderRadius:6, border:'1px solid #444', background:'transparent', color:'#ccc', cursor:'pointer', fontSize:12 }}>↩</button>
          <button onClick={clearAll} style={{ padding:'5px 9px', borderRadius:6, border:'1px solid #444', background:'transparent', color:'#f44', cursor:'pointer', fontSize:12 }}>✕</button>
          {cropRect && cropRect.w>10 && cropRect.h>10 && (
            <button onClick={applyCrop} style={{ padding:'5px 12px', borderRadius:6, border:'none', background:'#1B6EB5', color:'#fff', cursor:'pointer', fontSize:12, fontWeight:700 }}>✂ Crop</button>
          )}
        </div>
      </div>

      {/* Canvas stack */}
      <div ref={containerRef} style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', padding:12 }}>
        <div style={{ position:'relative', width:size.w, height:size.h }}>
          <canvas ref={bgRef} width={size.w} height={size.h} style={{ position:'absolute', top:0, left:0, borderRadius:4 }} />
          <canvas ref={annRef} width={size.w} height={size.h} style={{ position:'absolute', top:0, left:0 }} />
          <canvas ref={overlayRef} width={size.w} height={size.h} style={{ position:'absolute', top:0, left:0, cursor }}
            onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
            onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp} />
        </div>
      </div>

      {/* Text input */}
      {textPosition && (
        <div style={{ background:'#1a1a1a', padding:'8px 12px', display:'flex', gap:8, borderTop:'1px solid #333' }}>
          <input value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Type text..." autoFocus
            onKeyDown={e => e.key==='Enter' && addTextAnnotation()}
            style={{ flex:1, background:'#111', color:'#fff', border:'1px solid #444', borderRadius:6, padding:'6px 10px', fontFamily:'DM Sans', fontSize:14 }} />
          <button onClick={addTextAnnotation} style={{ padding:'6px 14px', borderRadius:6, border:'none', background:'#1B6EB5', color:'#fff', cursor:'pointer' }}>Add</button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ background:'#111', padding:'10px 14px', display:'flex', alignItems:'center', gap:10, borderTop:'1px solid #333', flexShrink:0 }}>
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption (optional)"
          style={{ flex:1, background:'#1a1a1a', color:'#eee', border:'1px solid #333', borderRadius:6, padding:'7px 10px', fontFamily:'DM Sans', fontSize:13 }} />
        <label style={{ display:'flex', alignItems:'center', gap:5, color:'#aaa', fontSize:12, cursor:'pointer', whiteSpace:'nowrap' }}>
          <input type="checkbox" checked={keepOriginal} onChange={e => setKeepOriginal(e.target.checked)} />
          Keep original
        </label>
        <button onClick={onCancel} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid #555', background:'transparent', color:'#ccc', cursor:'pointer', fontSize:13 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'#C5001A', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:600 }}>Save</button>
      </div>
    </div>
  )
}
