"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  MapPin, 
  IndianRupee, 
  Home, 
  Building2, 
  Sparkles,
  Filter,
  SlidersHorizontal,
  Heart,
  Share2,
  Eye,
  Bed,
  Bath,
  Square,
  ChevronDown,
  Check,
  X,
  ArrowRight,
  Zap,
  Target,
  TrendingUp
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { properties, locations, propertyTypes } from "@/lib/data"

const budgetRanges = [
  { label: "Under 50L", min: 0, max: 5000000 },
  { label: "50L - 1Cr", min: 5000000, max: 10000000 },
  { label: "1Cr - 2Cr", min: 10000000, max: 20000000 },
  { label: "2Cr - 5Cr", min: 20000000, max: 50000000 },
  { label: "5Cr - 10Cr", min: 50000000, max: 100000000 },
  { label: "10Cr+", min: 100000000, max: 999999999 },
]

export default function SmartMatchingPage() {
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [budgetRange, setBudgetRange] = useState([0, 100000000])
  const [bedroomFilter, setBedroomFilter] = useState<string>("any")
  const [locationOpen, setLocationOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    )
  }

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const filteredProperties = properties.filter(property => {
    const locationMatch = selectedLocations.length === 0 || selectedLocations.includes(property.location)
    const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(property.type)
    const budgetMatch = property.price >= budgetRange[0] && property.price <= budgetRange[1]
    const bedroomMatch = bedroomFilter === "any" || property.bedrooms === parseInt(bedroomFilter)
    return locationMatch && typeMatch && budgetMatch && bedroomMatch
  })

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `${(price / 10000000).toFixed(1)} Cr`
    if (price >= 100000) return `${(price / 100000).toFixed(0)} L`
    return price.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-orange-600/20">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Smart Property Matching</h1>
            <p className="text-muted-foreground">AI-powered property recommendations based on client preferences</p>
          </div>
        </div>
      </motion.div>

      {/* Smart Filters Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-orange-600/5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Smart Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Location Multi-Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Location
                </label>
                <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-11 border-border/50 bg-background/50"
                    >
                      {selectedLocations.length > 0
                        ? `${selectedLocations.length} selected`
                        : "Select locations..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search locations..." />
                      <CommandList>
                        <CommandEmpty>No location found.</CommandEmpty>
                        <CommandGroup>
                          {locations.map((location) => (
                            <CommandItem
                              key={location}
                              onSelect={() => toggleLocation(location)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedLocations.includes(location) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {location}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedLocations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedLocations.map(loc => (
                      <Badge 
                        key={loc} 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-destructive/20"
                        onClick={() => toggleLocation(loc)}
                      >
                        {loc} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Property Type Multi-Select */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Property Type
                </label>
                <Popover open={typeOpen} onOpenChange={setTypeOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-11 border-border/50 bg-background/50"
                    >
                      {selectedTypes.length > 0
                        ? `${selectedTypes.length} selected`
                        : "Select types..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search types..." />
                      <CommandList>
                        <CommandEmpty>No type found.</CommandEmpty>
                        <CommandGroup>
                          {propertyTypes.map((type) => (
                            <CommandItem
                              key={type.value}
                              onSelect={() => toggleType(type.value)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTypes.includes(type.value) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {type.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTypes.map(type => (
                      <Badge 
                        key={type} 
                        variant="secondary" 
                        className="text-xs cursor-pointer hover:bg-destructive/20"
                        onClick={() => toggleType(type)}
                      >
                        {type} <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Budget Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-primary" />
                  Budget Range
                </label>
                <SearchableSelect
                  onValueChange={(value) => {
                    const range = budgetRanges.find(r => r.label === value)
                    if (range) setBudgetRange([range.min, range.max])
                  }}
                  options={budgetRanges.map((range) => ({ value: range.label, label: range.label }))}
                  placeholder="Select budget"
                  searchPlaceholder="Search budget..."
                  triggerClassName="h-11 border-border/50 bg-background/50"
                />
              </div>

              {/* Bedrooms */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Bed className="h-4 w-4 text-primary" />
                  Bedrooms
                </label>
                <SearchableSelect
                  value={bedroomFilter}
                  onValueChange={setBedroomFilter}
                  options={[
                    { value: "any", label: "Any" },
                    { value: "1", label: "1 BHK" },
                    { value: "2", label: "2 BHK" },
                    { value: "3", label: "3 BHK" },
                    { value: "4", label: "4 BHK" },
                    { value: "5", label: "5+ BHK" },
                  ]}
                  placeholder="Any"
                  searchPlaceholder="Search bedrooms..."
                  triggerClassName="h-11 border-border/50 bg-background/50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>{filteredProperties.length} properties match your criteria</span>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedLocations([])
                    setSelectedTypes([])
                    setBudgetRange([0, 100000000])
                    setBedroomFilter("any")
                    setShowResults(false)
                  }}
                >
                  Clear Filters
                </Button>
                <Button 
                  onClick={() => setShowResults(true)}
                  className="bg-gradient-to-r from-primary to-orange-700 hover:from-primary/90 hover:to-orange-700/90"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Find Matches
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Matched Properties
              </h2>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {filteredProperties.length} Results
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProperties.map((property, index) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="group overflow-hidden border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                    <div className="relative h-48 bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Building2 className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary/90 text-primary-foreground">
                          {property.type}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3 flex gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                          onClick={() => toggleFavorite(property.id)}
                        >
                          <Heart className={cn(
                            "h-4 w-4 transition-colors",
                            favorites.includes(property.id) ? "fill-red-500 text-red-500" : ""
                          )} />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2">
                          <p className="text-lg font-bold text-primary">
                            ₹{formatPrice(property.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {property.name}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {property.location}
                      </p>
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          {property.bedrooms} Bed
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Bath className="h-4 w-4" />
                          {property.bathrooms} Bath
                        </span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          {property.area} sqft
                        </span>
                      </div>
                      <Button 
                        className="w-full mt-4 group/btn"
                        variant="outline"
                      >
                        View Details
                        <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredProperties.length === 0 && (
              <Card className="border-border/50 bg-card/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-center">
                    No properties match your current filters.<br />
                    Try adjusting your criteria.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

