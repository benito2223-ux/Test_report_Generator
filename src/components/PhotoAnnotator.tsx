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
  { value: 'arrow', icon: '↗', label: 'Arrow' },
  { value: 'curved_arrow', icon: '↝', label: 'Curved arrow' },
  { value: 'rectangle', icon: '▭', label: 'Rectangle' },
  { value: 'circle', icon: '○', label: 'Circle' },
  { value: 'freehand', icon: '✏', label: 'Freehand' },
  { value: 'text', icon: 'T', label: 'Text' },
  { value: 'crop', icon: '⊡', label: 'Crop' },
]

export default function PhotoAnnotator({ photo, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const [activeTool, setActiveTool] = useState<AnnotationTool>('arrow')
  const [activeColor, setActiveColor] = useState<AnnotationColor>('#E53935')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [annotations, setAnnotations] = useState<Annotation[]>(photo.annotations || [])
  const [caption, setCaption] = useState(photo.caption || '')
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [startPoint, setStartPoint] = useState<Point | null>(null)
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState<Point | null>(null)
  const [keepOriginal, setKeepOriginal] = useState(true)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  // Crop state
  const [cropStart, setCropStart] = useState<Point | null>(null)
  const [cropRect, setCropRect] = useState<{x:number,y:number,w:number,h:number} | null>(null)
  const [isCropping, setIsCropping] = useState(false)

  // Load image and set canvas size
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      const container = containerRef.current
      if (!container) return
      const maxW = container.clientWidth
      const maxH = window.innerHeight * 0.5
      const ratio = Math.min(maxW / img.width, maxH / img.height)
      const w = Math.floor(img.width * ratio)
      const h = Math.floor(img.height * ratio)
      setCanvasSize({ w, h })
    }
    img.src = photo.originalBase64
  }, [photo.originalBase64])

  // Redraw all annotations
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const overlay = overlayRef.current
    const img = imgRef.current
    if (!canvas || !overlay || !img || canvasSize.w === 0) return

    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    annotations.forEach(ann => drawAnnotation(ctx, ann))

    const octx = overlay.getContext('2d')!
    octx.clearRect(0, 0, overlay.width, overlay.height)
  }, [annotations, canvasSize])

  useEffect(() => { redraw() }, [redraw])

  const drawAnnotation = (ctx: CanvasRenderingContext2D, ann: Annotation) => {
    ctx.save()
    ctx.strokeStyle = ann.color
    ctx.fillStyle = ann.color
    ctx.lineWidth = ann.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

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
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()
        // arrowhead
        const angle = Math.atan2(end.y - start.y, end.x - start.x)
        const headLen = 12 + ann.strokeWidth * 2
        ctx.beginPath()
        ctx.moveTo(end.x, end.y)
        ctx.lineTo(end.x - headLen * Math.cos(angle - 0.4), end.y - headLen * Math.sin(angle - 0.4))
        ctx.lineTo(end.x - headLen * Math.cos(angle + 0.4), end.y - headLen * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'curved_arrow': {
        if (!ann.points || ann.points.length < 3) break
        const [p0, cp, p1] = ann.points
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y)
        ctx.stroke()
        // arrowhead at end
        const dx = p1.x - cp.x, dy = p1.y - cp.y
        const angle = Math.atan2(dy, dx)
        const headLen = 12 + ann.strokeWidth * 2
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p1.x - headLen * Math.cos(angle - 0.4), p1.y - headLen * Math.sin(angle - 0.4))
        ctx.lineTo(p1.x - headLen * Math.cos(angle + 0.4), p1.y - headLen * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'rectangle': {
        if (!ann.start || !ann.end) break
        const { start, end } = ann
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y)
        break
      }

      case 'circle': {
        if (!ann.start || !ann.end) break
        const { start, end } = ann
        const rx = (end.x - start.x) / 2
        const ry = (end.y - start.y) / 2
        ctx.beginPath()
        ctx.ellipse(start.x + rx, start.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI)
        ctx.stroke()
        break
      }

      case 'text':
        if (!ann.text || !ann.start) break
        ctx.font = `${ann.fontSize || 16}px 'DM Sans', sans-serif`
        ctx.fillStyle = ann.color
        // text shadow for readability
        ctx.shadowColor = ann.color === '#FFFFFF' ? '#000' : '#fff'
        ctx.shadowBlur = 3
        ctx.fillText(ann.text, ann.start.x, ann.start.y)
        ctx.shadowBlur = 0
        break
    }
    ctx.restore()
  }

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = overlayRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    if (activeTool === 'text') { setTextPosition(pos); return }
    if (activeTool === 'crop') {
      setCropStart(pos)
      setCropRect(null)
      setIsCropping(true)
      return
    }
    setIsDrawing(true)
    setStartPoint(pos)
    setCurrentPoints([pos])
  }

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (activeTool === 'crop' && isCropping && cropStart) {
      const pos = getPos(e)
      const x = Math.min(cropStart.x, pos.x)
      const y = Math.min(cropStart.y, pos.y)
      const w = Math.abs(pos.x - cropStart.x)
      const h = Math.abs(pos.y - cropStart.y)
      setCropRect({ x, y, w, h })
      // Draw crop overlay
      const overlay = overlayRef.current
      if (overlay) {
        const ctx = overlay.getContext('2d')!
        ctx.clearRect(0, 0, overlay.width, overlay.height)
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(0, 0, overlay.width, overlay.height)
        ctx.clearRect(x, y, w, h)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 3])
        ctx.strokeRect(x, y, w, h)
        ctx.setLineDash([])
        // Resize handles
        const handles = [[x,y],[x+w/2,y],[x+w,y],[x+w,y+h/2],[x+w,y+h],[x+w/2,y+h],[x,y+h],[x,y+h/2]]
        handles.forEach(([hx,hy]) => {
          ctx.fillStyle = '#fff'
          ctx.fillRect(hx-4, hy-4, 8, 8)
        })
      }
      return
    }
    if (!isDrawing) return
    const pos = getPos(e)
    const overlay = overlayRef.current
    if (!overlay) return
    const ctx = overlay.getContext('2d')!
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    ctx.strokeStyle = activeColor
    ctx.fillStyle = activeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (activeTool === 'freehand') {
      setCurrentPoints(prev => [...prev, pos])
      const pts = [...currentPoints, pos]
      if (pts.length > 1) {
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        pts.forEach(p => ctx.lineTo(p.x, p.y))
        ctx.stroke()
      }
    } else if (startPoint) {
      // preview shape
      if (activeTool === 'arrow') {
        ctx.beginPath()
        ctx.moveTo(startPoint.x, startPoint.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
        const angle = Math.atan2(pos.y - startPoint.y, pos.x - startPoint.x)
        const headLen = 12 + strokeWidth * 2
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(pos.x - headLen * Math.cos(angle - 0.4), pos.y - headLen * Math.sin(angle - 0.4))
        ctx.lineTo(pos.x - headLen * Math.cos(angle + 0.4), pos.y - headLen * Math.sin(angle + 0.4))
        ctx.closePath()
        ctx.fill()
      } else if (activeTool === 'curved_arrow') {
        const mx = (startPoint.x + pos.x) / 2 - (pos.y - startPoint.y) * 0.3
        const my = (startPoint.y + pos.y) / 2 + (pos.x - startPoint.x) * 0.3
        ctx.beginPath()
        ctx.moveTo(startPoint.x, startPoint.y)
        ctx.quadraticCurveTo(mx, my, pos.x, pos.y)
        ctx.stroke()
      } else if (activeTool === 'rectangle') {
        ctx.strokeRect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y)
      } else if (activeTool === 'circle') {
        const rx = (pos.x - startPoint.x) / 2
        const ry = (pos.y - startPoint.y) / 2
        ctx.beginPath()
        ctx.ellipse(startPoint.x + rx, startPoint.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI)
        ctx.stroke()
      }
    }
  }

  const applyCrop = () => {
    if (!cropRect || !canvasRef.current || !imgRef.current) return
    const canvas = canvasRef.current
    const { x, y, w, h } = cropRect
    if (w < 10 || h < 10) return
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = w
    tempCanvas.height = h
    const ctx = tempCanvas.getContext('2d')!
    ctx.drawImage(canvas, x, y, w, h, 0, 0, w, h)
    // Redraw main canvas with cropped image
    canvas.width = w
    canvas.height = h
    const mainCtx = canvas.getContext('2d')!
    mainCtx.drawImage(tempCanvas, 0, 0)
    // Update canvas size state
    setCanvasSize({ w, h })
    // Update imgRef to cropped version
    const croppedImg = new Image()
    croppedImg.onload = () => { imgRef.current = croppedImg }
    croppedImg.src = tempCanvas.toDataURL('image/jpeg', 0.95)
    // Clear overlay and crop state
    const overlay = overlayRef.current
    if (overlay) {
      overlay.width = w
      overlay.height = h
      overlay.getContext('2d')!.clearRect(0, 0, w, h)
    }
    setCropRect(null)
    setCropStart(null)
    setIsCropping(false)
    setAnnotations([]) // reset annotations after crop
  }

  const onPointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (activeTool === 'crop') {
      setIsCropping(false)
      return
    }
    if (!isDrawing) return
    const pos = getPos(e)
    setIsDrawing(false)

    let newAnn: Annotation | null = null

    if (activeTool === 'freehand') {
      const pts = [...currentPoints, pos]
      if (pts.length > 1) {
        newAnn = { id: uuidv4(), tool: 'freehand', color: activeColor, strokeWidth, points: pts }
      }
    } else if (startPoint) {
      if (activeTool === 'arrow') {
        newAnn = { id: uuidv4(), tool: 'arrow', color: activeColor, strokeWidth, start: startPoint, end: pos }
      } else if (activeTool === 'curved_arrow') {
        const mx = (startPoint.x + pos.x) / 2 - (pos.y - startPoint.y) * 0.3
        const my = (startPoint.y + pos.y) / 2 + (pos.x - startPoint.x) * 0.3
        newAnn = { id: uuidv4(), tool: 'curved_arrow', color: activeColor, strokeWidth, points: [startPoint, { x: mx, y: my }, pos] }
      } else if (activeTool === 'rectangle') {
        newAnn = { id: uuidv4(), tool: 'rectangle', color: activeColor, strokeWidth, start: startPoint, end: pos }
      } else if (activeTool === 'circle') {
        newAnn = { id: uuidv4(), tool: 'circle', color: activeColor, strokeWidth, start: startPoint, end: pos }
      }
    }

    if (newAnn) {
      setAnnotations(prev => [...prev, newAnn!])
    }
    setCurrentPoints([])
    setStartPoint(null)
    const overlay = overlayRef.current
    if (overlay) overlay.getContext('2d')!.clearRect(0, 0, overlay.width, overlay.height)
  }

  const addTextAnnotation = () => {
    if (!textPosition || !textInput.trim()) return
    const ann: Annotation = {
      id: uuidv4(), tool: 'text', color: activeColor, strokeWidth,
      start: textPosition, text: textInput, fontSize: 16 + strokeWidth * 2,
    }
    setAnnotations(prev => [...prev, ann])
    setTextInput('')
    setTextPosition(null)
  }

  const undo = () => setAnnotations(prev => prev.slice(0, -1))
  const clearAll = () => setAnnotations([])

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    onSave(dataUrl, annotations, caption, keepOriginal)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      {/* Top toolbar */}
      <div style={{ background: '#111', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#aaa', fontSize: 12, fontFamily: 'DM Sans', marginRight: 4 }}>Outil</span>
        {TOOLS.map(t => (
          <button key={t.value} onClick={() => setActiveTool(t.value)}
            title={t.label}
            style={{
              width: 36, height: 36, borderRadius: 6, border: activeTool === t.value ? '2px solid #C5001A' : '1px solid #444',
              background: activeTool === t.value ? '#1a0003' : 'transparent',
              color: activeTool === t.value ? '#ff4d4d' : '#ccc',
              cursor: 'pointer', fontSize: 14, fontFamily: 'DM Sans',
            }}>{t.icon}</button>
        ))}
        <div style={{ width: 1, height: 28, background: '#333', margin: '0 4px' }} />
        {COLORS.map(c => (
          <button key={c.value} onClick={() => setActiveColor(c.value)}
            title={c.label}
            style={{
              width: 24, height: 24, borderRadius: '50%', background: c.value,
              border: activeColor === c.value ? '3px solid #C5001A' : '2px solid #555',
              cursor: 'pointer',
            }} />
        ))}
        <div style={{ width: 1, height: 28, background: '#333', margin: '0 4px' }} />
        <span style={{ color: '#aaa', fontSize: 11 }}>Épaisseur</span>
        <input type="range" min={1} max={8} value={strokeWidth} step={1}
          onChange={e => setStrokeWidth(Number(e.target.value))}
          style={{ width: 60 }} />
        <span style={{ color: '#ccc', fontSize: 12, minWidth: 16 }}>{strokeWidth}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={undo} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 12 }}>↩ Undo</button>
          {cropRect && cropRect.w > 10 && cropRect.h > 10 && (
            <button onClick={applyCrop} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: '#1B6EB5', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              ✂ Apply Crop
            </button>
          )}
          <button onClick={clearAll} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #444', background: 'transparent', color: '#f66', cursor: 'pointer', fontSize: 12 }}>Tout effacer</button>
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' }}>
        {canvasSize.w > 0 && (
          <div style={{ position: 'relative', width: canvasSize.w, height: canvasSize.h }}>
            <canvas ref={canvasRef} width={canvasSize.w} height={canvasSize.h}
              style={{ position: 'absolute', top: 0, left: 0, borderRadius: 4 }} />
            <canvas ref={overlayRef} width={canvasSize.w} height={canvasSize.h}
              style={{ position: 'absolute', top: 0, left: 0, cursor: activeTool === 'text' ? 'text' : 'crosshair', touchAction: 'none' }}
              onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
              onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp} />
            {textPosition && (
              <div style={{ position: 'absolute', top: textPosition.y, left: textPosition.x, zIndex: 10 }}>
                <input autoFocus value={textInput} onChange={e => setTextInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTextAnnotation() }}
                  placeholder="Texte... (Entrée pour valider)"
                  style={{ background: 'rgba(0,0,0,0.7)', color: activeColor, border: `1px solid ${activeColor}`, padding: '4px 8px', borderRadius: 4, fontSize: 14, outline: 'none', minWidth: 160 }} />
                <button onClick={addTextAnnotation} style={{ marginLeft: 4, padding: '4px 8px', background: '#C5001A', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>OK</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ background: '#111', padding: '10px 14px', borderTop: '1px solid #333', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#aaa', fontSize: 12, flexShrink: 0 }}>Légende</span>
          <input value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Description de la photo..."
            style={{ flex: 1, background: '#1a1a1a', color: '#eee', border: '1px solid #444', padding: '6px 10px', borderRadius: 6, fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa', fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={keepOriginal} onChange={e => setKeepOriginal(e.target.checked)} />
            Conserver photo originale
          </label>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #555', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#C5001A', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
