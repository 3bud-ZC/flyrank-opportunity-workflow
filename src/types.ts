export type CsvRecord = Record<string, string>

export interface GscRow {
  landingPage: string
  query: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface Ga4Row {
  landingPage: string
  sessions: number
  engagedSessions: number
  conversions: number
}

export type MatchStatus = 'GSC + GA4' | 'GSC only' | 'GA4 only'

export interface Opportunity {
  landingPage: string
  primaryQuery: string
  clicks: number
  impressions: number
  ctr: number
  position: number | null
  sessions: number
  engagedSessions: number
  engagementRate: number
  conversions: number
  score: number
  matchStatus: MatchStatus
  recommendation: string
  rationale: string[]
  reviewStatus: 'Needs review' | 'Reviewed'
}

export interface AnalysisResult {
  opportunities: Opportunity[]
  warnings: string[]
  summary: {
    gscRows: number
    ga4Rows: number
    joinedPages: number
    gscOnlyPages: number
    ga4OnlyPages: number
    blankQueries: number
  }
}

export interface ScenarioDefinition {
  id: string
  name: string
  description: string
  expected: string
  gscCsv: string
  ga4Csv: string
  shouldFail?: boolean
  expectedErrorIncludes?: string
}

export interface VerificationResult {
  id: string
  name: string
  passed: boolean
  observed: string
}
