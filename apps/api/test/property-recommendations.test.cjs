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
