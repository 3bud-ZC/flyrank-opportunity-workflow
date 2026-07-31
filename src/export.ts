import type { AnalysisResult, Opportunity } from './types'

function csvEscape(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(opportunities: Opportunity[]): string {
  const headers = [
    'rank', 'landing_page', 'primary_query', 'score', 'match_status', 'clicks', 'impressions',
    'ctr', 'position', 'sessions', 'engaged_sessions', 'engagement_rate', 'conversions',
    'recommendation', 'review_status',
  ]

  const rows = opportunities.map((item, index) => [
    index + 1,
    item.landingPage,
    item.primaryQuery,
    item.score,
    item.matchStatus,
    item.clicks,
    item.impressions,
    item.ctr.toFixed(4),
    item.position === null ? '' : item.position.toFixed(2),
    item.sessions,
    item.engagedSessions,
    item.engagementRate.toFixed(4),
    item.conversions,
    item.recommendation,
    item.reviewStatus,
  ])

  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
}

export function toMarkdown(result: AnalysisResult): string {
  const lines = [
    '# FlyRank Opportunity Analysis',
    '',
    '## Run summary',
    '',
    `- GSC rows: ${result.summary.gscRows}`,
    `- GA4 rows: ${result.summary.ga4Rows}`,
    `- Joined pages: ${result.summary.joinedPages}`,
    `- GSC-only pages: ${result.summary.gscOnlyPages}`,
    `- GA4-only pages: ${result.summary.ga4OnlyPages}`,
    `- Blank queries preserved: ${result.summary.blankQueries}`,
    '',
    '## Ranked opportunities',
    '',
  ]

  result.opportunities.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.landingPage} — ${item.score}/100`)
    lines.push('')
    lines.push(`- Primary query: ${item.primaryQuery}`)
    lines.push(`- Source match: ${item.matchStatus}`)
    lines.push(`- Impressions: ${item.impressions}`)
    lines.push(`- CTR: ${(item.ctr * 100).toFixed(2)}%`)
    lines.push(`- Position: ${item.position === null ? 'N/A' : item.position.toFixed(1)}`)
    lines.push(`- Sessions: ${item.sessions}`)
    lines.push(`- Conversions: ${item.conversions}`)
    lines.push(`- Recommendation: ${item.recommendation}`)
    lines.push(`- Human review: ${item.reviewStatus}`)
    lines.push('')
  })

  if (result.warnings.length > 0) {
    lines.push('## Data-quality notes', '')
    result.warnings.forEach((warning) => lines.push(`- ${warning}`))
  }

  return lines.join('\n')
}

export function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
