import path from 'node:path'
import { JSDOM } from 'jsdom'
import { writeFile } from 'node:fs/promises'
import { TextDecoder } from 'node:util'
import { formatDate } from '@design-edito/tools/agnostic/time/dates/format-date/index.js'
import { spawner } from '@design-edito/tools/node/process/spawner/index.js'

const THIS_FILE = import.meta.url
const PROJECT_ROOT = path.join(THIS_FILE.replace('file:', ''), '../../')
const OUTPUT = path.join(PROJECT_ROOT, 'output')

const TARGET_URL = 'https://www.meteociel.fr/previsions/27827/paris_11eme_arrondissement.htm'

try {
  const html = await fetchMeteoCielPage(TARGET_URL)
  const jsonOutput = parseMeteoCielPage(html)
  const targetFile = path.join(OUTPUT, 'data.paris11.json')
  await writeParsedMeteoCielData(targetFile, jsonOutput, TARGET_URL)
  await selfAddCommitPush()
} catch (err) {
  console.log(err)
}

async function selfAddCommitPush () {
  const added = await spawner(
    'Adding everything to git stage',
    'git', ['add', '*'],
    undefined,
    true,
    { cwd: PROJECT_ROOT }
  )
  if (!added.success) throw 'Could not git add'
  
  const commited = await spawner(
    'Commiting everything',
    'git', ['commit', '-m', `Scraped on ${new Date().toISOString()}`],
    undefined,
    true,
    { cwd: PROJECT_ROOT }
  )
  if (!commited.success) throw 'Could not git commit'
}

async function fetchMeteoCielPage (url: string): Promise<string> {
  const fetched = await fetch(url)
  const buffer = await fetched.arrayBuffer()
  const html = new TextDecoder('iso-8859-1').decode(buffer)
  return html
}

async function writeParsedMeteoCielData (filePath: string, data: any, fetchedUrl: string): Promise<void> {
  const now = Date.now()
  const nowDate = new Date()
  const targetJson = {
    fetchedUrl,
    fetchTimestamp: now,
    fetchTimeReadable: nowDate.toISOString(),
    data: data
  }
  const stringified = JSON.stringify(targetJson, null, 2)
  console.log(stringified)
  await writeFile(filePath, stringified, 'utf-8')
}

function parseMeteoCielPage (pageContent: string): any[] {
  const dom = new JSDOM(pageContent)
  const { document } = dom.window
  const forecastTableRows = Array
    .from(document.querySelectorAll('table table table table td table:first-child tr'))
    .slice(2)
  let currentDateLabel: string | null = null
  let jsonOutput: any[] = []

  const NOW = new Date()
  NOW.setMinutes(0)
  NOW.setSeconds(0)
  NOW.setMilliseconds(0)

  for (const row of forecastTableRows) {
    const cells = Array.from(row.querySelectorAll('td'))
    
    // Filter out unrelevant lines
    if (cells.length < 10 || cells.length > 11) continue

    // Extract cells
    let dateCell: HTMLTableCellElement | undefined = undefined
    let otherCells: HTMLTableCellElement[] = []
    if (cells.length === 11) {
      dateCell = cells[0]
      otherCells.push(...cells.slice(1))
    } else {
      otherCells.push(...cells)
    }

    // Extract current date
    if (dateCell !== undefined) { currentDateLabel = dateCell.textContent }
    const [
      hourCell,
      tempCell,
      _emptyCell1,
      windDirCell,
      windSpeedCell,
      gustSpeedCell,
      rainAmountCell,
      hygrometryCell,
      airPressureCell,
      weatherCell
    ] = otherCells
    const hour = hourCell?.textContent ?? null
    const temp = tempCell?.textContent ?? null
    const windDir = windDirCell?.querySelector('img')?.getAttribute('title') ?? null
    const [windDirName = null, windDirAngle = null] = windDir?.split(' : ') ?? []
    const windSpeed = windSpeedCell?.textContent ?? null
    const gustSpeed = gustSpeedCell?.textContent ?? null
    const rainAmount = rainAmountCell?.textContent === '--' ? null : (rainAmountCell?.textContent) ?? null
    const hygrometry = hygrometryCell?.textContent ?? null
    const airPressure = airPressureCell?.textContent ?? null
    const weather = weatherCell?.querySelector('img')?.getAttribute('title') ?? null

    // Deduce the actual date
    const rawDay = currentDateLabel
    const foundDate = rawDay?.slice(3) ?? '0'
    const pMonthFullDate = new Date(NOW)
    pMonthFullDate.setMonth(NOW.getMonth() - 1)
    pMonthFullDate.setDate(parseInt(foundDate))
    pMonthFullDate.setHours(parseInt(hour ?? '00'))
    const curMonthFullDate = new Date(NOW)
    curMonthFullDate.setDate(parseInt(foundDate))
    curMonthFullDate.setHours(parseInt(hour ?? '00'))
    const nMonthFullDate = new Date(NOW)
    nMonthFullDate.setMonth(NOW.getMonth() + 1)
    nMonthFullDate.setDate(parseInt(foundDate))
    nMonthFullDate.setHours(parseInt(hour ?? '00'))
    const eligibleDateTimesDiff = [
      Math.abs(NOW.getTime() - pMonthFullDate.getTime()),
      Math.abs(NOW.getTime() - curMonthFullDate.getTime()),
      Math.abs(NOW.getTime() - nMonthFullDate.getTime())
    ]
    const minDateDiff = Math.min(...eligibleDateTimesDiff)
    const indexOfMinDateDiff = eligibleDateTimesDiff.indexOf(minDateDiff)
    const date = indexOfMinDateDiff === 0
      ? pMonthFullDate
      : (indexOfMinDateDiff === 1
        ? curMonthFullDate
        : (indexOfMinDateDiff === 2
          ? nMonthFullDate
          : NOW
        )
      )
    
    jsonOutput.push({
      rawDay,
      readableDate: formatDate(date, '{{D}}{{th}} {{MMMM}} {{YYYY}}, {{H}}h', 'fr'),
      date: date.toISOString(),
      hour,
      tempCelcius: temp?.replace(' °C', ''),
      windSpeed,
      gustSpeed,
      windDirName,
      windDirAngleDeg: windDirAngle?.replace(' °', ''),
      rainAmount,
      hygrometryPercent: hygrometry?.replace(' %', ''),
      airPressureHpa: airPressure?.replace(' hPa', ''),
      weather
    })
  }

  return jsonOutput
}
