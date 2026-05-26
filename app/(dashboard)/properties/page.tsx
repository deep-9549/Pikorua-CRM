"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Bed,
  Bath,
  Square,
  TrendingUp,
  Heart,
  Share2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Phone,
  Calendar,
  FileText,
  Building2,
  DollarSign,
  BarChart3,
  Star,
  Wifi,
  Car,
  Dumbbell,
  Waves,
  Trees,
  Shield,
  Home,
  Zap
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import {
  properties,
  Property,
  locations,
  propertyTypes,
  formatCurrency,
  propertyCallScripts,
  propertyAppreciations,
  leads
} from "@/lib/data"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

// AI Recommendations based on leads
function getAIRecommendations() {
  const hotLeads = leads.filter(l => l.tags.includes('hot') || l.tags.includes('vip'))
  const recommendations = []
  
  for (const lead of hotLeads.slice(0, 3)) {
    const matchingProperties = properties.filter(p => 
      lead.propertyInterest.includes(p.type) &&
      p.price >= lead.budgetMin * 0.8 &&
      p.price <= lead.budgetMax * 1.2 &&
      p.status === 'available'
    )
    
    if (matchingProperties.length > 0) {
      recommendations.push({
        lead,
        property: matchingProperties[0],
        matchScore: Math.floor(85 + Math.random() * 10)
      })
    }
  }
  
  return recommendations
}

function getAmenityIcon(amenity: string) {
  const lower = amenity.toLowerCase()
  if (lower.includes('pool') || lower.includes('sea')) return Waves
  if (lower.includes('gym') || lower.includes('fitness')) return Dumbbell
  if (lower.includes('parking') || lower.includes('valet')) return Car
  if (lower.includes('garden') || lower.includes('terrace')) return Trees
  if (lower.includes('smart') || lower.includes('home')) return Wifi
  if (lower.includes('security') || lower.includes('concierge')) return Shield
  return Star
}

function PropertyCard({
  property,
  onViewDetails
}: {
  property: Property
  onViewDetails: (property: Property) => void
}) {
  const [isLiked, setIsLiked] = React.useState(false)

  return (
    <motion.div variants={item}>
      <Card className="glass group overflow-hidden hover:shadow-luxury-lg transition-all duration-300">
        {/* Image */}
        <div className="relative h-56 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{ backgroundImage: `url(${property.images[0]})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={cn(
              "text-[10px] font-semibold",
              property.status === "available" && "bg-success text-success-foreground",
              property.status === "sold" && "bg-destructive text-destructive-foreground",
              property.status === "reserved" && "bg-warning text-warning-foreground",
              property.status === "upcoming" && "bg-info text-info-foreground"
            )}>
              {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
            </Badge>
            {property.featured && (
              <Badge className="text-[10px] font-semibold bg-primary/90 text-primary-foreground">
                Featured
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsLiked(!isLiked)
              }}
            >
              <Heart className={cn("w-4 h-4", isLiked && "fill-destructive text-destructive")} />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-card/80 backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {/* View Details Button */}
          <Button
            variant="secondary"
            size="sm"
            className="absolute bottom-3 right-3 gap-1 bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onViewDetails(property)}
          >
            <Eye className="w-3 h-3" />
            View Details
          </Button>

          {/* Price */}
          <div className="absolute bottom-3 left-3">
            <p className="text-2xl font-bold text-white">
              {formatCurrency(property.price)}
            </p>
            <p className="text-xs text-white/80">
              {formatCurrency(property.pricePerSqft)}/sqft
            </p>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4 cursor-pointer" onClick={() => onViewDetails(property)}>
          <div className="mb-3">
            <h3 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
              {property.name}
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {property.location}, {property.area}
            </div>
          </div>

          {/* Features */}
          <div className="flex items-center gap-4 mb-4 text-sm">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4 text-muted-foreground" />
                <span>{property.bedrooms} Beds</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Bath className="w-4 h-4 text-muted-foreground" />
              <span>{property.bathrooms} Baths</span>
            </div>
            <div className="flex items-center gap-1">
              <Square className="w-4 h-4 text-muted-foreground" />
              <span>{property.sqft.toLocaleString()} sqft</span>
            </div>
          </div>

          {/* ROI & Type */}
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs">
              {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
            </Badge>
            <div className="flex items-center gap-1 text-success">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-semibold">{property.roi}% ROI</span>
            </div>
          </div>

          {/* Amenities Preview */}
          <div className="mt-3 flex flex-wrap gap-1">
            {property.amenities.slice(0, 3).map((amenity, index) => (
              <span
                key={index}
                className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {amenity}
              </span>
            ))}
            {property.amenities.length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
                +{property.amenities.length - 3} more
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PropertyDetailModal({
  property,
  onClose
}: {
  property: Property | null
  onClose: () => void
}) {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState("overview")

  if (!property) return null

  const callScript = propertyCallScripts.find(s => s.propertyId === property.id)
  const appreciation = propertyAppreciations.find(a => a.propertyId === property.id)
  
  // Generate default appreciation if none exists
  const defaultAppreciation = {
    historicalRates: [
      { year: 2020, rate: 6 },
      { year: 2021, rate: 7.5 },
      { year: 2022, rate: 8.5 },
      { year: 2023, rate: 9.5 }
    ],
    projectedRates: [
      { years: 3, estimatedValue: property.price * 1.25, appreciationPercent: 25 },
      { years: 5, estimatedValue: property.price * 1.45, appreciationPercent: 45 },
      { years: 10, estimatedValue: property.price * 2, appreciationPercent: 100 },
      { years: 15, estimatedValue: property.price * 2.8, appreciationPercent: 180 }
    ],
    locationFactors: ['Prime location', 'Growing infrastructure', 'High demand area'],
    investmentScore: 75 + Math.floor(Math.random() * 20)
  }

  const appreciationData = appreciation || defaultAppreciation

  return (
    <Dialog open={!!property} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] overflow-hidden p-0 flex flex-col">
        {/* Header with Image */}
        <div className="relative h-56 shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${property.images[currentImageIndex]})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          
          {/* Navigation Arrows */}
          {property.images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card"
                onClick={() => setCurrentImageIndex((i) => (i - 1 + property.images.length) % property.images.length)}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card"
                onClick={() => setCurrentImageIndex((i) => (i + 1) % property.images.length)}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* Property Info */}
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={cn(
                    "text-xs",
                    property.status === "available" && "bg-success text-success-foreground",
                    property.status === "sold" && "bg-destructive text-destructive-foreground",
                    property.status === "reserved" && "bg-warning text-warning-foreground",
                    property.status === "upcoming" && "bg-info text-info-foreground"
                  )}>
                    {property.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-card/50">
                    {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                  </Badge>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">{property.name}</h2>
                <div className="flex items-center gap-1 text-white/80">
                  <MapPin className="w-4 h-4" />
                  <span>{property.location}, {property.area}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">{formatCurrency(property.price)}</p>
                <p className="text-sm text-white/80">{formatCurrency(property.pricePerSqft)}/sqft</p>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-card/80 hover:bg-card"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 mx-6 mt-4 grid w-auto grid-cols-4 bg-muted/50">
            <TabsTrigger value="overview" className="gap-2">
              <Home className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="appreciation" className="gap-2">
              <TrendingUp className="w-4 h-4" />
              Appreciation
            </TabsTrigger>
            <TabsTrigger value="amenities" className="gap-2">
              <Star className="w-4 h-4" />
              Amenities
            </TabsTrigger>
            <TabsTrigger value="callscript" className="gap-2">
              <Phone className="w-4 h-4" />
              Call Script
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <TabsContent value="overview" className="mt-4 space-y-6 data-[state=inactive]:hidden">
              {/* Key Stats */}
              <div className="grid grid-cols-4 gap-4">
                {property.bedrooms > 0 && (
                  <div className="p-4 rounded-xl bg-muted/30 text-center">
                    <Bed className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{property.bedrooms}</p>
                    <p className="text-xs text-muted-foreground">Bedrooms</p>
                  </div>
                )}
                <div className="p-4 rounded-xl bg-muted/30 text-center">
                  <Bath className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{property.bathrooms}</p>
                  <p className="text-xs text-muted-foreground">Bathrooms</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 text-center">
                  <Square className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{property.sqft.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Sq. Ft.</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 text-center">
                  <TrendingUp className="w-6 h-6 mx-auto mb-2 text-success" />
                  <p className="text-2xl font-bold text-success">{property.roi}%</p>
                  <p className="text-xs text-muted-foreground">Expected ROI</p>
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Property Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Developer</span>
                      <span className="font-medium">{property.developer}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium">{property.completionDate}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium">{property.location}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border/50">
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-medium">{property.area}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="font-semibold">Investment Highlights</h3>
                  <div className="space-y-3">
                    {appreciationData.locationFactors.map((factor, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-success/5">
                        <Zap className="w-4 h-4 text-success" />
                        <span className="text-sm">{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <Button className="flex-1 gap-2 gold-gradient text-primary-foreground">
                  <Phone className="w-4 h-4" />
                  Contact Agent
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <Calendar className="w-4 h-4" />
                  Schedule Visit
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <Share2 className="w-4 h-4" />
                  Share Property
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="appreciation" className="mt-4 space-y-6 data-[state=inactive]:hidden">
              {/* Investment Score */}
              <div className="flex items-center gap-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-amber-500/10 border border-primary/20">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary">{appreciationData.investmentScore}</div>
                  <div className="text-sm text-muted-foreground">Investment Score</div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    This property scores in the top {100 - appreciationData.investmentScore}% of Mumbai luxury real estate for investment potential.
                  </p>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${appreciationData.investmentScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Projected Appreciation - Visual Cards instead of Bar Chart */}
              <div>
                <h3 className="font-semibold mb-4">Projected Property Value</h3>
                <div className="grid grid-cols-4 gap-4">
                  {appreciationData.projectedRates.map((rate, index) => {
                    const progressHeight = Math.min(100, (rate.appreciationPercent / 200) * 100)
                    return (
                      <div 
                        key={rate.years} 
                        className="relative p-4 rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/50 overflow-hidden group hover:border-primary/30 transition-all"
                      >
                        {/* Background growth indicator */}
                        <div 
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/20 to-transparent transition-all duration-500"
                          style={{ height: `${progressHeight}%` }}
                        />
                        
                        {/* Content */}
                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{rate.years} Years</span>
                            <Badge className="bg-success/10 text-success border-0 text-xs">
                              +{rate.appreciationPercent}%
                            </Badge>
                          </div>
                          <p className="text-xl font-bold mb-1">{formatCurrency(rate.estimatedValue)}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="w-3 h-3 text-success" />
                            <span>from {formatCurrency(property.price)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Historical Rates - Clean Line Chart */}
              <div>
                <h3 className="font-semibold mb-4">Historical Appreciation Rates</h3>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={appreciationData.historicalRates}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis 
                          dataKey="year" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                          width={35}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                          }}
                          formatter={(value: number) => [`${value}%`, "Annual Rate"]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rate" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2.5}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span>Annual Appreciation Rate (%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Factors */}
              <div>
                <h3 className="font-semibold mb-4">Growth Factors</h3>
                <div className="grid grid-cols-3 gap-3">
                  {appreciationData.locationFactors.map((factor, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-success/5 border border-success/10">
                      <Zap className="w-4 h-4 text-success shrink-0" />
                      <span className="text-sm">{factor}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="amenities" className="mt-4 space-y-6 data-[state=inactive]:hidden">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.amenities.map((amenity, index) => {
                  const Icon = getAmenityIcon(amenity)
                  return (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">{amenity}</span>
                    </div>
                  )
                })}
              </div>

              {/* Special Features */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-amber-500/5 border border-primary/10">
                <h4 className="font-semibold mb-3">Why This Property Stands Out</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
                    <span className="text-sm">Developed by {property.developer} - known for premium quality construction</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
                    <span className="text-sm">Prime {property.location} location with excellent connectivity</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-1 shrink-0" />
                    <span className="text-sm">Expected {property.roi}% annual appreciation based on area trends</span>
                  </li>
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="callscript" className="mt-4 space-y-6 data-[state=inactive]:hidden">
              {callScript ? (
                <>
                  {/* Introduction */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary" />
                      Opening Script
                    </h3>
                    <div className="p-4 rounded-xl bg-muted/30 whitespace-pre-wrap text-sm">
                      {callScript.introduction}
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      Key Highlights to Mention
                    </h3>
                    <div className="space-y-2">
                      {callScript.keyHighlights.map((highlight, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-success/5 border border-success/10">
                          <span className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center text-xs font-bold text-success shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-sm">{highlight}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Justification */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      Price Justification
                    </h3>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-sm">
                      {callScript.priceJustification}
                    </div>
                  </div>

                  {/* Objection Handling */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-warning" />
                      Objection Handling
                    </h3>
                    <div className="space-y-3">
                      {callScript.objectionHandling.map((item, i) => (
                        <div key={i} className="p-4 rounded-xl bg-muted/30 space-y-2">
                          <p className="text-sm font-medium text-destructive">
                            Objection: &quot;{item.objection}&quot;
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-success">Response:</span> {item.response}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Closing */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-success" />
                      Closing Statement
                    </h3>
                    <div className="p-4 rounded-xl bg-success/5 border border-success/10 text-sm font-medium">
                      {callScript.closingStatement}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Custom Script Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Use the general calling scripts from the Scripts section for this property.
                  </p>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    View General Scripts
                  </Button>
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
  const [view, setView] = React.useState<"grid" | "list">("grid")
  const [search, setSearch] = React.useState("")
  const [locationFilter, setLocationFilter] = React.useState<string>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [budgetRange, setBudgetRange] = React.useState([0, 200000000])
  const [selectedProperty, setSelectedProperty] = React.useState<Property | null>(null)
  const [showFilters, setShowFilters] = React.useState(false)
  const [showRecommendations, setShowRecommendations] = React.useState(false)

  const aiRecommendations = React.useMemo(() => getAIRecommendations(), [])

  const filteredProperties = React.useMemo(() => {
    return properties.filter((property) => {
      if (search) {
        const searchLower = search.toLowerCase()
        if (
          !property.name.toLowerCase().includes(searchLower) &&
          !property.location.toLowerCase().includes(searchLower)
        ) {
          return false
        }
      }

      if (locationFilter !== "all" && property.location !== locationFilter) {
        return false
      }

      if (typeFilter !== "all" && property.type !== typeFilter) {
        return false
      }

      if (statusFilter !== "all" && property.status !== statusFilter) {
        return false
      }

      if (property.price < budgetRange[0] || property.price > budgetRange[1]) {
        return false
      }

      return true
    })
  }, [search, locationFilter, typeFilter, statusFilter, budgetRange])

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Property Explorer</h1>
          <p className="text-muted-foreground mt-1">
            {filteredProperties.length} luxury properties
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowRecommendations(true)}
          >
            <Sparkles className="w-4 h-4" />
            AI Recommendations
            {aiRecommendations.length > 0 && (
              <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-primary-foreground">
                {aiRecommendations.length}
              </Badge>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <motion.div variants={item} className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search properties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted/50 border-border/50"
          />
        </div>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-40 bg-muted/50">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent className="glass">
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 bg-muted/50">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="glass">
            <SelectItem value="all">All Types</SelectItem>
            {propertyTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-muted/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="glass">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          className={cn("gap-2", showFilters && "bg-primary/10 border-primary/30")}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4" />
          Budget
        </Button>

        <div className="flex items-center border border-border rounded-lg p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setView("list")}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Budget Range Filter */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="glass">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Budget Range</span>
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(budgetRange[0])} - {formatCurrency(budgetRange[1])}
                    </span>
                  </div>
                  <Slider
                    value={budgetRange}
                    onValueChange={setBudgetRange}
                    min={0}
                    max={200000000}
                    step={5000000}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Properties Grid */}
      <motion.div
        variants={container}
        className={cn(
          "grid gap-6",
          view === "grid"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        )}
      >
        {filteredProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onViewDetails={setSelectedProperty}
          />
        ))}
      </motion.div>

      {filteredProperties.length === 0 && (
        <motion.div variants={item} className="text-center py-16">
          <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No properties found</h3>
          <p className="text-muted-foreground">Try adjusting your filters</p>
        </motion.div>
      )}

      {/* Property Detail Modal */}
      <PropertyDetailModal
        property={selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />

      {/* AI Recommendations Modal */}
      <Dialog open={showRecommendations} onOpenChange={setShowRecommendations}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Property Recommendations
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {aiRecommendations.length > 0 ? (
              aiRecommendations.map((rec) => (
                <Card 
                  key={rec.lead.id} 
                  className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedProperty(rec.property)
                    setShowRecommendations(false)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-24 h-24 rounded-lg bg-cover bg-center shrink-0"
                        style={{ backgroundImage: `url(${rec.property.images[0]})` }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{rec.property.name}</h4>
                          <Badge className="bg-success/10 text-success border-0">
                            {rec.matchScore}% Match
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {rec.property.location} | {formatCurrency(rec.property.price)}
                        </p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-sm">
                            Perfect for <span className="font-medium">{rec.lead.name}</span> - 
                            Looking for {rec.lead.propertyInterest.join(", ")} in {rec.lead.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8">
                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recommendations Available</h3>
                <p className="text-muted-foreground">
                  Add more hot leads to get AI-powered property recommendations
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

