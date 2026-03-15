import { useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import imageCompression from 'browser-image-compression'
import type { ReportPhoto, Annotation } from '@/types'
import PhotoAnnotator from './PhotoAnnotator'

interface Props {
  photos: ReportPhoto[]
  onChange: (photos: ReportPhoto[]) => void
  label?: string
  maxPhotos?: number
}

export default function PhotoCapture({ photos, onChange, label = 'Photos', maxPhotos = 10 }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [editingPhoto, setEditingPhoto] = useState<ReportPhoto | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<ReportPhoto | null>(null)

  const compressAndRead = async (file: File): Promise<string> => {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    })
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(compressed)
    })
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    const arr = Array.from(files).slice(0, maxPhotos - photos.length)
    for (const file of arr) {
      const base64 = await compressAndRead(file)
      const photo: ReportPhoto = {
        id: uuidv4(),
        originalBase64: base64,
        caption: '',
        takenAt: new Date().toISOString(),
        ref: `Photo ${photos.length + arr.indexOf(file) + 1}`,
        annotations: [],
      }
      // Auto-open annotator for each new photo
      setEditingPhoto(photo)
    }
  }

  const handleAnnotationSave = (
    annotatedBase64: string,
    annotations: Annotation[],
    caption: string,
    keepOriginal: boolean,
  ) => {
    if (!editingPhoto) return
    const updated: ReportPhoto = {
      ...editingPhoto,
      annotatedBase64,
      annotations,
      caption,
      originalBase64: keepOriginal ? editingPhoto.originalBase64 : annotatedBase64,
    }
    const existing = photos.find(p => p.id === editingPhoto.id)
    if (existing) {
      onChange(photos.map(p => p.id === editingPhoto.id ? updated : p))
    } else {
      onChange([...photos, updated])
    }
    setEditingPhoto(null)
  }

  const removePhoto = (id: string) => onChange(photos.filter(p => p.id !== id))

  return (
    <div>
      {editingPhoto && (
        <PhotoAnnotator
          photo={editingPhoto}
          onSave={handleAnnotationSave}
          onCancel={() => setEditingPhoto(null)}
        />
      )}

      {previewPhoto && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setPreviewPhoto(null)}
        >
          <img
            src={previewPhoto.annotatedBase64 || previewPhoto.originalBase64}
            style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }}
            alt={previewPhoto.caption}
          />
          {previewPhoto.caption && (
            <p style={{ color: '#ccc', marginTop: 12, fontSize: 14, textAlign: 'center' }}>{previewPhoto.caption}</p>
          )}
          <p style={{ color: '#666', marginTop: 8, fontSize: 12 }}>Tap to close</p>
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <span style={labelStyle}>{label}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
        {photos.map(photo => (
          <div key={photo.id} style={{ position: 'relative', width: 72, height: 72 }}>
            <img
              src={photo.annotatedBase64 || photo.originalBase64}
              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, border: '1px solid #333', cursor: 'pointer' }}
              onClick={() => setPreviewPhoto(photo)}
              alt={photo.caption}
            />
            {/* Edit annotation button */}
            <button
              onClick={e => { e.stopPropagation(); setEditingPhoto(photo) }}
              style={overlayBtn('#C5001A', 0, 0)}
              title="Annotate"
            >✏</button>
            {/* Delete button */}
            <button
              onClick={e => { e.stopPropagation(); removePhoto(photo.id) }}
              style={overlayBtn('#333', 0, undefined, 0)}
              title="Delete"
            >×</button>
            {photo.caption && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', borderBottomLeftRadius: 6, borderBottomRightRadius: 6, padding: '2px 3px' }}>
                <span style={{ color: '#eee', fontSize: 8, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{photo.caption}</span>
              </div>
            )}
          </div>
        ))}

        {photos.length < maxPhotos && (
          <>
            {/* Camera button */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              style={addBtn}
              title="Take a photo"
            >
              <span style={{ fontSize: 20 }}>📷</span>
              <span style={{ fontSize: 9, color: '#999' }}>Camera</span>
            </button>
            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={addBtn}
              title="Import image"
            >
              <span style={{ fontSize: 20 }}>📁</span>
              <span style={{ fontSize: 9, color: '#999' }}>Import</span>
            </button>
          </>
        )}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={false}
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const addBtn: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 6,
  border: '1.5px dashed #444',
  background: 'transparent',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  cursor: 'pointer',
  color: '#fff',
}

const overlayBtn = (bg: string, top?: number, left?: number, right?: number): React.CSSProperties => ({
  position: 'absolute',
  top: top !== undefined ? top : undefined,
  left: left !== undefined ? left : undefined,
  right: right !== undefined ? right : undefined,
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: bg,
  color: '#fff',
  border: 'none',
  fontSize: 10,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
})
