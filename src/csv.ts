import type { CsvRecord } from './types'

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  if (quoted) {
    throw new Error('CSV contains an unclosed quoted value.')
  }

  cells.push(current.trim())
  return cells
}

export function parseCsv(text: string): CsvRecord[] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) {
    throw new Error('The CSV file is empty.')
  }

  const lines = normalized.split('\n').filter((line) => line.trim().length > 0)
  const headers = splitCsvLine(lines[0]).map((header) => header.trim().toLowerCase())

  if (headers.some((header) => !header)) {
    throw new Error('The CSV contains an empty header name.')
  }

  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index)
  if (duplicates.length > 0) {
    throw new Error(`The CSV contains duplicate headers: ${[...new Set(duplicates)].join(', ')}.`)
  }

  return lines.slice(1).map((line, rowIndex) => {
    const values = splitCsvLine(line)
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has ${values.length} values; expected ${headers.length}.`)
    }

    return headers.reduce<CsvRecord>((record, header, index) => {
      record[header] = values[index] ?? ''
      return record
    }, {})
  })
}

export function requireColumns(records: CsvRecord[], required: string[], label: string): void {
  if (records.length === 0) {
    throw new Error(`${label} contains headers but no data rows.`)
  }

  const available = Object.keys(records[0])
  const missing = required.filter((column) => !available.includes(column))
  if (missing.length > 0) {
    throw new Error(`${label} is missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`)
  }
}

export function parseRequiredNumber(value: string, field: string, rowNumber: number, label: string): number {
  if (value.trim() === '') {
    throw new Error(`${label} row ${rowNumber} has an empty ${field} value.`)
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} row ${rowNumber} has an invalid ${field} value: “${value}”.`)
  }

  return parsed
}

export function normalizeLandingPage(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error('A landing_page value cannot be empty.')
  }

  try {
    const parsed = new URL(trimmed)
    return `${parsed.pathname || '/'}${parsed.search}`.replace(/\/$/, '') || '/'
  } catch {
    const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return withSlash.replace(/\/$/, '') || '/'
  }
}
