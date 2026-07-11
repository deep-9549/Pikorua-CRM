import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import XLSX from 'xlsx'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'
const DEFAULT_IMAGE_URL = '/placeholder.jpg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '../../..')

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) continue

    const equalsAt = line.indexOf('=')
    const key = line.slice(0, equalsAt).trim()
    let value = line.slice(equalsAt + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv(path.join(repoRoot, '.env'))
loadEnv(path.join(__dirname, '..', '.env'))

function clean(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text || text === '*' || text.toLowerCase() === 'nan') return null
  return text
}

function parseFirstNumber(value) {
  const text = clean(value)
  if (!text) return null
  const match = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : null
}

function parseInteger(value) {
  const parsed = parseFirstNumber(value)
  return parsed === null ? null : Math.trunc(parsed)
}

function parseMinPrice(value) {
  const text = clean(value)
  if (!text) return null

  const normalized = text
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/crore/g, '')
    .replace(/cr/g, '')
    .replace(/\+/g, '')
    .trim()

  const match = normalized.match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]) * 10000000 : null
}

function normalizePropertyType(value) {
  const text = (clean(value) ?? 'apartment').toLowerCase()
  if (text.includes('plot')) return 'plot'
  if (text.includes('villa')) return 'villa'
  if (text.includes('bungalow')) return 'bungalow'
  if (text.includes('commercial')) return 'commercial'
  if (text.includes('farm')) return 'farmhouse'
  if (text.includes('penthouse')) return 'penthouse'
  if (text.includes('duplex')) return 'duplex'
  if (text.includes('studio')) return 'studio'
  return 'apartment'
}

function buildAmenities(specifications, sampleHouse) {
  const amenities = []
  const sample = clean(sampleHouse)
  if (sample) amenities.push(`Sample House: ${sample}`)

  for (const part of (clean(specifications) ?? '').split(/[,;]/)) {
    const value = part.trim().replace(/[.]+$/, '')
    if (value && !amenities.includes(value)) amenities.push(value)
  }

  return amenities.slice(0, 10)
}

function workbookRows(filePath) {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null })
  if (rows.length < 3) throw new Error('Expected a header row, subheader row, and property rows')

  const topHeaders = []
  let currentGroup = ''
  for (const cell of rows[0]) {
    const value = clean(cell)
    if (value) currentGroup = value
    topHeaders.push(currentGroup)
  }

  const subHeaders = rows[1].map((cell) => clean(cell) ?? '')

  function get(row, group, subHeader = '') {
    const index = topHeaders.findIndex((top, colIndex) => {
      if (top !== group) return false
      if (!subHeader) return true
      return subHeaders[colIndex] === subHeader
    })
    return index === -1 ? null : row[index]
  }

  return rows.slice(2).map((row) => ({ row, get, sheetName }))
}

function normalizeRows(filePath) {
  return workbookRows(filePath)
    .map(({ row, get, sheetName }) => {
      const name = clean(get(row, 'Name'))
      if (!name) return null

      const unitConfigurations = [
        ['3 BHK', 3],
        ['4 BHK', 4],
        ['5 BHK', 5],
        ['Penthouse', null],
        ['Duplex', null],
      ].flatMap(([configuration, bedrooms]) => {
        const areaSqft = clean(get(row, configuration, 'Area (sqft)'))
        const carpetAreaSqft = clean(get(row, configuration, 'carpet area'))
        const basicRate = clean(get(row, configuration, 'Basic Rate'))
        const price = clean(get(row, configuration, 'Price (Cr)'))

        if (!areaSqft && !carpetAreaSqft && !basicRate && !price) return []
        return [{
          configuration,
          bedrooms,
          area_sqft: areaSqft,
          carpet_area_sqft: carpetAreaSqft,
          basic_rate: basicRate,
          price,
          price_min: parseMinPrice(price),
        }]
      })

      const priceValues = unitConfigurations
        .map((unit) => unit.price_min)
        .filter((value) => typeof value === 'number' && Number.isFinite(value))
      const primaryUnit = unitConfigurations.find((unit) => unit.area_sqft) ?? unitConfigurations[0] ?? {}
      const price = priceValues.length > 0 ? Math.min(...priceValues) : 0
      const sqft = parseInteger(primaryUnit.area_sqft) ?? 0
      const relevance = clean(get(row, 'Relevance'))
      const specifications = clean(get(row, 'Specifications'))

      return {
        name,
        type: normalizePropertyType(get(row, 'Type')),
        developer: clean(get(row, 'Developer')),
        relevance,
        location: clean(get(row, 'Location')) ?? 'Ahmedabad',
        area: relevance,
        price,
        pricePerSqft: price && sqft ? Number((price / sqft).toFixed(2)) : null,
        bedrooms: primaryUnit.bedrooms ?? 0,
        bathrooms: primaryUnit.bedrooms ?? 0,
        sqft,
        status: 'available',
        roi: 0,
        completionDate: clean(get(row, 'Possession')),
        sampleHouse: (clean(get(row, 'Sample House')) ?? '').toLowerCase() === 'yes',
        towerCount: parseInteger(get(row, 'Tower')),
        storeys: clean(get(row, 'Storeys')),
        totalUnits: clean(get(row, 'Units')),
        unitsPerFloor: clean(get(row, 'Units Per floor')),
        specifications,
        plotSize: {
          superbuilt_area: clean(get(row, 'Plot Size', 'Superbuild up area')),
          carpet_area: clean(get(row, 'Plot Size', 'carpet area')),
        },
        unitConfigurations,
        amenities: buildAmenities(specifications, get(row, 'Sample House')),
        sourceSheet: sheetName,
      }
    })
    .filter(Boolean)
}

async function upsertProperty(sql, property) {
  const existing = await sql`
    select id
    from properties
    where tenant_id = ${DEFAULT_TENANT_ID}
      and lower(name) = lower(${property.name})
      and lower(coalesce(developer, '')) = lower(coalesce(${property.developer}, ''))
      and deleted_at is null
    limit 1
  `

  if (existing.length > 0) {
    await sql`
      update properties
      set
        type = ${property.type},
        location = ${property.location},
        area = ${property.area},
        price = ${property.price},
        price_per_sqft = ${property.pricePerSqft},
        bedrooms = ${property.bedrooms},
        bathrooms = ${property.bathrooms},
        sqft = ${property.sqft},
        status = ${property.status},
        roi = ${property.roi},
        completion_date = ${property.completionDate},
        relevance = ${property.relevance},
        sample_house = ${property.sampleHouse},
        tower_count = ${property.towerCount},
        storeys = ${property.storeys},
        total_units = ${property.totalUnits},
        units_per_floor = ${property.unitsPerFloor},
        specifications = ${property.specifications},
        plot_size = ${sql.json(property.plotSize)},
        unit_configurations = ${sql.json(property.unitConfigurations)},
        source_sheet = ${property.sourceSheet},
        updated_at = now()
      where id = ${existing[0].id}
    `
    return existing[0].id
  }

  const inserted = await sql`
    insert into properties (
      tenant_id, name, type, location, area, price, price_per_sqft,
      bedrooms, bathrooms, sqft, status, roi, developer, completion_date,
      relevance, sample_house, tower_count, storeys, total_units,
      units_per_floor, specifications, plot_size, unit_configurations,
      source_sheet, featured
    )
    values (
      ${DEFAULT_TENANT_ID}, ${property.name}, ${property.type}, ${property.location},
      ${property.area}, ${property.price}, ${property.pricePerSqft},
      ${property.bedrooms}, ${property.bathrooms}, ${property.sqft},
      ${property.status}, ${property.roi}, ${property.developer},
      ${property.completionDate}, ${property.relevance}, ${property.sampleHouse},
      ${property.towerCount}, ${property.storeys}, ${property.totalUnits},
      ${property.unitsPerFloor}, ${property.specifications},
      ${sql.json(property.plotSize)}, ${sql.json(property.unitConfigurations)},
      ${property.sourceSheet}, false
    )
    returning id
  `

  return inserted[0].id
}

async function syncAmenities(sql, propertyId, amenities) {
  for (const amenity of amenities) {
    await sql`
      insert into property_amenities (property_id, name)
      select ${propertyId}, ${amenity}
      where not exists (
        select 1 from property_amenities
        where property_id = ${propertyId} and lower(name) = lower(${amenity})
      )
    `
  }
}

async function ensureImage(sql, propertyId) {
  const existing = await sql`
    select id from property_images where property_id = ${propertyId} limit 1
  `
  if (existing.length > 0) return

  await sql`
    insert into property_images (property_id, url, caption, sort_order)
    values (${propertyId}, ${DEFAULT_IMAGE_URL}, 'Property inventory placeholder', 0)
  `
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const filePath = args.find((arg) => !arg.startsWith('--')) ?? 'C:/Users/adati/Downloads/Book1.xlsx'
  if (!fs.existsSync(filePath)) throw new Error(`Excel file not found: ${filePath}`)

  const rows = normalizeRows(filePath)
  if (rows.length === 0) throw new Error('No property rows found in workbook')

  if (dryRun) {
    console.log(JSON.stringify({
      filePath,
      count: rows.length,
      first: rows[0],
      last: rows.at(-1),
    }, null, 2))
    return
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')

  const sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === 'true' ? 'require' : false,
    max: 1,
  })

  try {
    await sql.begin(async (tx) => {
      for (const property of rows) {
        const propertyId = await upsertProperty(tx, property)
        await syncAmenities(tx, propertyId, property.amenities)
        await ensureImage(tx, propertyId)
      }
    })

    console.log(`Imported ${rows.length} properties from ${filePath}`)
  } finally {
    await sql.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
