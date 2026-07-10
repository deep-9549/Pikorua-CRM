"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  FileText,
  File,
  Image,
  Video,
  FolderOpen,
  MoreVertical,
  Eye,
  Trash2,
  Share2,
  Clock,
  User,
  Building2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Star,
  StarOff,
  Tag,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"

interface Document {
  id: string
  name: string
  type: "pdf" | "doc" | "image" | "spreadsheet" | "video" | "other"
  category: "brochure" | "agreement" | "invoice" | "report" | "presentation" | "legal" | "marketing"
  size: string
  uploadedBy: string
  uploadedAt: Date
  lastModified: Date
  tags: string[]
  starred: boolean
  linkedProperty?: string
  linkedLead?: string
  description?: string
}

const initialDocuments: Document[] = []

const categoryConfig: Record<string, { color: string; label: string }> = {
  brochure:     { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", label: "Brochure" },
  agreement:    { color: "bg-primary/10 text-primary border-primary/20", label: "Agreement" },
  invoice:      { color: "bg-green-500/10 text-green-600 border-green-500/20", label: "Invoice" },
  report:       { color: "bg-purple-500/10 text-purple-600 border-purple-500/20", label: "Report" },
  presentation: { color: "bg-pink-500/10 text-pink-600 border-pink-500/20", label: "Presentation" },
  legal:        { color: "bg-red-500/10 text-red-600 border-red-500/20", label: "Legal" },
  marketing:    { color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20", label: "Marketing" },
}

function getFileIcon(type: Document["type"]) {
  switch (type) {
    case "pdf": return FileText
    case "doc": return File
    case "image": return Image
    case "video": return Video
    case "spreadsheet": return FileSpreadsheet
    default: return File
  }
}

function getFileColor(type: Document["type"]) {
  switch (type) {
    case "pdf": return "bg-red-500/10 text-red-600"
    case "doc": return "bg-blue-500/10 text-blue-600"
    case "image": return "bg-emerald-500/10 text-emerald-600"
    case "video": return "bg-purple-500/10 text-purple-600"
    case "spreadsheet": return "bg-green-500/10 text-green-600"
    default: return "bg-muted text-muted-foreground"
  }
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [docs, setDocs] = useState(initialDocuments)

  const toggleStar = (id: string) => {
    setDocs(docs.map(d => d.id === id ? { ...d, starred: !d.starred } : d))
  }

  const filteredDocs = docs.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesTab = activeTab === "all" || 
      (activeTab === "starred" && doc.starred) ||
      doc.category === activeTab
    return matchesSearch && matchesTab
  })

  const totalSize = "1.2 GB"
  const starredCount = docs.filter(d => d.starred).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-orange-600/20">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Documents</h1>
            <p className="text-muted-foreground text-sm">Manage brochures, agreements, and reports</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-primary to-orange-700 hover:from-primary/90 hover:to-orange-700/90 shadow-gold-sm border-0">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Add a new document to the repository
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">Drop files here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, XLSX, PPT, Images, Videos</p>
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <SearchableSelect
                    placeholder="Select category"
                    searchPlaceholder="Search category..."
                    options={[
                      { value: "brochure", label: "Brochure" },
                      { value: "agreement", label: "Agreement" },
                      { value: "invoice", label: "Invoice" },
                      { value: "report", label: "Report" },
                      { value: "presentation", label: "Presentation" },
                      { value: "legal", label: "Legal" },
                      { value: "marketing", label: "Marketing" },
                    ]}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Tags</Label>
                  <Input placeholder="Add tags separated by commas" />
                </div>
                <div className="grid gap-2">
                  <Label>Description (Optional)</Label>
                  <Textarea placeholder="Brief description of the document..." className="min-h-[80px]" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-primary to-orange-700 border-0"
                  onClick={() => setUploadDialogOpen(false)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Documents", value: docs.length, icon: FileText, color: "text-primary" },
          { label: "Starred", value: starredCount, icon: Star, color: "text-primary" },
          { label: "Storage Used", value: totalSize, icon: FolderOpen, color: "text-blue-600" },
          { label: "Recent Uploads", value: 0, icon: Clock, color: "text-green-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents by name or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs & Documents */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border border-border/50">
            <TabsTrigger value="all" className="data-[state=active]:bg-background">All</TabsTrigger>
            <TabsTrigger value="starred" className="data-[state=active]:bg-background">
              <Star className="w-3 h-3 mr-1" /> Starred
            </TabsTrigger>
            <TabsTrigger value="brochure" className="data-[state=active]:bg-background">Brochures</TabsTrigger>
            <TabsTrigger value="agreement" className="data-[state=active]:bg-background">Agreements</TabsTrigger>
            <TabsTrigger value="report" className="data-[state=active]:bg-background">Reports</TabsTrigger>
            <TabsTrigger value="legal" className="data-[state=active]:bg-background">Legal</TabsTrigger>
            <TabsTrigger value="marketing" className="data-[state=active]:bg-background">Marketing</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-3">
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc, index) => {
                const FileIcon = getFileIcon(doc.type)
                const fileColor = getFileColor(doc.type)
                const catConfig = categoryConfig[doc.category]

                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Card className="border-border/50 bg-card/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 shadow-card border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl shrink-0 ${fileColor}`}>
                            <FileIcon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground truncate">{doc.name}</h3>
                              <Badge className={catConfig.color}>{catConfig.label}</Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {doc.uploadedBy}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {doc.uploadedAt.toLocaleDateString()}
                              </span>
                              <span>{doc.size}</span>
                              {doc.linkedProperty && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  {doc.linkedProperty}
                                </span>
                              )}
                            </div>
                            {doc.tags.length > 0 && (
                              <div className="flex gap-1.5 mt-2">
                                {doc.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] bg-muted/50">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleStar(doc.id)}
                            >
                              {doc.starred
                                ? <Star className="h-4 w-4 text-primary fill-primary" />
                                : <StarOff className="h-4 w-4 text-muted-foreground" />
                              }
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPreviewDoc(doc)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })
            ) : (
              <Card className="border-border/50 bg-card/50 shadow-card border-0">
                <CardContent className="py-16 text-center">
                  <FolderOpen className="w-14 h-14 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Documents Found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "Try adjusting your search query" : "Upload your first document to get started"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </Tabs>
      </motion.div>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {previewDoc && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${getFileColor(previewDoc.type)}`}>
                    {(() => { const Icon = getFileIcon(previewDoc.type); return <Icon className="h-6 w-6" /> })()}
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{previewDoc.name}</DialogTitle>
                    <DialogDescription>{previewDoc.size} Â· {previewDoc.type.toUpperCase()}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {previewDoc.description && (
                  <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-sm text-muted-foreground">{previewDoc.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Uploaded By</p>
                    <p className="font-medium text-sm">{previewDoc.uploadedBy}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Upload Date</p>
                    <p className="font-medium text-sm">{previewDoc.uploadedAt.toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Last Modified</p>
                    <p className="font-medium text-sm">{previewDoc.lastModified.toLocaleDateString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Category</p>
                    <Badge className={categoryConfig[previewDoc.category]?.color}>
                      {categoryConfig[previewDoc.category]?.label}
                    </Badge>
                  </div>
                </div>
                {previewDoc.linkedProperty && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Linked Property: {previewDoc.linkedProperty}</span>
                    </div>
                  </div>
                )}
                {previewDoc.tags.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {previewDoc.tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" /> Share
                </Button>
                <Button className="flex-1 bg-gradient-to-r from-primary to-orange-700 border-0">
                  <Download className="w-4 h-4 mr-2" /> Download
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
