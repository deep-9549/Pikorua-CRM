"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  FileText,
  Filter,
  Home,
  LayoutGrid,
  List,
  MapPin,
  Phone,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Slider } from "@/components/ui/slider"
import {
  Property,
  PropertyUnitConfiguration,
  formatCurrency,
  leads,
  propertyAppreciations,
  propertyCallScripts,
  propertyTypes,
} from "@/lib/data"

const FALLBACK_PROPERTY_IMAGE = "/placeholder.jpg"

type ApiProperty = Record<string, unknown> & {
  images?: Array<string | { url?: string | null }>
  amenities?: Array<string | { name?: string | null }>
  appreciation?: unknown[]
}

type PropertyRecommendation = {
  lead: (typeof leads)[number]
  property: Property
  matchScore: number
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null
  const parsed = toNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

function toStringValue(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback
  return String(value)
}

function parseApiProperty(row: ApiProperty): Property {
  const imageUrls = Array.isArray(row.images)
    ? row.images
        .map((image) => typeof image === "string" ? image : image?.url)
        .filter((url): url is string => Boolean(url))
    : []

  const amenityNames = Array.isArray(row.amenities)
    ? row.amenities
        .map((amenity) => typeof amenity === "string" ? amenity : amenity?.name)
        .filter((name): name is string => Boolean(name))
    : []

  return {
    id: toStringValue(row.id),
    name: toStringValue(row.name, "Unnamed Property"),
    type: toStringValue(row.type, "apartment") as Property["type"],
    location: toStringValue(row.location, "Ahmedabad"),
    area: toStringValue(row.area ?? row.relevance, ""),
    price: toNumber(row.price),
    pricePerSqft: toNumber(row.pricePerSqft ?? row.price_per_sqft),
    bedrooms: toNumber(row.bedrooms),
    bathrooms: toNumber(row.bathrooms),
    sqft: toNumber(row.sqft),
    status: toStringValue(row.status, "available") as Property["status"],
    roi: toNumber(row.roi),
    images: imageUrls.length > 0 ? imageUrls : [FALLBACK_PROPERTY_IMAGE],
    amenities: amenityNames,
    developer: toStringValue(row.developer),
    completionDate: toStringValue(row.completionDate ?? row.completion_date),
    relevance: toStringValue(row.relevance, ""),
    sampleHouse: Boolean(row.sampleHouse ?? row.sample_house),
    towerCount: toNullableNumber(row.towerCount ?? row.tower_count),
    storeys: toStringValue(row.storeys, ""),
    totalUnits: toStringValue(row.totalUnits ?? row.total_units, ""),
    unitsPerFloor: toStringValue(row.unitsPerFloor ?? row.units_per_floor, ""),
    specifications: toStringValue(row.specifications, ""),
    plotSize: (row.plotSize ?? row.plot_size ?? null) as Property["plotSize"],
    unitConfigurations: Array.isArray(row.unitConfigurations)
      ? row.unitConfigurations as PropertyUnitConfiguration[]
      : Array.isArray(row.unit_configurations)
        ? row.unit_configurations as PropertyUnitConfiguration[]
        : [],
    featured: Boolean(row.featured),
  }
}

function getAIRecommendations(propertyRows: Property[]): PropertyRecommendation[] {
  const hotLeads = leads.filter((lead) => lead.tags.includes("hot") || lead.tags.includes("vip"))

  return hotLeads.slice(0, 4).flatMap((lead) => {
    const matchingProperty = propertyRows.find((property) => (
      lead.propertyInterest.includes(property.type) &&
      property.price >= lead.budgetMin * 0.8 &&
      property.price <= lead.budgetMax * 1.2 &&
      property.status === "available"
    ))

    if (!matchingProperty) return []

    const budgetFit = Math.max(
      0,
      12 - Math.round(Math.abs(matchingProperty.price - lead.budgetMax) / Math.max(lead.budgetMax, 1) * 12),
    )

    return [{
      lead,
      property: matchingProperty,
      matchScore: Math.min(97, 82 + budgetFit + (matchingProperty.sampleHouse ? 3 : 0)),
    }]
  })
}

function formatPropertyType(type: Property["type"]) {
  return propertyTypes.find((item) => item.value === type)?.label ?? type
}

function formatStatus(status: Property["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getStatusClass(status: Property["status"]) {
  return cn(
    "border",
    status === "available" && "border-success/20 bg-success/10 text-success",
    status === "reserved" && "border-warning/20 bg-warning/10 text-warning",
    status === "upcoming" && "border-info/20 bg-info/10 text-info",
    status === "sold" && "border-destructive/20 bg-destructive/10 text-destructive",
  )
}

function getConfigurationSummary(property: Property) {
  const configurations = property.unitConfigurations
    ?.map((unit) => unit.configuration)
    .filter(Boolean)

  if (configurations?.length) {
    return Array.from(new Set(configurations)).slice(0, 3).join(", ")
  }

  const fallback = [
    property.bedrooms > 0 ? `${property.bedrooms} BHK` : null,
    property.sqft > 0 ? `${property.sqft.toLocaleString()} sqft` : null,
  ].filter(Boolean)

  return fallback.join(" / ") || "Configuration pending"
}

function getPitchReadiness(property: Property) {
  if (property.status === "sold") return "Closed inventory"
  if (property.status === "reserved") return "Check hold before pitching"
  if (property.status === "upcoming") return "Good for pipeline nurturing"
  if (property.sampleHouse) return "Ready for site visit pitch"
  return "Ready for matching"
}

function getVisitNote(property: Property) {
  if (property.sampleHouse) return "Sample house available"
  if (property.status === "upcoming") return "Confirm launch timeline"
  return "Confirm visit slot with developer"
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string
  value: string | number
  detail: string
  icon: React.ElementType
}) {
  return (
    <motion.div variants={item}>
      <Card className="glass">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold leading-tight">{value}</p>
            <p className="truncate text-xs text-muted-foreground">{detail}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function BriefMetric({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/60 bg-muted/20 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-base font-semibold leading-snug">{value}</div>
    </div>
  )
}

function PropertyCard({
  property,
  view,
  onViewDetails,
}: {
  property: Property
  view: "grid" | "list"
  onViewDetails: (property: Property) => void
}) {
  const callScript = propertyCallScripts.find((script) => script.propertyId === property.id)
  const content = (
    <>
      <div className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        view === "grid" ? "h-36 w-full" : "h-28 w-full sm:h-auto sm:w-44",
      )}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${property.images[0]})` }}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <Badge className={getStatusClass(property.status)}>
            {formatStatus(property.status)}
          </Badge>
          {property.sampleHouse && (
            <Badge variant="secondary" className="border border-border/60 bg-card/90">
              Sample house
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold leading-tight">{property.name}</h3>
              {property.featured && <Badge variant="outline">Priority</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {[property.location, property.area].filter(Boolean).join(", ")}
              </span>
              <span>{formatPropertyType(property.type)}</span>
              {property.developer && <span>{property.developer}</span>}
            </div>
          </div>
          <div className="shrink-0 sm:text-right">
            <p className="text-xl font-semibold">{formatCurrency(property.price)}</p>
            {property.pricePerSqft > 0 && (
              <p className="text-xs text-muted-foreground">{formatCurrency(property.pricePerSqft)}/sqft</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Configuration</p>
            <p className="mt-1 font-medium">{getConfigurationSummary(property)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Visit readiness</p>
            <p className="mt-1 font-medium">{getVisitNote(property)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Sales cue</p>
            <p className="mt-1 font-medium">{getPitchReadiness(property)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {property.towerCount !== null && property.towerCount !== undefined && (
              <span className="rounded bg-muted px-2 py-1">{property.towerCount} towers</span>
            )}
            {property.totalUnits && <span className="rounded bg-muted px-2 py-1">{property.totalUnits} units</span>}
            {property.completionDate && <span className="rounded bg-muted px-2 py-1">{property.completionDate}</span>}
            {callScript && <span className="rounded bg-primary/10 px-2 py-1 text-primary">Script ready</span>}
          </div>
          <Button size="sm" className="gap-2" onClick={() => onViewDetails(property)}>
            <ClipboardList className="h-4 w-4" />
            Open Sales Brief
          </Button>
        </div>
      </CardContent>
    </>
  )

  return (
    <motion.div variants={item}>
      <Card
        className={cn(
          "glass overflow-hidden transition-colors hover:border-primary/30",
          view === "list" && "sm:flex",
        )}
      >
        {content}
      </Card>
    </motion.div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null

  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function PropertyDetailModal({
  property,
  onClose,
}: {
  property: Property | null
  onClose: () => void
}) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState("snapshot")

  React.useEffect(() => {
    setCurrentImageIndex(0)
    setActiveTab("snapshot")
  }, [property?.id])

  if (!property) return null

  const callScript = propertyCallScripts.find((script) => script.propertyId === property.id)
  const appreciation = propertyAppreciations.find((item) => item.propertyId === property.id)
  const imageUrl = property.images[currentImageIndex] ?? FALLBACK_PROPERTY_IMAGE
  const hasPropertyImage = imageUrl !== FALLBACK_PROPERTY_IMAGE

  return (
    <Dialog open={!!property} onOpenChange={() => onClose()}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[calc(100dvh-0.75rem)] w-full max-w-none flex-col overflow-hidden p-0 sm:h-[min(90vh,780px)] sm:w-[min(1040px,calc(100vw-2rem))] sm:max-w-none"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{property.name} sales brief</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 border-b border-border bg-card p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-4">
                {hasPropertyImage && (
                  <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${imageUrl})` }}
                    />
                    {property.images.length > 1 && (
                      <div className="absolute bottom-1 right-1 flex gap-1">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 bg-card/90"
                          onClick={() => setCurrentImageIndex((index) => (index - 1 + property.images.length) % property.images.length)}
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-6 w-6 bg-card/90"
                          onClick={() => setCurrentImageIndex((index) => (index + 1) % property.images.length)}
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge className={getStatusClass(property.status)}>{formatStatus(property.status)}</Badge>
                    <Badge variant="outline">{formatPropertyType(property.type)}</Badge>
                    {property.sampleHouse && <Badge variant="secondary">Sample house</Badge>}
                    {property.featured && <Badge variant="outline">Priority inventory</Badge>}
                  </div>
                  <h2 className="break-words text-2xl font-semibold tracking-tight">{property.name}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {[property.location, property.area].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <BriefMetric label="Base price" value={formatCurrency(property.price)} />
              <BriefMetric label="Configuration" value={getConfigurationSummary(property)} />
              <BriefMetric label="Visit cue" value={getVisitNote(property)} />
              <BriefMetric label="Sales status" value={getPitchReadiness(property)} />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-4 grid shrink-0 grid-cols-2 bg-muted/50 md:grid-cols-4">
            <TabsTrigger value="snapshot" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Snapshot
            </TabsTrigger>
            <TabsTrigger value="inventory" className="gap-2">
              <Building2 className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="visit" className="gap-2">
              <DoorOpen className="h-4 w-4" />
              Visit Prep
            </TabsTrigger>
            <TabsTrigger value="script" className="gap-2">
              <Phone className="h-4 w-4" />
              Call Notes
            </TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            <TabsContent value="snapshot" className="mt-4 space-y-5 data-[state=inactive]:hidden">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Sales Snapshot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Developer" value={property.developer || "Pending"} />
                    <DetailRow label="Completion" value={property.completionDate || "Pending"} />
                    <DetailRow label="Location" value={property.location} />
                    <DetailRow label="Area" value={property.area || "Pending"} />
                    <DetailRow label="Sample House" value={property.sampleHouse ? "Yes" : "No"} />
                    <DetailRow label="Expected ROI" value={property.roi > 0 ? `${property.roi}%` : "Pending"} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Project Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DetailRow label="Towers" value={property.towerCount} />
                    <DetailRow label="Storeys" value={property.storeys} />
                    <DetailRow label="Total Units" value={property.totalUnits} />
                    <DetailRow label="Units Per Floor" value={property.unitsPerFloor} />
                    <DetailRow label="Super Built Area" value={property.plotSize?.superbuilt_area} />
                    <DetailRow label="Carpet Area" value={property.plotSize?.carpet_area} />
                  </CardContent>
                </Card>
              </div>

              {property.specifications && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Internal Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {property.specifications}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="inventory" className="mt-4 space-y-5 data-[state=inactive]:hidden">
              {property.unitConfigurations && property.unitConfigurations.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {property.unitConfigurations.map((unit, index) => (
                    <div key={`${unit.configuration}-${index}`} className="rounded-lg border border-border/70 bg-card p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <Badge variant="outline">{unit.configuration}</Badge>
                        {unit.price && <span className="font-semibold">{unit.price}</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <DetailRow label="Area" value={unit.area_sqft ? `${unit.area_sqft} sqft` : null} />
                        <DetailRow label="Carpet" value={unit.carpet_area_sqft ? `${unit.carpet_area_sqft} sqft` : null} />
                        <DetailRow label="Basic Rate" value={unit.basic_rate} />
                        <DetailRow label="Min Price" value={unit.price_min ? formatCurrency(unit.price_min) : null} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                  <h3 className="font-semibold">Unit configuration is not uploaded yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sales users can still pitch from the base project details, but exact unit options are pending.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="visit" className="mt-4 space-y-5 data-[state=inactive]:hidden">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border/70 bg-card p-4">
                  <CheckCircle2 className="mb-3 h-5 w-5 text-success" />
                  <h3 className="font-semibold">Before Calling</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Check status, available configuration, price band, and whether the sample house can be shown.
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card p-4">
                  <Calendar className="mb-3 h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Visit Positioning</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{getVisitNote(property)}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card p-4">
                  <Shield className="mb-3 h-5 w-5 text-warning" />
                  <h3 className="font-semibold">Availability Check</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {property.status === "available"
                      ? "Pitchable now. Confirm final inventory before commitment."
                      : `${formatStatus(property.status)} status. Confirm before promising availability.`}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Facilities To Mention</CardTitle>
                </CardHeader>
                <CardContent>
                  {property.amenities.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity, index) => (
                        <Badge key={`${amenity}-${index}`} variant="secondary" className="px-3 py-1">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Facilities are pending in the inventory sheet.</p>
                  )}
                </CardContent>
              </Card>

              {(property.roi > 0 || appreciation) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Investment Talking Points</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {property.roi > 0 && (
                      <div className="flex items-center gap-2 rounded-lg bg-success/5 p-3 text-success">
                        <TrendingUp className="h-4 w-4" />
                        <span>Expected ROI: {property.roi}%</span>
                      </div>
                    )}
                    {appreciation?.locationFactors?.map((factor, index) => (
                      <div key={`${factor}-${index}`} className="rounded-lg border border-border/70 p-3">
                        {factor}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="script" className="mt-4 space-y-5 data-[state=inactive]:hidden">
              {callScript ? (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Phone className="h-4 w-4 text-primary" />
                        Opening
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {callScript.introduction}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Star className="h-4 w-4 text-primary" />
                        Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {callScript.keyHighlights.map((highlight, index) => (
                        <div key={`${highlight}-${index}`} className="rounded-lg border border-border/70 p-3 text-sm">
                          {highlight}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Objection Handling</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {callScript.objectionHandling.map((scriptItem, index) => (
                        <div key={`${scriptItem.objection}-${index}`} className="rounded-lg bg-muted/30 p-3 text-sm">
                          <p className="font-medium">Objection: &quot;{scriptItem.objection}&quot;</p>
                          <p className="mt-1 text-muted-foreground">Response: {scriptItem.response}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                  <h3 className="font-semibold">No property-specific script yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Use the general scripts tab, then tailor the pitch with the snapshot and visit prep above.
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default function PropertiesPage() {
  const [view, setView] = React.useState<"grid" | "list">("list")
  const [search, setSearch] = React.useState("")
  const [locationFilter, setLocationFilter] = React.useState<string>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [budgetRange, setBudgetRange] = React.useState([0, 200000000])
  const [properties, setProperties] = React.useState<Property[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [showFilters, setShowFilters] = React.useState(false)
  const [showRecommendations, setShowRecommendations] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    async function loadProperties() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/properties", { cache: "no-store" })
        const payload = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(payload?.message ?? payload?.error ?? "Unable to load properties")
        }

        const rows = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.properties)
            ? payload.properties
            : []

        if (!cancelled) setProperties(rows.map((row: ApiProperty) => parseApiProperty(row)))
      } catch (err) {
        if (!cancelled) {
          setProperties([])
          setError(err instanceof Error ? err.message : "Unable to load properties")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadProperties()

    return () => {
      cancelled = true
    }
  }, [])

  const aiRecommendations = React.useMemo(() => getAIRecommendations(properties), [properties])

  const locationOptions = React.useMemo(() => {
    return [...new Set(properties.map((property) => property.location).filter(Boolean))].sort()
  }, [properties])

  const maxBudget = React.useMemo(() => {
    return Math.max(200000000, ...properties.map((property) => property.price))
  }, [properties])

  const stats = React.useMemo(() => {
    const available = properties.filter((property) => property.status === "available").length
    const sampleHouses = properties.filter((property) => property.sampleHouse).length
    const withUnitData = properties.filter((property) => property.unitConfigurations?.length).length
    const reservedOrUpcoming = properties.filter((property) => property.status === "reserved" || property.status === "upcoming").length

    return { available, sampleHouses, withUnitData, reservedOrUpcoming }
  }, [properties])

  const filteredProperties = React.useMemo(() => {
    return properties.filter((property) => {
      if (search) {
        const searchLower = search.toLowerCase()
        const searchableText = [
          property.name,
          property.location,
          property.area,
          property.developer,
          property.relevance,
          getConfigurationSummary(property),
        ].join(" ").toLowerCase()

        if (!searchableText.includes(searchLower)) return false
      }

      if (locationFilter !== "all" && property.location !== locationFilter) return false
      if (typeFilter !== "all" && property.type !== typeFilter) return false
      if (statusFilter !== "all" && property.status !== statusFilter) return false
      if (property.price < budgetRange[0] || property.price > budgetRange[1]) return false

      return true
    })
  }, [properties, search, locationFilter, typeFilter, statusFilter, budgetRange])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Properties</h1>
          <p className="mt-1 text-muted-foreground">
            Internal property inventory for matching leads, preparing calls, and booking site visits.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={() => setShowRecommendations(true)}
        >
          <Sparkles className="h-4 w-4" />
          Lead Matches
          {aiRecommendations.length > 0 && (
            <Badge className="ml-1 flex h-5 w-5 items-center justify-center p-0">
              {aiRecommendations.length}
            </Badge>
          )}
        </Button>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Inventory" value={properties.length} detail="All active CRM properties" icon={Building2} />
        <SummaryCard title="Available" value={stats.available} detail="Can be pitched after final check" icon={CheckCircle2} />
        <SummaryCard title="Sample Houses" value={stats.sampleHouses} detail="Useful for visit conversion" icon={Home} />
        <SummaryCard title="Pipeline Stock" value={stats.reservedOrUpcoming} detail="Reserved or upcoming inventory" icon={TrendingUp} />
      </div>

      <motion.div variants={item} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:min-w-72 sm:flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search project, developer, location, configuration..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>

        <SearchableSelect
          value={locationFilter}
          onValueChange={setLocationFilter}
          options={[
            { value: "all", label: "All Locations" },
            ...locationOptions.map((location) => ({ value: location, label: location })),
          ]}
          placeholder="Location"
          searchPlaceholder="Search locations..."
          triggerClassName="w-full sm:w-44"
        />

        <SearchableSelect
          value={typeFilter}
          onValueChange={setTypeFilter}
          options={[
            { value: "all", label: "All Types" },
            ...propertyTypes.map((type) => ({ value: type.value, label: type.label })),
          ]}
          placeholder="Type"
          searchPlaceholder="Search types..."
          triggerClassName="w-full sm:w-40"
        />

        <SearchableSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: "all", label: "All Status" },
            { value: "available", label: "Available" },
            { value: "reserved", label: "Reserved" },
            { value: "upcoming", label: "Upcoming" },
            { value: "sold", label: "Sold" },
          ]}
          placeholder="Status"
          searchPlaceholder="Search status..."
          triggerClassName="w-full sm:w-40"
        />

        <Button
          variant="outline"
          className={cn("gap-2", showFilters && "border-primary/30 bg-primary/10")}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          Price
        </Button>

        <div className="flex items-center rounded-lg border border-border p-1">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">Price Range</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(budgetRange[0])} - {formatCurrency(budgetRange[1])}
                    </span>
                  </div>
                  <Slider
                    value={budgetRange}
                    onValueChange={setBudgetRange}
                    min={0}
                    max={maxBudget}
                    step={5000000}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={item} className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>{isLoading ? "Loading inventory..." : `${filteredProperties.length} properties in current view`}</span>
        <span>{stats.withUnitData} properties include unit-level configuration data</span>
      </motion.div>

      {isLoading && (
        <motion.div variants={item} className="grid gap-4">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="overflow-hidden sm:flex">
              <div className="h-28 animate-pulse bg-muted sm:w-44" />
              <CardContent className="flex-1 space-y-3 p-4">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="h-14 animate-pulse rounded bg-muted" />
                  <div className="h-14 animate-pulse rounded bg-muted" />
                  <div className="h-14 animate-pulse rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {error && !isLoading && (
        <motion.div variants={item} className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </motion.div>
      )}

      {!isLoading && !error && (
        <motion.div
          variants={container}
          className={cn(
            "grid gap-4",
            view === "grid" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1",
          )}
        >
          {filteredProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              view={view}
              onViewDetails={setSelectedProperty}
            />
          ))}
        </motion.div>
      )}

      {!isLoading && !error && filteredProperties.length === 0 && (
        <motion.div variants={item} className="rounded-lg border border-dashed border-border p-12 text-center">
          <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No matching inventory</h3>
          <p className="mt-1 text-muted-foreground">Adjust filters or search another project, developer, or location.</p>
        </motion.div>
      )}

      <PropertyDetailModal
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />

      <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Lead Matches
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            {aiRecommendations.length > 0 ? (
              aiRecommendations.map((recommendation) => (
                <button
                  key={`${recommendation.lead.id}-${recommendation.property.id}`}
                  className="w-full rounded-lg border border-border/70 bg-card p-4 text-left transition-colors hover:border-primary/40"
                  onClick={() => {
                    setSelectedProperty(recommendation.property)
                    setShowRecommendations(false)
                  }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div
                      className="h-24 w-full shrink-0 rounded-lg bg-muted bg-cover bg-center sm:w-28"
                      style={{ backgroundImage: `url(${recommendation.property.images[0]})` }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-semibold">{recommendation.property.name}</h4>
                        <Badge className="border-success/20 bg-success/10 text-success">
                          {recommendation.matchScore}% fit
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Match for {recommendation.lead.name}: {recommendation.lead.propertyInterest.join(", ")} in {recommendation.lead.location}
                      </p>
                      <p className="mt-2 text-sm">
                        {formatCurrency(recommendation.property.price)} | {getConfigurationSummary(recommendation.property)} | {getVisitNote(recommendation.property)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                <h3 className="font-semibold">No lead matches right now</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add or qualify hot leads to surface property matches for sales follow-up.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
