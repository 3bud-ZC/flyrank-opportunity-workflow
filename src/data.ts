import type { ScenarioDefinition } from './types'

const validGsc = `landing_page,query,clicks,impressions,ctr,position
/services/automation,workflow automation,38,2400,0.0158,7.2
/services/automation,business automation,19,1100,0.0173,9.1
/case-studies/erp,erp software,22,1600,0.0138,8.6
/case-studies/monitor,vps monitoring,14,900,0.0156,6.9
/about,software engineer portfolio,8,450,0.0178,11.3`

const validGa4 = `landing_page,sessions,engaged_sessions,conversions
/services/automation,520,358,18
/case-studies/erp,310,201,9
/case-studies/monitor,210,146,5
/about,130,92,2`

const blankQueryGsc = `landing_page,query,clicks,impressions,ctr,position
/services/automation,,18,1400,0.0129,8.1
/case-studies/erp,erp system,11,800,0.0138,9.4`

const unmatchedGsc = `landing_page,query,clicks,impressions,ctr,position
/shared-page,workflow automation,24,1200,0.02,8.4
/gsc-only-page,seo opportunity,4,800,0.005,14.2
/blank-query-page,,3,500,0.006,11.8`

const unmatchedGa4 = `landing_page,sessions,engaged_sessions,conversions
/shared-page,320,220,12
/ga4-only-page,145,91,4
/blank-query-page,88,54,1`

const missingColumnGa4 = `landing_page,sessions,conversions
/shared-page,320,12
/ga4-only-page,145,4`

const malformedGsc = `landing_page,query,clicks,impressions,ctr,position
/services/automation,workflow automation,not-a-number,1200,0.02,8.4`

export const scenarios: ScenarioDefinition[] = [
  {
    id: 'valid',
    name: '1. Successful new input',
    description: 'A brand-new valid GSC and GA4 pair runs end to end.',
    expected: 'The workflow joins, scores, ranks, and exports the opportunities.',
    gscCsv: validGsc,
    ga4Csv: validGa4,
  },
  {
    id: 'missing-column',
    name: '2. Missing required column',
    description: 'The GA4 file omits engaged_sessions.',
    expected: 'Validation stops with a precise missing-column error.',
    gscCsv: unmatchedGsc,
    ga4Csv: missingColumnGa4,
    shouldFail: true,
    expectedErrorIncludes: 'engaged_sessions',
  },
  {
    id: 'blank-query',
    name: '3. Blank query preserved',
    description: 'A valid GSC row has no query text.',
    expected: 'The workflow preserves the row and labels the query as not provided.',
    gscCsv: blankQueryGsc,
    ga4Csv: validGa4,
  },
  {
    id: 'unmatched-pages',
    name: '4. Unmatched landing pages',
    description: 'Some pages appear in only one source.',
    expected: 'A full outer join keeps GSC-only and GA4-only pages without inventing mappings.',
    gscCsv: unmatchedGsc,
    ga4Csv: unmatchedGa4,
  },
  {
    id: 'malformed-number',
    name: '5. Malformed numeric value',
    description: 'The GSC clicks value contains text.',
    expected: 'Validation stops and identifies the exact row and field.',
    gscCsv: malformedGsc,
    ga4Csv: validGa4,
    shouldFail: true,
    expectedErrorIncludes: 'clicks',
  },
]

export const defaultScenario = scenarios[0]
