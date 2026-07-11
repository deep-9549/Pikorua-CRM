const assert = require('node:assert/strict')
const { test } = require('node:test')
const { ForbiddenException } = require('@nestjs/common')
const {
  buildPropertyRecommendations,
  parseBudgetRange,
} = require('../dist/modules/properties/property-recommendation.matcher')
const {
  MetaLeadsController,
} = require('../dist/modules/meta-leads/meta-leads.controller')

function property(overrides) {
  return {
    id: 'property-id',
    name: 'Amaris',
    type: 'apartment',
    location: 'Gota',
    area: 'Pre-Launch',
    price: 26000000,
    status: 'available',
    developer: 'Adani',
    sampleHouse: true,
    featured: true,
    roi: 8,
    unitConfigurations: [
      { configuration: '4 BHK', price: '2.60 Cr', area_sqft: '2500' },
      { configuration: '5 BHK', price: '3.20 Cr', area_sqft: '3100' },
    ],
    ...overrides,
  }
}

test('budget parser supports CRM budget labels', () => {
  assert.deepEqual(parseBudgetRange('1 Cr'), { label: '1 Cr', max: 10000000, isOpenEnded: false })
  assert.deepEqual(parseBudgetRange('10 Cr'), { label: '10 Cr', max: 100000000, isOpenEnded: false })
  assert.deepEqual(parseBudgetRange('21 Cr+'), { label: '21 Cr+', max: 210000000, isOpenEnded: true })
  assert.equal(parseBudgetRange('not sure'), null)
  assert.equal(parseBudgetRange(null), null)
})

test('recommendations rank exact, stretch, configuration and location matches', () => {
  const recommendations = buildPropertyRecommendations([
    property({ id: 'exact', price: 26000000 }),
    property({ id: 'stretch', name: 'Stretch Tower', price: 33000000, unitConfigurations: [{ configuration: '4 BHK', price: '3.25 Cr' }] }),
    property({ id: 'sold', status: 'sold', price: 20000000 }),
    property({ id: 'over', name: 'Too High', price: 50000000, unitConfigurations: [{ configuration: '4 BHK', price: '5 Cr' }] }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    currentArea: 'Gota',
    currentCity: 'Ahmedabad',
    limit: 10,
  })

  assert.deepEqual(recommendations.map(item => item.property.id), ['exact', 'stretch'])
  assert.equal(recommendations[0].score > recommendations[1].score, true)
  assert.equal(recommendations[0].matched_units[0].configuration, '4 BHK')
  assert.equal(recommendations[1].warnings.some(warning => warning.includes('stretch')), true)
})

test('preferred locations drive location match reasons', () => {
  const recommendations = buildPropertyRecommendations([
    property({ id: 'preferred', location: 'Science City', area: 'Ahmedabad' }),
    property({ id: 'current-area', location: 'Baner', area: 'Pune' }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    preferredLocations: ['Science City'],
    currentArea: 'Baner',
    currentCity: 'Pune',
    limit: 10,
  })

  assert.equal(recommendations[0].property.id, 'preferred')
  assert.equal(recommendations[0].match_reasons.some(reason => reason.includes('Preferred location matches Science City')), true)
})

test('selected location ranks ahead of default priority areas', () => {
  const recommendations = buildPropertyRecommendations([
    property({ id: 'selected', name: 'Local Apartment', location: 'Thaltej', area: 'Ahmedabad', featured: false }),
    property({ id: 'default-top', name: 'Maruti 360', location: 'Iskon Ambli', area: 'Ahmedabad' }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    preferredLocations: ['Thaltej'],
    limit: 10,
  })

  assert.deepEqual(recommendations.map(item => item.property.id), ['selected', 'default-top'])
  assert.equal(recommendations[0].match_reasons.some(reason => reason.includes('Preferred location matches Thaltej')), true)
})

test('apartments treat 3, 4 and 5 BHK as flexible configurations', () => {
  const recommendations = buildPropertyRecommendations([
    property({
      id: 'flex-apartment',
      name: 'Maruti 360',
      price: 28000000,
      unitConfigurations: [
        { configuration: '3 BHK', price: '2.80 Cr' },
        { configuration: '5 BHK', price: '3.40 Cr' },
      ],
    }),
    property({
      id: 'villa',
      type: 'villa',
      price: 28000000,
      unitConfigurations: [
        { configuration: '3 BHK', price: '2.80 Cr' },
      ],
    }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    limit: 10,
  })

  assert.equal(recommendations[0].property.id, 'flex-apartment')
  assert.deepEqual(recommendations[0].matched_units.map(unit => unit.configuration), ['3 BHK', '5 BHK'])
  assert.equal(recommendations[0].match_reasons.some(reason => reason.includes('flexible across 3, 4, and 5 BHK')), true)
})

test('top apartment priority can beat exact budget within 20 percent stretch', () => {
  const recommendations = buildPropertyRecommendations([
    property({ id: 'exact-tertiary', name: 'Regular Apartment', price: 30000000, unitConfigurations: [{ configuration: '4 BHK', price: '3 Cr' }] }),
    property({ id: 'priority-stretch', name: 'GODREJ ALTUS', price: 35000000, unitConfigurations: [{ configuration: '4 BHK', price: '3.5 Cr' }] }),
    property({ id: 'too-high', name: 'Bellagio', price: 37000000, unitConfigurations: [{ configuration: '4 BHK', price: '3.7 Cr' }] }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    limit: 10,
  })

  assert.deepEqual(recommendations.map(item => item.property.id), ['priority-stretch', 'exact-tertiary'])
  assert.equal(recommendations[0].warnings.some(warning => warning.includes('stretch')), true)
})

test('same priority band sorts closest to budget first', () => {
  const recommendations = buildPropertyRecommendations([
    property({ id: 'far-below', name: 'Ikebana', location: 'Sindhu Bhavan Road', price: 26000000, unitConfigurations: [{ configuration: '4 BHK', price: '2.6 Cr' }] }),
    property({ id: 'near-above', name: 'Maruti 360', location: 'Iskon Ambli Road', price: 31000000, unitConfigurations: [{ configuration: '4 BHK', price: '3.1 Cr' }] }),
    property({ id: 'far-above', name: 'Belagio', location: 'Iskon Ambli Road', price: 35000000, unitConfigurations: [{ configuration: '4 BHK', price: '3.5 Cr' }] }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    limit: 10,
  })

  assert.deepEqual(recommendations.map(item => item.property.id), ['near-above', 'far-below', 'far-above'])
})

test('tertiary apartments are hidden until needed to fill the requested results', () => {
  const enoughRecommendations = buildPropertyRecommendations([
    property({ id: 'tertiary-backup', name: 'Regular Apartment', location: 'Gota', featured: false }),
    property({ id: 'top-project', name: 'Venus Universe', location: 'Vastrapur' }),
    property({ id: 'secondary-project', name: 'Satyamev Luxor', location: 'Vastrapur' }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    preferredLocations: ['Science City'],
    limit: 2,
  })

  assert.deepEqual(enoughRecommendations.map(item => item.property.id), ['top-project', 'secondary-project'])

  const needsFillerRecommendations = buildPropertyRecommendations([
    property({ id: 'tertiary-backup', name: 'Regular Apartment', location: 'Gota', featured: false }),
    property({ id: 'top-project', name: 'Venus Universe', location: 'Vastrapur' }),
  ], {
    budgetRange: '3 Cr',
    configuration: ['4 BHK'],
    preferredLocations: ['Science City'],
    limit: 2,
  })

  assert.deepEqual(needsFillerRecommendations.map(item => item.property.id), ['top-project', 'tertiary-backup'])
})

test('recommendation endpoint preserves assigned-lead access boundary', async () => {
  const controller = new MetaLeadsController({
    propertyRecommendations: async () => ({
      lead: { assigned_to: 'owner-id' },
      recommendations: [],
    }),
  })

  await assert.rejects(
    controller.propertyRecommendations('lead-id', { id: 'other-user', role: 'sales_executive' }, '3 Cr'),
    error => error instanceof ForbiddenException,
  )

  assert.deepEqual(
    await controller.propertyRecommendations('lead-id', { id: 'admin-id', role: 'super_admin' }, '3 Cr'),
    { recommendations: [] },
  )
})
