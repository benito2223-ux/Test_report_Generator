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
  { value: 'rectangle',   icon: '▭', label: 'Rect' },
  { value: 'circle',      icon: '○', label: 'Circle' },
  { value: 'freehand',    icon: '✏', label: 'Draw' },
  { value: 'text',        icon: 'T',  label: 'Text' },
  { value: 'crop',        icon: '⊡', label: 'Crop' },
]

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
      ctx.beginPath(); ctx.moveTo(ann.points[0].x, ann.points[0].y)
      ann.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke()
      break
    case 'arrow': {
      if (!ann.start || !ann.end) break
      ctx.beginPath(); ctx.moveTo(ann.start.x, ann.start.y); ctx.lineTo(ann.end.x, ann.end.y); ctx.stroke()
      const a = Math.atan2(ann.end.y-ann.start.y, ann.end.x-ann.start.x), hl = 14+ann.strokeWidth*2
      ctx.beginPath(); ctx.moveTo(ann.end.x, ann.end.y)
      ctx.lineTo(ann.end.x-hl*Math.cos(a-0.4), ann.end.y-hl*Math.sin(a-0.4))
      ctx.lineTo(ann.end.x-hl*Math.cos(a+0.4), ann.end.y-hl*Math.sin(a+0.4))
      ctx.closePath(); ctx.fill(); break
    }
    case 'curved_arrow': {
      if (!ann.points || ann.points.length < 3) break
      const [p0,cp,p1] = ann.points
      ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.quadraticCurveTo(cp.x,cp.y,p1.x,p1.y); ctx.stroke()
      const t=0.99, tx=2*(1-t)*(cp.x-p0.x)+2*t*(p1.x-cp.x), ty=2*(1-t)*(cp.y-p0.y)+2*t*(p1.y-cp.y)
      const a=Math.atan2(ty,tx), hl=14+ann.strokeWidth*2
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y)
      ctx.lineTo(p1.x-hl*Math.cos(a-0.4),p1.y-hl*Math.sin(a-0.4))
      ctx.lineTo(p1.x-hl*Math.cos(a+0.4),p1.y-hl*Math.sin(a+0.4))
      ctx.closePath(); ctx.fill(); break
    }
    case 'rectangle':
      if (!ann.start||!ann.end) break
      ctx.strokeRect(ann.start.x,ann.start.y,ann.end.x-ann.start.x,ann.end.y-ann.start.y); break
    case 'circle': {
      if (!ann.start||!ann.end) break
      const rx=(ann.end.x-ann.start.x)/2, ry=(ann.end.y-ann.start.y)/2
      ctx.beginPath(); ctx.ellipse(ann.start.x+rx,ann.start.y+ry,Math.abs(rx),Math.abs(ry),0,0,2*Math.PI); ctx.stroke(); break
    }
    case 'text':
      if (!ann.text||!ann.start) break
      ctx.font=`bold ${ann.fontSize||18}px DM Sans,sans-serif`
      ctx.shadowColor=ann.color==='#FFFFFF'?'#000':'#fff'; ctx.shadowBlur=4
      ctx.fillText(ann.text,ann.start.x,ann.start.y); break
  }
  ctx.restore()
}

export default function PhotoAnnotator({ photo, onSave, onCancel }: Props) {
  // Single canvas approach - most reliable on all browsers including iOS WebKit
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Store original image as offscreen canvas - never modified
  const origRef      = useRef<HTMLCanvasElement | null>(null)

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

  // Full redraw: orig image + all annotations
  const redraw = useCallback((anns: Annotation[], cropOverlay?: {x:number,y:number,w:number,h:number}|null) => {
    const canvas = canvasRef.current
    const orig   = origRef.current
    if (!canvas || !orig || canvas.width === 0) return
    const ctx = canvas.getContext('2d')!
    // Draw original image
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(orig, 0, 0, canvas.width, canvas.height)
    // Draw all committed annotations
    anns.forEach(a => drawAnn(ctx, a))
    // Draw crop overlay if active
    if (cropOverlay && cropOverlay.w > 0 && cropOverlay.h > 0) {
      const {x,y,w,h} = cropOverlay
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.clearRect(x, y, w, h)
      // Redraw image in crop area (so it's visible)
      ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip()
      ctx.drawImage(orig, 0, 0, canvas.width, canvas.height)
      anns.forEach(a => drawAnn(ctx, a))
      ctx.restore()
      ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.setLineDash([6,3])
      ctx.strokeRect(x,y,w,h); ctx.setLineDash([])
      ;([[x,y],[x+w,y],[x,y+h],[x+w,y+h]] as [number,number][]).forEach(([hx,hy])=>{
        ctx.fillStyle='#fff'; ctx.fillRect(hx-5,hy-5,10,10)
      })
    }
  }, [])

  // Load image
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const container = containerRef.current
      if (!container) return
      const maxW = container.clientWidth - 24
      const maxH = window.innerHeight * 0.55
      const ratio = Math.min(maxW/img.width, maxH/img.height)
      const w = Math.floor(img.width*ratio)
      const h = Math.floor(img.height*ratio)
      // Store orig as offscreen canvas
      const orig = document.createElement('canvas')
      orig.width = w; orig.height = h
      orig.getContext('2d')!.drawImage(img, 0, 0, w, h)
      origRef.current = orig
      setSize({ w, h })
      // Draw initial state after size set
      setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = w; canvas.height = h
        redraw(photo.annotations || [])
      }, 50)
    }
    img.src = photo.originalBase64
  }, [])

  // Redraw whenever annotations change
  useEffect(() => {
    redraw(annotations, isCropping ? cropRect : null)
  }, [annotations, redraw])

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width/rect.width, scaleY = canvas.height/rect.height
    if ('touches' in e) {
      // On touchend, e.touches is empty — use changedTouches which always has the lifted finger
      const touch = e.touches[0] ?? e.changedTouches[0]
      return { x:(touch.clientX-rect.left)*scaleX, y:(touch.clientY-rect.top)*scaleY }
    }
    return { x:((e as React.MouseEvent).clientX-rect.left)*scaleX, y:((e as React.MouseEvent).clientY-rect.top)*scaleY }
  }

  const onPointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    if (activeTool === 'text') { setTextPosition(pos); return }
    if (activeTool === 'crop') { setCropStart(pos); setCropRect(null); setIsCropping(true); return }
    setIsDrawing(true); setStartPoint(pos); setCurrentPoints([pos])
  }

  const onPointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const pos = getPos(e)

    if (activeTool === 'crop' && isCropping && cropStart) {
      const x=Math.min(cropStart.x,pos.x), y=Math.min(cropStart.y,pos.y)
      const w=Math.abs(pos.x-cropStart.x), h=Math.abs(pos.y-cropStart.y)
      const rect = {x,y,w,h}
      setCropRect(rect)
      redraw(annotations, rect)
      return
    }

    if (!isDrawing) return
    // Live preview: redraw base + annotations + current stroke
    const canvas = canvasRef.current; if (!canvas) return
    const orig = origRef.current; if (!orig) return
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle='#FFFFFF'; ctx.fillRect(0,0,canvas.width,canvas.height)
    ctx.drawImage(orig, 0, 0, canvas.width, canvas.height)
    annotations.forEach(a => drawAnn(ctx, a))

    // Draw current stroke preview
    ctx.strokeStyle=activeColor; ctx.fillStyle=activeColor
    ctx.lineWidth=strokeWidth; ctx.lineCap='round'; ctx.lineJoin='round'

    if (activeTool==='freehand') {
      const pts=[...currentPoints,pos]
      setCurrentPoints(prev=>[...prev,pos])
      if (pts.length>1) {
        ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y)
        pts.forEach(p=>ctx.lineTo(p.x,p.y)); ctx.stroke()
      }
    } else if (startPoint) {
      if (activeTool==='arrow') {
        ctx.beginPath(); ctx.moveTo(startPoint.x,startPoint.y); ctx.lineTo(pos.x,pos.y); ctx.stroke()
        const a=Math.atan2(pos.y-startPoint.y,pos.x-startPoint.x), hl=14+strokeWidth*2
        ctx.beginPath(); ctx.moveTo(pos.x,pos.y)
        ctx.lineTo(pos.x-hl*Math.cos(a-0.4),pos.y-hl*Math.sin(a-0.4))
        ctx.lineTo(pos.x-hl*Math.cos(a+0.4),pos.y-hl*Math.sin(a+0.4))
        ctx.closePath(); ctx.fill()
      } else if (activeTool==='curved_arrow') {
        const mx=(startPoint.x+pos.x)/2-(pos.y-startPoint.y)*0.35
        const my=(startPoint.y+pos.y)/2+(pos.x-startPoint.x)*0.35
        ctx.beginPath(); ctx.moveTo(startPoint.x,startPoint.y)
        ctx.quadraticCurveTo(mx,my,pos.x,pos.y); ctx.stroke()
        const t=0.99, tx=2*(1-t)*(mx-startPoint.x)+2*t*(pos.x-mx), ty=2*(1-t)*(my-startPoint.y)+2*t*(pos.y-my)
        const a=Math.atan2(ty,tx), hl=14+strokeWidth*2
        ctx.beginPath(); ctx.moveTo(pos.x,pos.y)
        ctx.lineTo(pos.x-hl*Math.cos(a-0.4),pos.y-hl*Math.sin(a-0.4))
        ctx.lineTo(pos.x-hl*Math.cos(a+0.4),pos.y-hl*Math.sin(a+0.4))
        ctx.closePath(); ctx.fill()
      } else if (activeTool==='rectangle') {
        ctx.strokeRect(startPoint.x,startPoint.y,pos.x-startPoint.x,pos.y-startPoint.y)
      } else if (activeTool==='circle') {
        const rx=(pos.x-startPoint.x)/2, ry=(pos.y-startPoint.y)/2
        ctx.beginPath(); ctx.ellipse(startPoint.x+rx,startPoint.y+ry,Math.abs(rx),Math.abs(ry),0,0,2*Math.PI); ctx.stroke()
      }
    }
  }

  const onPointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (activeTool==='crop') { setIsCropping(false); return }
    if (!isDrawing) return
    const pos = getPos(e)
    setIsDrawing(false)

    let newAnn: Annotation | null = null
    if (activeTool==='freehand') {
      const pts=[...currentPoints,pos]
      if (pts.length>1) newAnn={id:uuidv4(),tool:'freehand',color:activeColor,strokeWidth,points:pts}
    } else if (startPoint) {
      if (activeTool==='arrow') newAnn={id:uuidv4(),tool:'arrow',color:activeColor,strokeWidth,start:startPoint,end:pos}
      else if (activeTool==='curved_arrow') {
        const mx=(startPoint.x+pos.x)/2-(pos.y-startPoint.y)*0.35
        const my=(startPoint.y+pos.y)/2+(pos.x-startPoint.x)*0.35
        newAnn={id:uuidv4(),tool:'curved_arrow',color:activeColor,strokeWidth,points:[startPoint,{x:mx,y:my},pos]}
      } else if (activeTool==='rectangle') newAnn={id:uuidv4(),tool:'rectangle',color:activeColor,strokeWidth,start:startPoint,end:pos}
      else if (activeTool==='circle') newAnn={id:uuidv4(),tool:'circle',color:activeColor,strokeWidth,start:startPoint,end:pos}
    }

    const nextAnns = newAnn ? [...annotations, newAnn] : annotations
    setAnnotations(nextAnns)
    // Immediately redraw with new annotations list (don't wait for useEffect)
    redraw(nextAnns)
    setCurrentPoints([]); setStartPoint(null)
  }

  const applyCrop = () => {
    if (!cropRect) return
    const {x,y,w,h} = cropRect
    if (w<10||h<10) return
    const orig = origRef.current; if (!orig) return

    // Create new orig canvas cropped
    const newOrig = document.createElement('canvas')
    newOrig.width=w; newOrig.height=h
    const noctx = newOrig.getContext('2d')!
    noctx.fillStyle='#FFFFFF'; noctx.fillRect(0,0,w,h)
    noctx.drawImage(orig, x,y,w,h, 0,0,w,h)
    origRef.current = newOrig

    // Scale annotations to new coordinates
    const scaleAnns = annotations.map(a => {
      const translate = (p: Point) => ({x: p.x-x, y: p.y-y})
      if (a.start) a = {...a, start: translate(a.start)}
      if (a.end)   a = {...a, end:   translate(a.end)}
      if (a.points) a = {...a, points: a.points.map(translate)}
      return a
    }).filter(a => {
      // Remove annotations that are fully outside crop
      if (a.start) return a.start.x>=0&&a.start.x<=w&&a.start.y>=0&&a.start.y<=h
      return true
    })

    setSize({w,h})
    setAnnotations(scaleAnns)
    setCropRect(null); setCropStart(null); setIsCropping(false)

    requestAnimationFrame(() => {
      const canvas = canvasRef.current; if (!canvas) return
      canvas.width=w; canvas.height=h
      redraw(scaleAnns)
    })
  }

  const addTextAnnotation = () => {
    if (!textPosition||!textInput.trim()) return
    const ann: Annotation = {id:uuidv4(),tool:'text',color:activeColor,strokeWidth,start:textPosition,text:textInput,fontSize:16+strokeWidth*2}
    const next = [...annotations, ann]
    setAnnotations(next)
    redraw(next)
    setTextInput(''); setTextPosition(null)
  }

  const undo = () => {
    const next = annotations.slice(0,-1)
    setAnnotations(next)
    redraw(next)
  }

  const clearAll = () => { setAnnotations([]); redraw([]) }

  const handleSave = () => {
    const canvas = canvasRef.current; if (!canvas) return
    redraw(annotations)
    onSave(canvas.toDataURL('image/jpeg',0.92), annotations, caption, keepOriginal)
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.92)',zIndex:1000,display:'flex',flexDirection:'column'}}>
      <div style={{background:'#111',padding:'8px 12px',display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',borderBottom:'1px solid #333',flexShrink:0}}>
        <div style={{display:'flex',gap:3}}>
          {TOOLS.map(tool=>(
            <button key={tool.value} onClick={()=>setActiveTool(tool.value)} title={tool.label}
              style={{padding:'6px 9px',borderRadius:6,border:'none',cursor:'pointer',fontSize:15,fontFamily:'DM Sans',
                background:activeTool===tool.value?'#1B6EB5':'#222',color:activeTool===tool.value?'#fff':'#aaa'}}>
              {tool.icon}
            </button>
          ))}
        </div>
        <div style={{width:1,height:26,background:'#333'}}/>
        <div style={{display:'flex',gap:4}}>
          {COLORS.map(col=>(
            <button key={col.value} onClick={()=>setActiveColor(col.value)} title={col.label}
              style={{width:22,height:22,borderRadius:'50%',border:activeColor===col.value?'3px solid #fff':'2px solid #555',background:col.value,cursor:'pointer'}}/>
          ))}
        </div>
        <div style={{width:1,height:26,background:'#333'}}/>
        <input type="range" min={1} max={8} value={strokeWidth} onChange={e=>setStrokeWidth(+e.target.value)} style={{width:65,accentColor:'#1B6EB5'}}/>
        <div style={{marginLeft:'auto',display:'flex',gap:5}}>
          <button onClick={undo} style={{padding:'5px 9px',borderRadius:6,border:'1px solid #444',background:'transparent',color:'#ccc',cursor:'pointer',fontSize:12}}>↩</button>
          <button onClick={clearAll} style={{padding:'5px 9px',borderRadius:6,border:'1px solid #444',background:'transparent',color:'#f44',cursor:'pointer',fontSize:12}}>✕</button>
          {cropRect&&cropRect.w>10&&cropRect.h>10&&(
            <button onClick={applyCrop} style={{padding:'5px 12px',borderRadius:6,border:'none',background:'#1B6EB5',color:'#fff',cursor:'pointer',fontSize:12,fontWeight:700}}>✂ Crop</button>
          )}
        </div>
      </div>

      <div ref={containerRef} style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',padding:12}}>
        <canvas ref={canvasRef} width={size.w} height={size.h}
          style={{borderRadius:4,cursor:'crosshair',touchAction:'none'}}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}/>
      </div>

      {textPosition&&(
        <div style={{background:'#1a1a1a',padding:'8px 12px',display:'flex',gap:8,borderTop:'1px solid #333'}}>
          <input value={textInput} onChange={e=>setTextInput(e.target.value)} placeholder="Type text..." autoFocus
            onKeyDown={e=>e.key==='Enter'&&addTextAnnotation()}
            style={{flex:1,background:'#111',color:'#fff',border:'1px solid #444',borderRadius:6,padding:'6px 10px',fontFamily:'DM Sans',fontSize:14}}/>
          <button onClick={addTextAnnotation} style={{padding:'6px 14px',borderRadius:6,border:'none',background:'#1B6EB5',color:'#fff',cursor:'pointer'}}>Add</button>
        </div>
      )}

      <div style={{background:'#111',padding:'10px 14px',display:'flex',alignItems:'center',gap:10,borderTop:'1px solid #333',flexShrink:0}}>
        <input value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Caption (optional)"
          style={{flex:1,background:'#1a1a1a',color:'#eee',border:'1px solid #333',borderRadius:6,padding:'7px 10px',fontFamily:'DM Sans',fontSize:13}}/>
        <label style={{display:'flex',alignItems:'center',gap:5,color:'#aaa',fontSize:12,cursor:'pointer',whiteSpace:'nowrap'}}>
          <input type="checkbox" checked={keepOriginal} onChange={e=>setKeepOriginal(e.target.checked)}/>
          Keep original
        </label>
        <button onClick={onCancel} style={{padding:'8px 14px',borderRadius:8,border:'1px solid #555',background:'transparent',color:'#ccc',cursor:'pointer',fontSize:13}}>Cancel</button>
        <button onClick={handleSave} style={{padding:'8px 18px',borderRadius:8,border:'none',background:'#C5001A',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:600}}>Save</button>
      </div>
    </div>
  )
}
