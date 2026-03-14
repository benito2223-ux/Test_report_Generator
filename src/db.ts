import Dexie, { type Table } from 'dexie'
import type { Report } from '@/types'

export class SPKDatabase extends Dexie {
  reports!: Table<Report>

  constructor() {
    super('SPKFieldReports')
    this.version(1).stores({
      reports: 'id, opportunityRef, status, createdAt, updatedAt, [contacts.customerCompany+createdAt]'
    })
  }
}

export const db = new SPKDatabase()
