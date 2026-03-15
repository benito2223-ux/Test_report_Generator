import { createClient } from '@supabase/supabase-js'
import type { Report } from './types'

const SUPABASE_URL = 'https://qrrcdlpsdzvpaqfwnqfw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFycmNkbHBzZHp2cGFxZnducWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTMzOTcsImV4cCI6MjA4OTEyOTM5N30.DjLHP0oexj_ZH-nYOcktGl_k_r5anG43HJ3ajuFwN60'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export async function fetchAllReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select('data')
    .order('updated_at', { ascending: false })
  if (error) { console.error('fetchAllReports:', error); return [] }
  return (data || []).map(row => row.data as Report)
}

export async function upsertReport(report: Report): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .upsert({ id: report.id, data: report, updated_at: new Date().toISOString() })
  if (error) console.error('upsertReport:', error)
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('id', id)
  if (error) console.error('deleteReport:', error)
}
