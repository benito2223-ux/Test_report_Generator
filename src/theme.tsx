import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'

export const LIGHT = {
  bg: '#F7F8FA',
  bgCard: '#FFFFFF',
  bgInput: '#FFFFFF',
  bgHover: '#F0F2F5',
  border: '#E2E6EA',
  borderFocus: '#1B6EB5',
  text: '#1A1A2E',
  textSub: '#5A6478',
  textMuted: '#9BA5B4',
  accent: '#1B6EB5',       // SPK Blue
  accentLight: '#E8F1FB',
  red: '#C5001A',           // SPK Red
  redLight: '#FFF0F2',
  success: '#1B8A4C',
  successLight: '#E8F7EE',
  warning: '#B45309',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  shadowMd: '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)',
}

export const DARK = {
  bg: '#080808',
  bgCard: '#0d0d0d',
  bgInput: '#111111',
  bgHover: '#161616',
  border: '#1e1e1e',
  borderFocus: '#C5001A',
  text: '#F0F0F0',
  textSub: '#888888',
  textMuted: '#555555',
  accent: '#C5001A',
  accentLight: '#1a0003',
  red: '#C5001A',
  redLight: '#1a0003',
  success: '#4caf50',
  successLight: '#0f2a12',
  warning: '#ffb300',
  warningLight: '#2a1e00',
  danger: '#f44336',
  dangerLight: '#2a0005',
  shadow: '0 1px 3px rgba(0,0,0,0.4)',
  shadowMd: '0 4px 6px rgba(0,0,0,0.5)',
}

type Colors = typeof LIGHT

interface ThemeCtx {
  theme: Theme
  c: Colors
  toggle: () => void
}

const Ctx = createContext<ThemeCtx>({ theme: 'light', c: LIGHT, toggle: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('spk-theme') as Theme) || 'light'
  )
  const c = theme === 'light' ? LIGHT : DARK

  useEffect(() => {
    localStorage.setItem('spk-theme', theme)
    document.body.style.background = c.bg
    document.body.style.color = c.text
  }, [theme, c])

  return (
    <Ctx.Provider value={{ theme, c, toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
