import { normalizeLandingPage, parseCsv, parseRequiredNumber, requireColumns } from './csv'
import type { AnalysisResult, Ga4Row, GscRow, Opportunity } from './types'

const GSC_REQUIRED = ['landing_page', 'query', 'clicks', 'impressions', 'ctr', 'position']
const GA4_REQUIRED = ['landing_page', 'sessions', 'engaged_sessions', 'conversions']

function toGscRows(csv: string): GscRow[] {
  const records = parseCsv(csv)
  requireColumns(records, GSC_REQUIRED, 'GSC CSV')

  return records.map((record, index) => ({
    landingPage: normalizeLandingPage(record.landing_page),
    query: record.query.trim(),
    clicks: parseRequiredNumber(record.clicks, 'clicks', index + 2, 'GSC CSV'),
    impressions: parseRequiredNumber(record.impressions, 'impressions', index + 2, 'GSC CSV'),
    ctr: parseRequiredNumber(record.ctr, 'ctr', index + 2, 'GSC CSV'),
    position: parseRequiredNumber(record.position, 'position', index + 2, 'GSC CSV'),
  }))
}

function toGa4Rows(csv: string): Ga4Row[] {
  const records = parseCsv(csv)
  requireColumns(records, GA4_REQUIRED, 'GA4 CSV')

  return records.map((record, index) => ({
    landingPage: normalizeLandingPage(record.landing_page),
    sessions: parseRequiredNumber(record.sessions, 'sessions', index + 2, 'GA4 CSV'),
    engagedSessions: parseRequiredNumber(record.engaged_sessions, 'engaged_sessions', index + 2, 'GA4 CSV'),
    conversions: parseRequiredNumber(record.conversions, 'conversions', index + 2, 'GA4 CSV'),
  }))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function scoreOpportunity(data: Omit<Opportunity, 'score' | 'recommendation' | 'rationale' | 'reviewStatus'>): Pick<Opportunity, 'score' | 'recommendation' | 'rationale'> {
  const rationale: string[] = []
  const visibility = clamp(data.impressions / 2500, 0, 1) * 30
  const rankWindow = data.position === null ? 0 : clamp(1 - Math.abs(data.position - 9) / 14, 0, 1) * 25
  const ctrGap = data.impressions > 0 ? clamp((0.04 - data.ctr) / 0.04, 0, 1) * 20 : 0
  const engagement = clamp(data.engagementRate, 0, 1) * 10
  const conversionRate = data.sessions > 0 ? data.conversions / data.sessions : 0
  const conversionGap = data.sessions > 0 ? clamp((0.04 - conversionRate) / 0.04, 0, 1) * 15 : 5
  const score = Math.round(visibility + rankWindow + ctrGap + engagement + conversionGap)

  if (data.impressions >= 1000) rationale.push('Meaningful search demand is already present.')
  if (data.position !== null && data.position >= 4 && data.position <= 15) rationale.push('The page ranks within an achievable improvement range.')
  if (data.impressions > 0 && data.ctr < 0.02) rationale.push('CTR is low relative to existing visibility.')
  if (data.matchStatus !== 'GSC + GA4') rationale.push(`The page is present in ${data.matchStatus}; source alignment needs review.`)
  if (data.primaryQuery === '(not provided)') rationale.push('The source query was blank and was preserved without inference.')
  if (rationale.length === 0) rationale.push('The page has moderate signals and requires human prioritization.')

  let recommendation = 'Review the page manually before changing content.'
  if (data.matchStatus === 'GA4 only') recommendation = 'Confirm indexing and Search Console coverage before SEO action.'
  else if (data.matchStatus === 'GSC only') recommendation = 'Confirm analytics tracking and landing-page normalization.'
  else if (data.position !== null && data.position <= 15 && data.ctr < 0.02) recommendation = 'Rewrite the title and description, then strengthen query-to-page alignment.'
  else if (data.position !== null && data.position > 15) recommendation = 'Expand the content and internal linking before testing metadata.'
  else if (conversionRate < 0.02 && data.sessions >= 100) recommendation = 'Review the page CTA and conversion path after validating intent.'

  return { score, recommendation, rationale }
}

export function analyzeCsvPair(gscCsv: string, ga4Csv: string): AnalysisResult {
  const gscRows = toGscRows(gscCsv)
  const ga4Rows = toGa4Rows(ga4Csv)
  const warnings: string[] = []

  const gscByPage = new Map<string, GscRow[]>()
  for (const row of gscRows) {
    const rows = gscByPage.get(row.landingPage) ?? []
    rows.push(row)
    gscByPage.set(row.landingPage, rows)
  }

  const ga4ByPage = new Map<string, Ga4Row[]>()
  for (const row of ga4Rows) {
    const rows = ga4ByPage.get(row.landingPage) ?? []
    rows.push(row)
    ga4ByPage.set(row.landingPage, rows)
  }

  const pages = new Set([...gscByPage.keys(), ...ga4ByPage.keys()])
  const opportunities: Opportunity[] = []
  let gscOnlyPages = 0
  let ga4OnlyPages = 0

  for (const landingPage of pages) {
    const gsc = gscByPage.get(landingPage) ?? []
    const ga4 = ga4ByPage.get(landingPage) ?? []
    const matchStatus = gsc.length > 0 && ga4.length > 0 ? 'GSC + GA4' : gsc.length > 0 ? 'GSC only' : 'GA4 only'

    if (matchStatus === 'GSC only') gscOnlyPages += 1
    if (matchStatus === 'GA4 only') ga4OnlyPages += 1

    const clicks = gsc.reduce((sum, row) => sum + row.clicks, 0)
    const impressions = gsc.reduce((sum, row) => sum + row.impressions, 0)
    const weightedPosition = impressions > 0 ? gsc.reduce((sum, row) => sum + row.position * row.impressions, 0) / impressions : null
    const ctr = impressions > 0 ? clicks / impressions : 0
    const primary = [...gsc].sort((a, b) => b.impressions - a.impressions)[0]
    const sessions = ga4.reduce((sum, row) => sum + row.sessions, 0)
    const engagedSessions = ga4.reduce((sum, row) => sum + row.engagedSessions, 0)
    const conversions = ga4.reduce((sum, row) => sum + row.conversions, 0)
    const engagementRate = sessions > 0 ? engagedSessions / sessions : 0

    const base = {
      landingPage,
      primaryQuery: primary?.query || '(not provided)',
      clicks,
      impressions,
      ctr,
      position: weightedPosition,
      sessions,
      engagedSessions,
      engagementRate,
      conversions,
      matchStatus,
    } as const

    opportunities.push({
      ...base,
      ...scoreOpportunity(base),
      reviewStatus: 'Needs review',
    })
  }

  if (gscOnlyPages > 0) warnings.push(`${gscOnlyPages} page(s) appeared only in GSC and were preserved.`)
  if (ga4OnlyPages > 0) warnings.push(`${ga4OnlyPages} page(s) appeared only in GA4 and were preserved.`)
  const blankQueries = gscRows.filter((row) => row.query === '').length
  if (blankQueries > 0) warnings.push(`${blankQueries} blank query value(s) were preserved as “not provided”.`)

  opportunities.sort((a, b) => b.score - a.score || b.impressions - a.impressions)

  return {
    opportunities,
    warnings,
    summary: {
      gscRows: gscRows.length,
      ga4Rows: ga4Rows.length,
      joinedPages: opportunities.length,
      gscOnlyPages,
      ga4OnlyPages,
      blankQueries,
    },
  }
}
