import { useState, useEffect } from 'react'

import { type Lang, type TKey, t, getLang } from './i18n'

export function useLang() {
  const [lang, setLang] = useState<Lang>(getLang)

  useEffect(() => {
    const handler = () => setLang(getLang())
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  return { lang, tr: (key: TKey) => t(key, lang) }
}
