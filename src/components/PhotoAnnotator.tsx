import { useRef, useState, useEffect, useCallback } from 'react'
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
  { value: 'rectangle',   icon: '▭', label: 'Rectangle' },
  { value: 'circle',      icon: '○', label: 'Circle' },
  { value: 'freehand',    icon: '✏', label: 'Freehand' },
  { value: 'text',        icon: 'T', label: 'Text' },
  { value: 'crop',        icon: '⊡', label: 'Crop' },
]

export default function PhotoAnnotator({ photo, onSave, onCancel }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef     = useRef<HTMLImageElement | null>(null)
  // Store the "base" image data (original + committed annotations baked in)
  const baseDataRef = useRef<ImageData | null>(null)

  const [activeTool,   setActiveTool]   = useState<AnnotationTool>('arrow')
  const [activeColor,  setActiveColor]  = useState<AnnotationColor>('#E53935')
  const [strokeWidth,  setStrokeWidth]  = useState(3)
  const [annotations,  setAnnotations]  = useState<Annotation[]>(photo.annotations || [])
  const [caption,      setCaption]      = useState(photo.caption || '')
  const [isDrawing,    setIsDrawing]    = useState(false)
  const [currentPoints,setCurrentPoints] = useState<Point[]>([])
  const [startPoint,   setStartPoint]   = useState<Point | null>(null)
  const [textInput,    setTextInput]    = useState('')
  const [textPosition, setTextPosition] = useState<Point | null>(null)
  const [keepOriginal, setKeepOriginal] = useState(true)
  const [canvasSize,   setCanvasSize]   = useState({ w: 0, h: 0 })

  // Crop state
  const [cropStart, setCropStart] = useState<Point | null>(null)
  const [cropRect,  setCropRect]  = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isCropping,setIsCropping] = useState(false)

  // ── Draw one annotation onto a context ───────────────────────────────
  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
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
        const { start, end } = ann
        ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke()
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const hl = 14 + ann.strokeWidth * 2
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(end.x - hl * Math.cos(angle - 0.4), end.y - hl * Math.sin(angle - 0.4))
        ctx.lineTo(end.x - hl * Math.cos(angle + 0.4), end.y - hl * Math.sin(angle + 0.4))
        ctx.closePath(); ctx.fill()
        break
      }

      case 'curved_arrow': {
        if (!ann.points || ann.points.length < 3) break
        const [p0, cp, p1] = ann.points
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y); ctx.stroke()
        // Arrowhead tangent at end of curve
        const t = 0.99
        const tx = 2*(1-t)*(cp.x-p0.x) + 2*t*(p1.x-cp.x)
        const ty = 2*(1-t)*(cp.y-p0.y) + 2*t*(p1.y-cp.y)
        const angle = Math.atan2(ty, tx)
        const hl = 14 + ann.strokeWidth * 2
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p1.x - hl * Math.cos(angle - 0.4), p1.y - hl * Math.sin(angle - 0.4))
        ctx.lineTo(p1.x - hl * Math.cos(angle + 0.4), p1.y - hl * Math.sin(angle + 0.4))
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
        ctx.ellipse(ann.start.x + rx, ann.start.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI)
        ctx.stroke()
        break
      }

      case 'text':
        if (!ann.text || !ann.start) break
        ctx.font = `bold ${ann.fontSize || 18}px 'DM Sans', sans-serif`
        ctx.shadowColor = ann.color === '#FFFFFF' ? '#000' : '#fff'
        ctx.shadowBlur = 4
        ctx.fillText(ann.text, ann.start.x, ann.start.y)
        break
    }
    ctx.restore()
  }

  // ── Full redraw: image + all committed annotations ────────────────────
  const redraw = useCallback((anns: Annotation[]) => {
    const canvas = canvasRef.current
    const img    = imgRef.current
    if (!canvas || !img || canvasSize.w === 0) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    anns.forEach(ann => drawAnnotation(ctx, ann))
  }, [canvasSize])

  useEffect(() => { redraw(annotations) }, [annotations, redraw])

  // ── Load image ────────────────────────────────────────────────────────
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const container = containerRef.current
      if (!container) return
      const maxW = container.clientWidth
      const maxH = window.innerHeight * 0.55
      const ratio = Math.min(maxW / img.width, maxH / img.height)
      const w = Math.floor(img.width  * ratio)
      const h = Math.floor(img.height * ratio)
      setCanvasSize({ w, h })
    }
    img.src = photo.originalBase64
  }, [photo.originalBase64])

  // ── Pointer helpers ───────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = overlayRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  // ── Pointer down ──────────────────────────────────────────────────────
  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    if (activeTool === 'text') { setTextPosition(pos); return }
    if (activeTool === 'crop') { setCropStart(pos); setCropRect(null); setIsCropping(true); return }
    setIsDrawing(true)
    setStartPoint(pos)
    setCurrentPoints([pos])
  }

  // ── Pointer move ──────────────────────────────────────────────────────
  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()

    // Crop overlay
    if (activeTool === 'crop' && isCropping && cropStart) {
      const pos = getPos(e)
      // Compute rect preserving free crop (no ratio lock on selection)
      const x = Math.min(cropStart.x, pos.x)
      const y = Math.min(cropStart.y, pos.y)
      const w = Math.abs(pos.x - cropStart.x)
      const h = Math.abs(pos.y - cropStart.y)
      setCropRect({ x, y, w, h })
      const overlay = overlayRef.current
      if (overlay) {
        const ctx = overlay.getContext('2d')!
        ctx.clearRect(0, 0, overlay.width, overlay.height)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(0, 0, overlay.width, overlay.height)
        ctx.clearRect(x, y, w, h)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(x, y, w, h)
        ctx.setLineDash([])
        // Corner handles
        ;([[x,y],[x+w,y],[x,y+h],[x+w,y+h]] as [number,number][]).forEach(([hx,hy]) => {
          ctx.fillStyle = '#fff'
          ctx.fillRect(hx-5, hy-5, 10, 10)
        })
      }
      return
    }

    if (!isDrawing) return
    const pos = getPos(e)

    // Live preview on overlay — first restore committed state
    const overlay = overlayRef.current
    if (!overlay) return
    const octx = overlay.getContext('2d')!
    octx.clearRect(0, 0, overlay.width, overlay.height)
    octx.strokeStyle = activeColor
    octx.fillStyle   = activeColor
    octx.lineWidth   = strokeWidth
    octx.lineCap     = 'round'
    octx.lineJoin    = 'round'

    if (activeTool === 'freehand') {
      setCurrentPoints(prev => [...prev, pos])
      const pts = [...currentPoints, pos]
      if (pts.length > 1) {
        octx.beginPath(); octx.moveTo(pts[0].x, pts[0].y)
        pts.forEach(p => octx.lineTo(p.x, p.y)); octx.stroke()
      }
    } else if (startPoint) {
      if (activeTool === 'arrow') {
        octx.beginPath(); octx.moveTo(startPoint.x, startPoint.y); octx.lineTo(pos.x, pos.y); octx.stroke()
        const angle = Math.atan2(pos.y - startPoint.y, pos.x - startPoint.x)
        const hl = 14 + strokeWidth * 2
        octx.beginPath(); octx.moveTo(pos.x, pos.y)
        octx.lineTo(pos.x - hl * Math.cos(angle-0.4), pos.y - hl * Math.sin(angle-0.4))
        octx.lineTo(pos.x - hl * Math.cos(angle+0.4), pos.y - hl * Math.sin(angle+0.4))
        octx.closePath(); octx.fill()
      } else if (activeTool === 'curved_arrow') {
        const mx = (startPoint.x+pos.x)/2 - (pos.y-startPoint.y)*0.35
        const my = (startPoint.y+pos.y)/2 + (pos.x-startPoint.x)*0.35
        octx.beginPath(); octx.moveTo(startPoint.x, startPoint.y)
        octx.quadraticCurveTo(mx, my, pos.x, pos.y); octx.stroke()
        // Arrowhead
        const t = 0.99
        const tx2 = 2*(1-t)*(mx-startPoint.x)+2*t*(pos.x-mx)
        const ty2 = 2*(1-t)*(my-startPoint.y)+2*t*(pos.y-my)
        const angle = Math.atan2(ty2, tx2)
        const hl = 14 + strokeWidth * 2
        octx.beginPath(); octx.moveTo(pos.x, pos.y)
        octx.lineTo(pos.x - hl*Math.cos(angle-0.4), pos.y - hl*Math.sin(angle-0.4))
        octx.lineTo(pos.x - hl*Math.cos(angle+0.4), pos.y - hl*Math.sin(angle+0.4))
        octx.closePath(); octx.fill()
      } else if (activeTool === 'rectangle') {
        octx.strokeRect(startPoint.x, startPoint.y, pos.x-startPoint.x, pos.y-startPoint.y)
      } else if (activeTool === 'circle') {
        const rx = (pos.x-startPoint.x)/2, ry = (pos.y-startPoint.y)/2
        octx.beginPath()
        octx.ellipse(startPoint.x+rx, startPoint.y+ry, Math.abs(rx), Math.abs(ry), 0, 0, 2*Math.PI)
        octx.stroke()
      }
    }
  }

  // ── Pointer up ────────────────────────────────────────────────────────
  const onPointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (activeTool === 'crop') { setIsCropping(false); return }
    if (!isDrawing) return
    const pos = getPos(e)
    setIsDrawing(false)

    let newAnn: Annotation | null = null
    if (activeTool === 'freehand') {
      const pts = [...currentPoints, pos]
      if (pts.length > 1) newAnn = { id: uuidv4(), tool: 'freehand', color: activeColor, strokeWidth, points: pts }
    } else if (startPoint) {
      if (activeTool === 'arrow') {
        newAnn = { id: uuidv4(), tool: 'arrow', color: activeColor, strokeWidth, start: startPoint, end: pos }
      } else if (activeTool === 'curved_arrow') {
        const mx = (startPoint.x+pos.x)/2 - (pos.y-startPoint.y)*0.35
        const my = (startPoint.y+pos.y)/2 + (pos.x-startPoint.x)*0.35
        newAnn = { id: uuidv4(), tool: 'curved_arrow', color: activeColor, strokeWidth, points: [startPoint, {x:mx,y:my}, pos] }
      } else if (activeTool === 'rectangle') {
        newAnn = { id: uuidv4(), tool: 'rectangle', color: activeColor, strokeWidth, start: startPoint, end: pos }
      } else if (activeTool === 'circle') {
        newAnn = { id: uuidv4(), tool: 'circle', color: activeColor, strokeWidth, start: startPoint, end: pos }
      }
    }

    if (newAnn) {
      // Immediately bake annotation into canvas then update state
      const canvas = canvasRef.current
      if (canvas) drawAnnotation(canvas.getContext('2d')!, newAnn)
      setAnnotations(prev => [...prev, newAnn!])
    }

    setCurrentPoints([])
    setStartPoint(null)
    // Clear overlay
    const overlay = overlayRef.current
    if (overlay) overlay.getContext('2d')!.clearRect(0, 0, overlay.width, overlay.height)
  }

  // ── Apply crop ────────────────────────────────────────────────────────
  const applyCrop = () => {
    if (!cropRect || !canvasRef.current) return
    const { x, y, w, h } = cropRect
    if (w < 10 || h < 10) return
    const canvas = canvasRef.current

    // Capture current canvas pixels (image + annotations) in crop rect
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width  = w
    tempCanvas.height = h
    const tctx = tempCanvas.getContext('2d')!
    tctx.drawImage(canvas, x, y, w, h, 0, 0, w, h)

    // Resize main canvas
    canvas.width  = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(tempCanvas, 0, 0)

    // Update imgRef so future redraws use cropped image
    const croppedImg = new Image()
    croppedImg.onload = () => { imgRef.current = croppedImg }
    croppedImg.src = tempCanvas.toDataURL('image/jpeg', 0.95)

    // Resize overlay
    const overlay = overlayRef.current
    if (overlay) { overlay.width = w; overlay.height = h; overlay.getContext('2d')!.clearRect(0,0,w,h) }

    setCanvasSize({ w, h })
    setAnnotations([])
    setCropRect(null)
    setCropStart(null)
    setIsCropping(false)
  }

  const addTextAnnotation = () => {
    if (!textPosition || !textInput.trim()) return
    const ann: Annotation = { id: uuidv4(), tool: 'text', color: activeColor, strokeWidth, start: textPosition, text: textInput, fontSize: 16 + strokeWidth * 2 }
    setAnnotations(prev => [...prev, ann])
    setTextInput('')
    setTextPosition(null)
  }

  const undo = () => setAnnotations(prev => prev.slice(0, -1))
  const clearAll = () => setAnnotations([])

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Bake final state
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    onSave(dataUrl, annotations, caption, keepOriginal)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div style={{ background: '#111', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid #333', flexShrink: 0 }}>
        {/* Tools */}
        <div style={{ display: 'flex', gap: 4 }}>
          {TOOLS.map(tool => (
            <button key={tool.value} onClick={() => setActiveTool(tool.value)}
              title={tool.label}
              style={{ padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'DM Sans', fontSize: 16,
                background: activeTool === tool.value ? '#1B6EB5' : '#222', color: activeTool === tool.value ? '#fff' : '#aaa' }}>
              {tool.icon}
            </button>
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: '#333' }} />

        {/* Colors */}
        <div style={{ display: 'flex', gap: 4 }}>
          {COLORS.map(col => (
            <button key={col.value} onClick={() => setActiveColor(col.value)} title={col.label}
              style={{ width: 24, height: 24, borderRadius: '50%', border: activeColor === col.value ? '3px solid #fff' : '2px solid #555',
                background: col.value, cursor: 'pointer' }} />
          ))}
        </div>

        <div style={{ width: 1, height: 28, background: '#333' }} />

        {/* Stroke */}
        <input type="range" min={1} max={8} value={strokeWidth} onChange={e => setStrokeWidth(+e.target.value)}
          style={{ width: 70, accentColor: '#1B6EB5' }} />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={undo} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #444', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 12 }}>↩ Undo</button>
          <button onClick={clearAll} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #444', background: 'transparent', color: '#f44', cursor: 'pointer', fontSize: 12 }}>✕ Clear</button>
          {cropRect && cropRect.w > 10 && cropRect.h > 10 && (
            <button onClick={applyCrop} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#1B6EB5', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
              ✂ Apply Crop
            </button>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 }}>
        <div style={{ position: 'relative', width: canvasSize.w, height: canvasSize.h }}>
          <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h}
            style={{ position: 'absolute', top: 0, left: 0, borderRadius: 4 }} />
          <canvas ref={overlayRef} width={canvasSize.w} height={canvasSize.h}
            style={{ position: 'absolute', top: 0, left: 0, cursor: activeTool === 'crop' ? 'crosshair' : 'crosshair' }}
            onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
            onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp} />
        </div>
      </div>

      {/* Text input */}
      {textPosition && (
        <div style={{ background: '#1a1a1a', padding: '8px 12px', display: 'flex', gap: 8, borderTop: '1px solid #333' }}>
          <input value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Type text..." autoFocus
            onKeyDown={e => e.key === 'Enter' && addTextAnnotation()}
            style={{ flex: 1, background: '#111', color: '#fff', border: '1px solid #444', borderRadius: 6, padding: '6px 10px', fontFamily: 'DM Sans', fontSize: 14 }} />
          <button onClick={addTextAnnotation} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#1B6EB5', color: '#fff', cursor: 'pointer' }}>Add</button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ background: '#111', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid #333', flexShrink: 0 }}>
        <input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Caption (optional)"
          style={{ flex: 1, background: '#1a1a1a', color: '#eee', border: '1px solid #333', borderRadius: 6, padding: '7px 10px', fontFamily: 'DM Sans', fontSize: 13 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={keepOriginal} onChange={e => setKeepOriginal(e.target.checked)} />
          Keep original
        </label>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#C5001A', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Save</button>
      </div>
    </div>
  )
}
