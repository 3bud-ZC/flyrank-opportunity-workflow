import { describe, expect, it } from 'vitest'
import { analyzeCsvPair } from './analysis'
import { scenarios } from './data'

function scenario(id: string) {
  const item = scenarios.find((candidate) => candidate.id === id)
  if (!item) throw new Error(`Missing scenario: ${id}`)
  return item
}

describe('FlyRank opportunity workflow', () => {
  it('runs a valid new input end to end and sorts by score', () => {
    const input = scenario('valid')
    const result = analyzeCsvPair(input.gscCsv, input.ga4Csv)
    expect(result.opportunities.length).toBeGreaterThan(0)
    expect(result.opportunities[0].score).toBeGreaterThanOrEqual(result.opportunities.at(-1)?.score ?? 0)
    expect(result.summary.gscRows).toBe(5)
    expect(result.summary.ga4Rows).toBe(4)
  })

  it('stops when a required GA4 column is missing', () => {
    const input = scenario('missing-column')
    expect(() => analyzeCsvPair(input.gscCsv, input.ga4Csv)).toThrow(/engaged_sessions/)
  })

  it('preserves blank queries without inventing text', () => {
    const input = scenario('blank-query')
    const result = analyzeCsvPair(input.gscCsv, input.ga4Csv)
    expect(result.summary.blankQueries).toBe(1)
    expect(result.opportunities.some((item) => item.primaryQuery === '(not provided)')).toBe(true)
  })

  it('keeps pages that appear in only one source', () => {
    const input = scenario('unmatched-pages')
    const result = analyzeCsvPair(input.gscCsv, input.ga4Csv)
    expect(result.summary.gscOnlyPages).toBe(1)
    expect(result.summary.ga4OnlyPages).toBe(1)
    expect(result.opportunities.some((item) => item.landingPage === '/gsc-only-page')).toBe(true)
    expect(result.opportunities.some((item) => item.landingPage === '/ga4-only-page')).toBe(true)
  })

  it('stops on malformed numeric values and identifies the field', () => {
    const input = scenario('malformed-number')
    expect(() => analyzeCsvPair(input.gscCsv, input.ga4Csv)).toThrow(/clicks/)
  })
})
