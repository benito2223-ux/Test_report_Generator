import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, CSSProperties } from 'react'
import { useTheme } from '../theme'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useTheme()
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', color: c.accent, textTransform: 'uppercase', marginBottom: 14, paddingBottom: 8, borderBottom: `2px solid ${c.accent}` }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )
}

export function Row({ children, cols }: { children: ReactNode; cols?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>{children}</div>
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> { label: string; hint?: string }
export function Field({ label, hint, ...props }: FieldProps) {
  const { c } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: c.textSub }}>{label}</label>
      <input {...props} style={{ background: c.bgInput, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 8, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'DM Sans', transition: 'border-color 0.15s', ...props.style }}
        onFocus={e => { e.target.style.borderColor = c.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${c.accentLight}` }}
        onBlur={e => { e.target.style.borderColor = c.border; e.target.style.boxShadow = 'none' }} />
      {hint && <span style={{ fontSize: 11, color: c.textMuted }}>{hint}</span>}
    </div>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label: string }
export function TextArea({ label, ...props }: TextAreaProps) {
  const { c } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: c.textSub }}>{label}</label>
      <textarea {...props} style={{ background: c.bgInput, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 8, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'DM Sans', resize: 'vertical', minHeight: 90, transition: 'border-color 0.15s', ...props.style }}
        onFocus={e => { e.target.style.borderColor = c.borderFocus; e.target.style.boxShadow = `0 0 0 3px ${c.accentLight}` }}
        onBlur={e => { e.target.style.borderColor = c.border; e.target.style.boxShadow = 'none' }} />
    </div>
  )
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label: string; options: { value: string; label: string }[] }
export function Select({ label, options, ...props }: SelectProps) {
  const { c } = useTheme()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: c.textSub }}>{label}</label>
      <select {...props} style={{ background: c.bgInput, color: c.text, border: `1.5px solid ${c.border}`, borderRadius: 8, padding: '10px 13px', fontSize: 14, outline: 'none', fontFamily: 'DM Sans', appearance: 'none', cursor: 'pointer', ...props.style }}
        onFocus={e => e.target.style.borderColor = c.borderFocus}
        onBlur={e => e.target.style.borderColor = c.border}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

export function NumField({ label, hint, ...props }: FieldProps) {
  return <Field label={label} hint={hint} type="number" inputMode="decimal" step="any" {...props} />
}

interface StepNavProps { steps: string[]; current: number; onGo: (i: number) => void }
export function StepNav({ steps, current, onGo }: StepNavProps) {
  const { c } = useTheme()
  return (
    <>
      <style>{`
        .spk-tabs { display:flex; } .spk-dots { display:none; }
        @media(max-width:767px){ .spk-tabs { display:none !important; } .spk-dots { display:flex !important; } }
      `}</style>
      {/* PC tabs */}
      <div className="spk-tabs" style={{ gap: 2, background: c.bgHover, borderRadius: 12, padding: 4, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <button key={s} onClick={() => onGo(i)} style={{ flex: 1, padding: '8px 6px', borderRadius: 9, border: 'none', cursor: 'pointer', background: i === current ? c.bgCard : 'transparent', color: i === current ? c.accent : i < current ? c.textSub : c.textMuted, fontSize: 11, fontWeight: i === current ? 700 : 500, fontFamily: 'DM Sans', boxShadow: i === current ? c.shadow : 'none', borderBottom: i === current ? `2px solid ${c.accent}` : '2px solid transparent', transition: 'all 0.15s' }}>
            {i < current && <span style={{ marginRight: 3, color: c.success }}>✓</span>}{s}
          </button>
        ))}
      </div>
      {/* Mobile dots */}
      <div className="spk-dots" style={{ gap: 6, justifyContent: 'center', marginBottom: 16 }}>
        {steps.map((_, i) => (
          <div key={i} onClick={() => onGo(i)} style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, cursor: 'pointer', background: i === current ? c.accent : i < current ? c.border : c.border, transition: 'all 0.2s', opacity: i === current ? 1 : i < current ? 0.6 : 0.3 }} />
        ))}
      </div>
    </>
  )
}

export function Tag({ children, color = 'default' }: { children: ReactNode; color?: 'success'|'warning'|'danger'|'info'|'default' }) {
  const { c } = useTheme()
  const map: Record<string, { bg: string; txt: string }> = {
    success: { bg: c.successLight, txt: c.success },
    warning: { bg: c.warningLight, txt: c.warning },
    danger: { bg: c.dangerLight, txt: c.danger },
    info: { bg: c.accentLight, txt: c.accent },
    default: { bg: c.bgHover, txt: c.textSub },
  }
  const s = map[color]
  return <span style={{ background: s.bg, color: s.txt, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{children}</span>
}

export function Btn({ children, onClick, variant = 'primary', style: sx, disabled }: { children: ReactNode; onClick?: () => void; variant?: 'primary'|'ghost'|'danger'|'blue'; style?: CSSProperties; disabled?: boolean }) {
  const { c } = useTheme()
  const map: Record<string, CSSProperties> = {
    primary: { background: c.red, color: '#fff', border: 'none' },
    blue: { background: c.accent, color: '#fff', border: 'none' },
    ghost: { background: 'transparent', color: c.textSub, border: `1.5px solid ${c.border}` },
    danger: { background: 'transparent', color: c.danger, border: `1.5px solid ${c.danger}` },
  }
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...map[variant], padding: '10px 20px', borderRadius: 9, fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'opacity 0.15s', ...sx }}>{children}</button>
  )
}

export function Card({ children, style: sx }: { children: ReactNode; style?: CSSProperties }) {
  const { c } = useTheme()
  return <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 18px', boxShadow: c.shadow, ...sx }}>{children}</div>
}

export function Divider() {
  const { c } = useTheme()
  return <div style={{ height: 1, background: c.border, margin: '12px 0' }} />
}
