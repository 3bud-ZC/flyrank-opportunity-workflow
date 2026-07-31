import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSearch,
  FileUp,
  GitMerge,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { analyzeCsvPair } from './analysis'
import { defaultScenario, scenarios } from './data'
import { downloadText, toCsv, toMarkdown } from './export'
import type { AnalysisResult, Opportunity, VerificationResult } from './types'

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.readAsText(file)
  })
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export default function App() {
  const [gscCsv, setGscCsv] = useState(defaultScenario.gscCsv)
  const [ga4Csv, setGa4Csv] = useState(defaultScenario.ga4Csv)
  const [gscName, setGscName] = useState('built-in-gsc-valid.csv')
  const [ga4Name, setGa4Name] = useState('built-in-ga4-valid.csv')
  const [activeScenario, setActiveScenario] = useState(defaultScenario.id)
  const [result, setResult] = useState<AnalysisResult>(() => analyzeCsvPair(defaultScenario.gscCsv, defaultScenario.ga4Csv))
  const [error, setError] = useState('')
  const [verification, setVerification] = useState<VerificationResult[]>([])
  const [lastRun, setLastRun] = useState(new Date())

  const reviewedCount = useMemo(
    () => result.opportunities.filter((item) => item.reviewStatus === 'Reviewed').length,
    [result],
  )

  function loadScenario(id: string): void {
    const scenario = scenarios.find((item) => item.id === id)
    if (!scenario) return
    setActiveScenario(id)
    setGscCsv(scenario.gscCsv)
    setGa4Csv(scenario.ga4Csv)
    setGscName(`${scenario.id}-gsc.csv`)
    setGa4Name(`${scenario.id}-ga4.csv`)
    setError('')

    if (!scenario.shouldFail) {
      setResult(analyzeCsvPair(scenario.gscCsv, scenario.ga4Csv))
      setLastRun(new Date())
    }
  }

  function runAnalysis(): void {
    try {
      const next = analyzeCsvPair(gscCsv, ga4Csv)
      setResult(next)
      setError('')
      setLastRun(new Date())
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The workflow failed unexpectedly.')
    }
  }

  async function selectFile(kind: 'gsc' | 'ga4', file?: File): Promise<void> {
    if (!file) return
    try {
      const text = await readFile(file)
      if (kind === 'gsc') {
        setGscCsv(text)
        setGscName(file.name)
      } else {
        setGa4Csv(text)
        setGa4Name(file.name)
      }
      setActiveScenario('custom')
      setError('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The selected file could not be read.')
    }
  }

  function runVerificationSuite(): void {
    const outputs = scenarios.map<VerificationResult>((scenario) => {
      try {
        const observed = analyzeCsvPair(scenario.gscCsv, scenario.ga4Csv)
        if (scenario.shouldFail) {
          return {
            id: scenario.id,
            name: scenario.name,
            passed: false,
            observed: `Expected validation to fail, but ${observed.opportunities.length} opportunity rows were produced.`,
          }
        }

        let passed = observed.opportunities.length > 0
        let note = `${observed.opportunities.length} page(s) processed.`
        if (scenario.id === 'blank-query') {
          passed = observed.summary.blankQueries > 0 && observed.opportunities.some((item) => item.primaryQuery === '(not provided)')
          note = `${observed.summary.blankQueries} blank query value(s) preserved.`
        }
        if (scenario.id === 'unmatched-pages') {
          passed = observed.summary.gscOnlyPages > 0 && observed.summary.ga4OnlyPages > 0
          note = `${observed.summary.gscOnlyPages} GSC-only and ${observed.summary.ga4OnlyPages} GA4-only page(s) preserved.`
        }

        return { id: scenario.id, name: scenario.name, passed, observed: note }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Unknown error'
        const passed = Boolean(scenario.shouldFail && scenario.expectedErrorIncludes && message.includes(scenario.expectedErrorIncludes))
        return { id: scenario.id, name: scenario.name, passed, observed: message }
      }
    })

    setVerification(outputs)
  }

  function toggleReview(index: number): void {
    setResult((current) => ({
      ...current,
      opportunities: current.opportunities.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, reviewStatus: item.reviewStatus === 'Reviewed' ? 'Needs review' : 'Reviewed' }
          : item,
      ),
    }))
  }

  function exportResult(format: 'csv' | 'json' | 'md'): void {
    if (format === 'csv') downloadText('flyrank-opportunities.csv', toCsv(result.opportunities), 'text/csv')
    if (format === 'json') downloadText('flyrank-opportunities.json', JSON.stringify(result, null, 2), 'application/json')
    if (format === 'md') downloadText('flyrank-opportunity-brief.md', toMarkdown(result), 'text/markdown')
  }

  return (
    <main>
      <header className="hero">
        <div className="shell hero-grid">
          <div>
            <span className="eyebrow"><Sparkles size={16} /> FL-04 · Browser-only workflow</span>
            <h1>FlyRank Opportunity Analysis Workflow</h1>
            <p className="hero-copy">
              Validate new GSC and GA4 exports, join landing pages, rank explainable opportunities,
              review the recommendations, and export an action brief without sending data to a server.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={runAnalysis}><Play size={18} /> Run current input</button>
              <button className="secondary" onClick={runVerificationSuite}><ShieldCheck size={18} /> Run five verification cases</button>
            </div>
          </div>
          <aside className="privacy-card">
            <ShieldCheck size={34} />
            <strong>Local processing</strong>
            <p>CSV content stays in this browser tab. No backend, database, account, or upload API is used.</p>
          </aside>
        </div>
      </header>

      <section className="shell section">
        <div className="section-heading">
          <span>Workflow design</span>
          <h2>Four distinct stages with explicit handoffs</h2>
        </div>
        <div className="steps">
          {[
            ['1', 'Gather & validate', 'Read two CSV files, verify schemas, and stop on unsafe input.', FileSearch],
            ['2', 'Normalize & join', 'Normalize landing pages and perform a full outer join.', GitMerge],
            ['3', 'Score & explain', 'Calculate transparent opportunity scores and recommendations.', Sparkles],
            ['4', 'Review & export', 'Keep human approval visible before exporting the action brief.', ClipboardCheck],
          ].map(([number, title, copy, Icon]) => (
            <article className="step" key={String(number)}>
              <div className="step-icon"><Icon size={23} /></div>
              <span>Stage {number as string}</span>
              <h3>{title as string}</h3>
              <p>{copy as string}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="shell section grid-two">
        <div className="panel">
          <div className="panel-title">
            <div><span>Input handoff</span><h2>Upload fresh exports</h2></div>
            <FileUp size={28} />
          </div>
          <div className="upload-grid">
            <label className="upload-box">
              <strong>Google Search Console CSV</strong>
              <small>{gscName}</small>
              <input type="file" accept=".csv,text/csv" onChange={(event) => void selectFile('gsc', event.target.files?.[0])} />
              <span>Choose GSC file</span>
            </label>
            <label className="upload-box">
              <strong>GA4 landing-page CSV</strong>
              <small>{ga4Name}</small>
              <input type="file" accept=".csv,text/csv" onChange={(event) => void selectFile('ga4', event.target.files?.[0])} />
              <span>Choose GA4 file</span>
            </label>
          </div>
          <div className="schema-note">
            <strong>Required columns</strong>
            <p>GSC: landing_page, query, clicks, impressions, ctr, position</p>
            <p>GA4: landing_page, sessions, engaged_sessions, conversions</p>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">
            <div><span>Reproducible inputs</span><h2>Five real verification cases</h2></div>
            <RefreshCw size={28} />
          </div>
          <div className="scenario-list">
            {scenarios.map((scenario) => (
              <button
                key={scenario.id}
                className={`scenario ${activeScenario === scenario.id ? 'active' : ''}`}
                onClick={() => loadScenario(scenario.id)}
              >
                <strong>{scenario.name}</strong>
                <span>{scenario.description}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="shell section">
        {error ? (
          <div className="message error"><AlertTriangle size={23} /><div><strong>Validation stopped safely</strong><p>{error}</p></div></div>
        ) : (
          <div className="message success"><CheckCircle2 size={23} /><div><strong>Workflow completed</strong><p>Last run: {lastRun.toLocaleString()} · Review the ranked output before export.</p></div></div>
        )}

        {verification.length > 0 && (
          <div className="panel verification-panel">
            <div className="panel-title"><div><span>Automated evidence</span><h2>Five-run verification record</h2></div></div>
            <div className="verification-list">
              {verification.map((item) => (
                <article key={item.id} className={item.passed ? 'verification pass' : 'verification fail'}>
                  {item.passed ? <CheckCircle2 size={21} /> : <AlertTriangle size={21} />}
                  <div><strong>{item.name}</strong><p>{item.observed}</p></div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {!error && (
        <>
          <section className="shell section metrics">
            {[
              ['GSC rows', result.summary.gscRows],
              ['GA4 rows', result.summary.ga4Rows],
              ['Joined pages', result.summary.joinedPages],
              ['Human-reviewed', `${reviewedCount}/${result.opportunities.length}`],
            ].map(([label, value]) => (
              <article className="metric" key={String(label)}><span>{label}</span><strong>{value}</strong></article>
            ))}
          </section>

          {result.warnings.length > 0 && (
            <section className="shell warning-list">
              {result.warnings.map((warning) => <p key={warning}><AlertTriangle size={17} /> {warning}</p>)}
            </section>
          )}

          <section className="shell section">
            <div className="section-heading heading-row">
              <div><span>Ranked output</span><h2>Explainable opportunity queue</h2></div>
              <div className="export-actions">
                <button onClick={() => exportResult('csv')}><Download size={17} /> CSV</button>
                <button onClick={() => exportResult('json')}><Download size={17} /> JSON</button>
                <button onClick={() => exportResult('md')}><Download size={17} /> Markdown</button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Rank</th><th>Page & query</th><th>Score</th><th>Signals</th><th>Source match</th><th>Recommendation</th><th>Human check</th></tr>
                </thead>
                <tbody>
                  {result.opportunities.map((item: Opportunity, index) => (
                    <tr key={item.landingPage}>
                      <td><span className="rank">{index + 1}</span></td>
                      <td><strong>{item.landingPage}</strong><small>{item.primaryQuery}</small></td>
                      <td><strong className="score">{item.score}</strong><small>/100</small></td>
                      <td className="signals">
                        <span>{item.impressions.toLocaleString()} impressions</span>
                        <span>{formatPercent(item.ctr)} CTR</span>
                        <span>{item.position === null ? 'No GSC position' : `Position ${item.position.toFixed(1)}`}</span>
                        <span>{item.sessions.toLocaleString()} sessions</span>
                      </td>
                      <td><span className={`badge ${item.matchStatus.replaceAll(' ', '-').toLowerCase()}`}>{item.matchStatus}</span></td>
                      <td><p>{item.recommendation}</p><ul>{item.rationale.map((reason) => <li key={reason}>{reason}</li>)}</ul></td>
                      <td>
                        <button className={`review ${item.reviewStatus === 'Reviewed' ? 'reviewed' : ''}`} onClick={() => toggleReview(index)}>
                          {item.reviewStatus}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="shell section grid-two bottom-grid">
            <div className="panel">
              <div className="panel-title"><div><span>Human boundary</span><h2>What still requires judgment</h2></div><ClipboardCheck size={28} /></div>
              <ul className="check-list">
                <li>Confirm search intent before changing the target page.</li>
                <li>Verify tracking and canonical URLs for unmatched pages.</li>
                <li>Read the page before accepting the generated recommendation.</li>
                <li>Approve priorities before creating tickets or publishing changes.</li>
                <li>Compare results after implementation; the score is not a performance guarantee.</li>
              </ul>
            </div>
            <div className="panel">
              <div className="panel-title"><div><span>Time accounting</span><h2>Honest operating estimate</h2></div></div>
              <dl className="time-list">
                <div><dt>First setup and implementation</dt><dd>Approximately 6–7 hours</dd></div>
                <div><dt>Manual analysis for a fresh pair</dt><dd>Approximately 35–50 minutes</dd></div>
                <div><dt>Assisted run plus review</dt><dd>Approximately 8–15 minutes</dd></div>
                <div><dt>Known limitation</dt><dd>Time values are estimates, not instrumented production measurements.</dd></div>
              </dl>
            </div>
          </section>
        </>
      )}

      <footer>
        <div className="shell footer-grid">
          <div><strong>FlyRank Opportunity Workflow</strong><p>FL-04 submission · Abdullah Ragab</p></div>
          <a href="https://github.com/3bud-ZC/flyrank-opportunity-workflow" target="_blank" rel="noreferrer">Open source repository</a>
        </div>
      </footer>
    </main>
  )
}
