import { pgTable, uuid, text, timestamp, numeric, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const propertyStatusEnum = pgEnum('property_status', ['available', 'sold', 'reserved', 'upcoming'])
export const propertyTypeEnum = pgEnum('property_type', ['apartment', 'penthouse', 'bungalow', 'villa', 'commercial', 'farmhouse', 'duplex', 'studio'])

export const properties = pgTable('properties', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  type: propertyTypeEnum('type').notNull(),
  location: text('location').notNull(),
  area: text('area'),
  price: numeric('price', { precision: 15, scale: 2 }).notNull(),
  pricePerSqft: numeric('price_per_sqft', { precision: 10, scale: 2 }),
  bedrooms: integer('bedrooms'),
  bathrooms: integer('bathrooms'),
  sqft: integer('sqft'),
  status: propertyStatusEnum('status').default('available').notNull(),
  roi: numeric('roi', { precision: 5, scale: 2 }),
  developer: text('developer'),
  completionDate: text('completion_date'),
  relevance: text('relevance'),
  sampleHouse: boolean('sample_house').default(false),
  towerCount: integer('tower_count'),
  storeys: text('storeys'),
  totalUnits: text('total_units'),
  unitsPerFloor: text('units_per_floor'),
  specifications: text('specifications'),
  plotSize: jsonb('plot_size'),
  unitConfigurations: jsonb('unit_configurations').default(sql`'[]'::jsonb`).notNull(),
  sourceSheet: text('source_sheet'),
  featured: boolean('featured').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const propertyImages = pgTable('property_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  url: text('url').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const propertyAmenities = pgTable('property_amenities', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  name: text('name').notNull(),
})

export const propertyAppreciation = pgTable('property_appreciation', {
  id: uuid('id').primaryKey().defaultRandom(),
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  historicalRates: jsonb('historical_rates'),
  projectedRates: jsonb('projected_rates'),
  locationFactors: jsonb('location_factors'),
  investmentScore: numeric('investment_score', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ── Relations ─────────────────────────────────────────────────────────────────

export const propertiesRelations = relations(properties, ({ many }) => ({
  images: many(propertyImages),
  amenities: many(propertyAmenities),
  appreciation: many(propertyAppreciation),
}))

export const propertyImagesRelations = relations(propertyImages, ({ one }) => ({
  property: one(properties, { fields: [propertyImages.propertyId], references: [properties.id] }),
}))

export const propertyAmenitiesRelations = relations(propertyAmenities, ({ one }) => ({
  property: one(properties, { fields: [propertyAmenities.propertyId], references: [properties.id] }),
}))
