# Graph Report - Pikorua-CRM  (2026-08-02)

## Corpus Check
- 334 files · ~215,676 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3014 nodes · 5788 edges · 246 communities (152 shown, 94 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41971114`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dashboard.service.ts
- VoiceIntegrationService
- meta-leads.service.ts
- data.ts
- meta-ads/page.tsx
- cn
- dashboard/page.tsx
- DatabaseService
- import-properties-from-excel.mjs
- LeadsService
- CreateSiteVisitDto
- searchable-select.tsx
- CreateBookingDto
- hni-clients/page.tsx
- types/index.ts
- UpsertHniProfileDto
- hooks/use-toast.ts
- [id]/page.tsx
- employee-performance-pdf.ts
- leads.controller.ts
- MicrositeLeadSyncService
- employee-performance-analysis/page.tsx
- supabase-setup.sql
- devDependencies
- proxyToApi
- properties/page.tsx
- SendMessageDto
- tasks
- property-recommendation.matcher.ts
- CreateUserDto
- database.service.ts
- top-nav.tsx
- compilerOptions
- meta-lead-sync.service.ts
- .ingestMeta
- db/package.json
- Roles
- CurrentUser
- MetaLeadSyncService
- app-preferences-provider.tsx
- compilerOptions
- bookings/page.tsx
- scripts
- smart-matching/page.tsx
- app.module.ts
- dependencies
- PropertiesController
- leads.ts
- api/proxy.ts
- serializeMetaLead
- devDependencies
- EmployeesController
- VoiceDashboardController
- auth.controller.ts
- utils.ts
- components.json
- users.ts
- voice.ts
- meta-lead-sync.module.ts
- compilerOptions
- shared/package.json
- compilerOptions
- client-smart-insights.service.ts
- ImportController
- schemas/index.ts
- VoiceIntegrationController
- properties.ts
- carousel.tsx
- leads Table
- AppController
- poolStatusForClientStatus
- dependencies
- microsite-lead-sync.test.cjs
- form.tsx
- scripts
- PropertyCard
- crm-workflow.test.cjs
- react
- ImportService
- chart.tsx
- export-leads.ts
- WebsiteLeadSyncService
- meta-lead-sync.test.cjs
- lead-crm.ts
- leads-filter-export.test.cjs
- Pikorua CRM Database Design
- setup-local-env.mjs
- create-local-admin.mjs
- microsite-lead-source-config.ts
- password-reset.test.cjs
- getApiBaseUrl
- input-group.tsx
- deploy-release.sh
- schema/index.ts
- voice-integration.service.ts
- exclude
- vercel.json
- (dashboard)/layout.tsx
- web/proxy.ts
- conversations.ts
- nest-cli.json
- serverless.ts
- dashboard-lead-growth.ts
- command-palette.tsx
- toggle-group.tsx
- Local Docker Full Stack
- Linux Local Setup Guide
- employees.ts
- api/package.json
- UpdateStatusDto
- [...path]/route.ts
- Production Release Manifest
- Backend API Integration
- pnpm Workspace Layout
- properties Table
- Q: Which local SQL migrations are included in Graphify?
- meta/[id]/route.ts
- WhatsAppHubPage
- @nestjs/throttler
- phase1-update.sql
- clients/[id]/route.ts
- crm/route.ts
- Adaptive Monochrome App Icon
- Generic Image Placeholder
- Acme Inc. Placeholder Logo
- Placeholder Profile Avatar
- Pikorua CRM API Image
- voice_call_logs Table
- hni/[id]/route.ts
- hni/route.ts
- detail/route.ts
- complete/route.ts
- property-recommendations/route.ts
- leads/meta/route.ts
- site-visits/route.ts
- call-results/route.ts
- webhooks/meta/route.ts
- Pikorua Dark App Icon
- Pikorua Brand Logo
- meta_lead_sync_state Table
- Existing Graph Query Policy
- index.js
- cache-manager-redis-store
- class-transformer
- class-validator
- drizzle-orm
- @nestjs/cache-manager
- public.clients
- @nestjs/passport
- @nestjs/swagger
- @nestjs/config
- passport-jwt
- @pikorua/db
- @pikorua/shared
- reflect-metadata
- rxjs
- activities/route.ts
- site-visits/[id]/route.ts
- next.config.mjs
- next-env.d.ts
- autoprefixer
- class-variance-authority
- cmdk
- date-fns
- embla-carousel-react
- framer-motion
- @hookform/resolvers
- jose
- lucide-react
- next
- clsx
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- react-day-picker
- react-dom
- react-hook-form
- react-resizable-panels
- recharts
- sonner
- tailwind-merge
- @tanstack/react-query
- vaul
- @vercel/analytics
- zod
- postcss.config.mjs
- Apple Touch Icon
- Golden Infinity Mark
- Pikorua Brand Icon
- Golden Infinity Brand Mark
- Light Gray Placeholder Pixel
- Abstract Triangular Outline Mark
- public.microsite_leads
- public.properties
- analytics_daily_snapshots Table
- clients Table
- voice_sync_audit_log Table
- public.lead_activity_events
- Q: also the sql relations are based on the sql migrations available in the git or all the sql migrations available locally??
- public.user_profiles
- public.lead_crm_details
- public.lead_crm_details

## God Nodes (most connected - your core abstractions)
1. `cn()` - 305 edges
2. `proxyToApi()` - 90 edges
3. `CurrentUser` - 51 edges
4. `VoiceIntegrationService` - 50 edges
5. `DatabaseService` - 45 edges
6. `react` - 39 edges
7. `Button()` - 36 edges
8. `Roles()` - 26 edges
9. `Input()` - 24 edges
10. `LeadActivityService` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Shared JWT Secret Requirement` --semantically_similar_to--> `Matching JWT Secrets Prevent Login Redirects`  [INFERRED] [semantically similar]
  README.md → docs/LINUX_SETUP.md
- `Lead Pipeline Data Model` --semantically_similar_to--> `leads Table`  [INFERRED] [semantically similar]
  db_migrations/database.md → test.md
- `Local PostgreSQL and Redis Infrastructure` --semantically_similar_to--> `Local PostgreSQL and Redis Startup`  [INFERRED] [semantically similar]
  README.md → docs/LINUX_SETUP.md
- `Drizzle Database Schema Push` --conceptually_related_to--> `Pikorua CRM Database Design`  [INFERRED]
  docs/LINUX_SETUP.md → db_migrations/database.md
- `Omnichannel Communications Data Model` --semantically_similar_to--> `conversations Table`  [INFERRED] [semantically similar]
  db_migrations/database.md → test.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Local Development Bootstrap** — readme_pikorua_crm, docs_linux_setup_environment_files, docs_linux_setup_local_infrastructure, docker_compose_local_full_stack, pnpm_workspace_workspace_layout [INFERRED 0.85]
- **Production Release Delivery** — cloudbuild_production_api_image, cloudbuild_production_web_image, cloudbuild_production_release_manifest, cloudbuild_production_release_bucket, cloudbuild_production_deployment_vm [EXTRACTED 1.00]
- **Lead Operations Schema** — test_leads, test_lead_crm_details, test_lead_interactions, test_lead_notes, test_lead_assignment_history, test_lead_activity_events [INFERRED 0.85]

## Communities (246 total, 94 thin omitted)

### Community 0 - "dashboard.service.ts"
Cohesion: 0.05
Nodes (66): DashboardController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get, Query, UseGuards (+58 more)

### Community 2 - "meta-leads.service.ts"
Cohesion: 0.09
Nodes (24): BulkLeadIdsDto, ArrayMinSize, ArrayUnique, IsArray, IsUUID, CLIENT_STATUS_TO_META_LEAD_POOL_STATUS, isNonTransferableMetaLeadPoolStatus(), META_LEAD_POOL_STATUSES (+16 more)

### Community 3 - "data.ts"
Cohesion: 0.03
Nodes (49): Booking, bookings, budgetRanges, callingScripts, DashboardStats, Employee, employeeActivities, EmployeeActivity (+41 more)

### Community 4 - "meta-ads/page.tsx"
Cohesion: 0.05
Nodes (52): AiVoicePage(), duration(), EMPTY_FILTERS, Filters, formatDateTime(), formatTranscriptForClipboard(), labelStyles, labelText() (+44 more)

### Community 5 - "cn"
Cohesion: 0.02
Nodes (127): AccordionContent(), AccordionItem(), AccordionTrigger(), Alert(), AlertDescription(), AlertTitle(), alertVariants, BreadcrumbEllipsis() (+119 more)

### Community 6 - "dashboard/page.tsx"
Cohesion: 0.12
Nodes (25): buildMonthBuckets(), callWasToday(), CrmDetails, DashboardPage(), displayStatus(), EMPTY_LEADS, EMPTY_VISITS, formatNumber() (+17 more)

### Community 7 - "DatabaseService"
Cohesion: 0.05
Nodes (34): DatabaseService, Injectable, ClientsController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller (+26 more)

### Community 8 - "import-properties-from-excel.mjs"
Cohesion: 0.10
Nodes (29): xlsx, buildAmenities(), clean(), __dirname, ensureImage(), main(), normalizePropertyType(), normalizeRows() (+21 more)

### Community 9 - "LeadsService"
Cohesion: 0.09
Nodes (19): serializeCrmDetails(), LeadsController, toBoolean(), ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Body (+11 more)

### Community 10 - "CreateSiteVisitDto"
Cohesion: 0.07
Nodes (23): CreateSiteVisitDto, ApiPropertyOptional, IsDateString, IsEnum, IsOptional, IsString, IsUUID, Transform (+15 more)

### Community 11 - "searchable-select.tsx"
Cohesion: 0.17
Nodes (14): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator() (+6 more)

### Community 12 - "CreateBookingDto"
Cohesion: 0.07
Nodes (24): BookingsController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Body, Controller, Get (+16 more)

### Community 13 - "hni-clients/page.tsx"
Cohesion: 0.11
Nodes (21): Activity, categories, categoryIcon, categoryLabel, dateText(), dueText(), Employee, emptyForm (+13 more)

### Community 14 - "types/index.ts"
Cohesion: 0.07
Nodes (26): Booking, DashboardStats, Employee, EmployeeActivity, EmployeeGoal, HniClient, Lead, LeadAssignmentHistory (+18 more)

### Community 15 - "UpsertHniProfileDto"
Cohesion: 0.08
Nodes (27): CreateHniActivityDto, IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsNumber, IsOptional (+19 more)

### Community 16 - "hooks/use-toast.ts"
Cohesion: 0.08
Nodes (38): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+30 more)

### Community 17 - "[id]/page.tsx"
Cohesion: 0.07
Nodes (37): ActivityCard(), BUDGET_OPTIONS, BUYING_STATUS_OPTIONAL_CLIENT_STATUSES, BUYING_STATUS_OPTIONS, CALL_STATUS_OPTIONS, CLIENT_STATUS_VALUES, CLIENT_STATUSES, ClientProfile (+29 more)

### Community 18 - "employee-performance-pdf.ts"
Cohesion: 0.09
Nodes (33): ReportResponse, BLUE, buildEmployeePerformancePdf(), buildPages(), Canvas, Color, comparisonChart(), createPdf() (+25 more)

### Community 19 - "leads.controller.ts"
Cohesion: 0.07
Nodes (30): CompleteFollowUpDto, ApiPropertyOptional, IsIn, IsOptional, IsString, MaxLength, CreateFollowUpDto, ApiPropertyOptional (+22 more)

### Community 20 - "MicrositeLeadSyncService"
Cohesion: 0.32
Nodes (3): MicrositeLeadSourceConfig, MicrositeLeadSyncService, Injectable

### Community 21 - "employee-performance-analysis/page.tsx"
Cohesion: 0.05
Nodes (50): aiModules, recentActions, Employee, EmployeePerformanceAnalysisPage(), EMPTY_SUMMARY, formatDate(), formatNumber(), initials() (+42 more)

### Community 22 - "supabase-setup.sql"
Cohesion: 0.11
Nodes (18): before_user_profile_delete, is_super_admin(), handle_user_profile_delete, voice_call_logs, voice_events, voice_lead_scores, voice_sync_audit_log, voice_transcript_turns (+10 more)

### Community 23 - "devDependencies"
Cohesion: 0.06
Nodes (35): devDependencies, eslint, eslint-config-next, postcss, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/node (+27 more)

### Community 24 - "proxyToApi"
Cohesion: 0.09
Nodes (21): DELETE(), GET(), POST(), POST(), PATCH(), POST(), PATCH(), GET() (+13 more)

### Community 25 - "properties/page.tsx"
Cohesion: 0.05
Nodes (58): categoryConfig, Document, DocumentsPage(), getFileColor(), getFileIcon(), initialDocuments, container, item (+50 more)

### Community 26 - "SendMessageDto"
Cohesion: 0.09
Nodes (19): SendMessageDto, ApiPropertyOptional, IsEnum, IsOptional, IsString, IsUUID, ApiBearerAuth, ApiOperation (+11 more)

### Community 27 - "tasks"
Cohesion: 0.06
Nodes (30): metadata, viewport, ^build, ^lint, .next/**, !.next/cache/**, dependsOn, outputs (+22 more)

### Community 28 - "property-recommendation.matcher.ts"
Cohesion: 0.15
Nodes (30): ApartmentSalesPriority, BudgetRange, buildPropertyRecommendations(), configurationMatchesPropertyType(), getMatchedUnits(), hasApartmentFamilyConfiguration(), hasWordMatch(), isApartment() (+22 more)

### Community 29 - "CreateUserDto"
Cohesion: 0.08
Nodes (22): CreateUserDto, ApiPropertyOptional, IsEmail, IsIn, IsOptional, IsString, MinLength, ApiBearerAuth (+14 more)

### Community 30 - "database.service.ts"
Cohesion: 0.13
Nodes (17): BUDGET_VALUE_MAP, CAMPAIGN_NAME_RULES, normalizeCampaignName(), normalizeMetaBudget(), normalizeMetaPlatform(), stripPhonePrefix(), ImportResultDto, ImportRowError (+9 more)

### Community 31 - "top-nav.tsx"
Cohesion: 0.08
Nodes (34): AppSidebarProps, NavGroup, navGroups, NavItem, UserProfile, ActionButton(), buildFollowUpNotifications(), dateKey() (+26 more)

### Community 32 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+21 more)

### Community 33 - "meta-lead-sync.service.ts"
Cohesion: 0.11
Nodes (18): MetaApiErrorBody, MetaGraphError, MetaGraphResult, MetaGraphService, sleep(), Injectable, MetaLeadImporterService, Injectable (+10 more)

### Community 34 - ".ingestMeta"
Cohesion: 0.10
Nodes (18): asNonEmptyString(), findMetaPageConfig(), parseMetaPageConfigs(), RawMetaPageConfig, ApiOperation, ApiTags, Body, Controller (+10 more)

### Community 35 - "db/package.json"
Cohesion: 0.07
Nodes (28): drizzle-kit, dependencies, drizzle-orm, @pikorua/shared, postgres, devDependencies, drizzle-kit, @types/node (+20 more)

### Community 36 - "Roles"
Cohesion: 0.26
Nodes (8): USER_ROLES, UserRole, Roles(), ROLES_KEY, JwtAuthGuard, Injectable, RolesGuard, Injectable

### Community 37 - "CurrentUser"
Cohesion: 0.11
Nodes (20): CurrentUser, isMetaLeadPoolStatus(), ClientSmartInsightsService, Injectable, MetaLeadsController, ApiBearerAuth, ApiOperation, ApiQuery (+12 more)

### Community 38 - "MetaLeadSyncService"
Cohesion: 0.30
Nodes (3): MetaLeadSyncService, Injectable, MetaPageConfig

### Community 39 - "app-preferences-provider.tsx"
Cohesion: 0.29
Nodes (7): applyMotionPreference(), AppPreferencesContext, AppPreferencesContextValue, AppPreferencesProvider(), AppTheme, PREFERENCES_CHANGED_EVENT, REDUCE_MOTION_KEY

### Community 40 - "compilerOptions"
Cohesion: 0.08
Nodes (25): compilerOptions, allowSyntheticDefaultImports, baseUrl, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+17 more)

### Community 41 - "bookings/page.tsx"
Cohesion: 0.08
Nodes (32): Booking, BookingDetailDialog(), BookingLead, BookingProperty, bookingReference(), BookingsPage(), BookingStatus, CreateBookingDialog() (+24 more)

### Community 42 - "scripts"
Cohesion: 0.08
Nodes (25): devDependencies, turbo, typescript, engines, node, turbo, typescript, name (+17 more)

### Community 43 - "smart-matching/page.tsx"
Cohesion: 0.10
Nodes (26): AiProjectStrategy, AiSmartInsights, buildPreferences(), buildSummary(), ClientDetail, ClientOption, ClientProfile, CrmDetails (+18 more)

### Community 44 - "app.module.ts"
Cohesion: 0.12
Nodes (23): AppModule, DatabaseModule, AuthModule, BookingsModule, ClientsModule, DashboardModule, EmployeesModule, HniModule (+15 more)

### Community 45 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, bcryptjs, cache-manager, dotenv, express, multer, @nestjs/common, @nestjs/core (+15 more)

### Community 46 - "PropertiesController"
Cohesion: 0.13
Nodes (12): PropertiesController, ApiBearerAuth, ApiOperation, ApiQuery, ApiTags, Controller, Get, Param (+4 more)

### Community 47 - "leads.ts"
Cohesion: 0.09
Nodes (21): buyingStatusEnum, callStatusEnum, crmSiteVisitStatusEnum, hwcEnum, leadActivityEvents, leadActivityEventsRelations, leadActivityEventTypeEnum, leadCrmDetails (+13 more)

### Community 48 - "api/proxy.ts"
Cohesion: 0.10
Nodes (12): POST(), GET(), POST(), POST(), Ctx, POST(), Ctx, POST() (+4 more)

### Community 49 - "serializeMetaLead"
Cohesion: 0.15
Nodes (17): ProfileLike, SerializedProfile, serializeProfile(), BookingUser, serializeBooking(), ApiPropertyOptional, IsEnum, IsOptional (+9 more)

### Community 50 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, @nestjs/cli, @nestjs/schematics, @nestjs/testing, @types/bcryptjs, @types/express, @types/multer, @types/node (+11 more)

### Community 51 - "EmployeesController"
Cohesion: 0.14
Nodes (10): EmployeesController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get, Param, UseGuards (+2 more)

### Community 52 - "VoiceDashboardController"
Cohesion: 0.18
Nodes (9): Body, Controller, Delete, Get, Param, Patch, Query, UseGuards (+1 more)

### Community 53 - "auth.controller.ts"
Cohesion: 0.05
Nodes (43): getJwtSecret(), AuthController, ApiBearerAuth, ApiOperation, ApiTags, Body, Controller, Get (+35 more)

### Community 54 - "utils.ts"
Cohesion: 0.09
Nodes (23): CLIENT_STATUS_MAP, Crm, EMPTY_LEADS, initials(), isFresh(), MetaLead, Section(), timeAgo() (+15 more)

### Community 55 - "components.json"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 56 - "users.ts"
Cohesion: 0.14
Nodes (14): clients, clientsRelations, hniActivities, hniActivitiesRelations, hniProfiles, hniProfilesRelations, metaLeads, siteVisitOutcomeEnum (+6 more)

### Community 57 - "voice.ts"
Cohesion: 0.11
Nodes (17): voiceAuditStatusEnum, voiceCallLogs, voiceCallLogsRelations, voiceDirectionEnum, voiceEvents, voiceEventsRelations, voiceEventTypeEnum, voiceLeadLabelEnum (+9 more)

### Community 58 - "meta-lead-sync.module.ts"
Cohesion: 0.18
Nodes (8): MetaLeadSyncController, ApiOperation, ApiTags, Controller, Headers, HttpCode, Post, Query

### Community 59 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, esModuleInterop, lib, module, outDir, rootDir, skipLibCheck (+8 more)

### Community 60 - "shared/package.json"
Cohesion: 0.12
Nodes (16): dependencies, zod, devDependencies, typescript, exports, typescript, zod, main (+8 more)

### Community 61 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, declaration, esModuleInterop, lib, module, outDir, rootDir, skipLibCheck (+8 more)

### Community 62 - "client-smart-insights.service.ts"
Cohesion: 0.28
Nodes (14): calculatedFallback(), cleanAiResult(), ClientSmartInsights, extractJson(), fallbackWithReason(), isBrokerLead(), ObjectionResponse, projectRows() (+6 more)

### Community 63 - "ImportController"
Cohesion: 0.13
Nodes (13): ApiBody, ApiConsumes, ImportController, ApiBearerAuth, ApiOperation, ApiTags, Controller, Get (+5 more)

### Community 64 - "schemas/index.ts"
Cohesion: 0.13
Nodes (14): assignLeadSchema, bulkAssignLeadSchema, createMetaLeadSchema, createSiteVisitSchema, employeeRoleSchema, leadSourceSchema, leadStatusSchema, leadTagSchema (+6 more)

### Community 65 - "VoiceIntegrationController"
Cohesion: 0.21
Nodes (9): Body, Controller, Get, Headers, Post, Query, Req, Res (+1 more)

### Community 66 - "properties.ts"
Cohesion: 0.14
Nodes (13): bookings, bookingsRelations, bookingStatusEnum, properties, propertiesRelations, propertyAmenities, propertyAmenitiesRelations, propertyAppreciation (+5 more)

### Community 67 - "carousel.tsx"
Cohesion: 0.20
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 68 - "leads Table"
Cohesion: 0.19
Nodes (14): Omnichannel Communications Data Model, conversations Table, Database Schema Catalog, employee_activities Table, employee_goals Table, employees Table, lead_activity_events Table, lead_assignment_history Table (+6 more)

### Community 69 - "AppController"
Cohesion: 0.23
Nodes (7): AppController, ApiOperation, ApiTags, Controller, Get, AppService, Injectable

### Community 70 - "poolStatusForClientStatus"
Cohesion: 0.37
Nodes (9): poolStatusForClientStatus(), buildMicrositeLeadExternalId(), clean(), mapMicrositeLeadToCrm(), micrositeLeadFullName(), validDate(), MicrositeJob, MicrositeLead (+1 more)

### Community 72 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, input-otp, next-themes, @pikorua/shared, @radix-ui/react-collapsible, @radix-ui/react-slot, @radix-ui/react-tooltip, @pikorua/shared (+5 more)

### Community 73 - "microsite-lead-sync.test.cjs"
Cohesion: 0.17
Nodes (10): assert, {
  buildMicrositeLeadExternalId,
  mapMicrositeLeadToCrm,
}, { clients, leadCrmDetails, metaLeads }, job, lead, {
  MicrositeLeadSyncService,
}, {
  parseMicrositeLeadSourceConfigs,
}, sourceA (+2 more)

### Community 74 - "form.tsx"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+2 more)

### Community 75 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, dev, lint, seed:admin, start, start:debug, test:meta-sync (+3 more)

### Community 76 - "PropertyCard"
Cohesion: 0.33
Nodes (11): formatPropertyType(), formatStatus(), getAIRecommendations(), getConfigurationSummary(), getPitchReadiness(), getStatusClass(), getVisitNote(), PropertiesPage() (+3 more)

### Community 77 - "crm-workflow.test.cjs"
Cohesion: 0.09
Nodes (30): LeadsPage(), campaignOptions(), EMPTY_LEAD_FILTERS, FilterableLead, filterLeadList(), LeadListFilters, DEFAULT_LEAD_LIST_VIEW_STATE, FILTER_KEYS (+22 more)

### Community 78 - "react"
Cohesion: 0.16
Nodes (11): initials(), PasswordInput(), roleLabel(), SettingsPage(), SplashPage(), useAppPreferences(), SidebarProvider(), useIsMobile() (+3 more)

### Community 81 - "chart.tsx"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 82 - "export-leads.ts"
Cohesion: 0.33
Nodes (10): buildLeadsCsv(), CLIENT_DETAIL_STATUSES, escapeCsv(), ExportableLead, exportLeadsToExcel(), fmtDate(), fmtDateTime(), joinList() (+2 more)

### Community 84 - "meta-lead-sync.test.cjs"
Cohesion: 0.20
Nodes (8): { afterEach, test }, assert, {
  MetaGraphError,
  MetaGraphService,
}, {
  MetaLeadImporterService,
}, { metaLeads, leadCrmDetails }, {
  MetaLeadSyncController,
}, originalEnv, {
  parseMetaPageConfigs,
}

### Community 85 - "lead-crm.ts"
Cohesion: 0.20
Nodes (9): ANTI_BROKER_COMPATIBLE_STATUSES, CLIENT_STATUS_VALUES, ClientStatus, isAntiBrokerCompatibleStatus(), missingSpokenLeadFields(), NOT_PROVIDED_BY_CLIENT, SPOKEN_REQUIRED_FIELD_LABELS, SpokenLeadDetails (+1 more)

### Community 86 - "leads-filter-export.test.cjs"
Cohesion: 0.20
Nodes (8): assert, { buildLeadsCsv }, {
  campaignOptions,
  EMPTY_LEAD_FILTERS,
  filterLeadList,
}, fs, leads, path, test, ts

### Community 87 - "Pikorua CRM Database Design"
Cohesion: 0.20
Nodes (10): Data Lifecycle and Retention, Pikorua CRM Database Design, Secure Scalable Extensible Database Goals, Tenant-Aware Indexing Strategy, Lead Pipeline Data Model, Versioned Additive Schema Evolution, Tenant-Scoped Data Model with RLS, PII Protection and Least-Privilege Security (+2 more)

### Community 88 - "setup-local-env.mjs"
Cohesion: 0.20
Nodes (6): env, force, paths, rootDir, rootEnvContent, webEnvContent

### Community 89 - "create-local-admin.mjs"
Cohesion: 0.25
Nodes (7): apiDir, bcrypt, main(), postgres, repoRoot, require, scriptDir

### Community 90 - "microsite-lead-source-config.ts"
Cohesion: 0.31
Nodes (8): parseMetaPages(), RECOMMENDED, REQUIRED, validateEnv(), parseMicrositeLeadSourceConfigs(), RawMicrositeLeadSourceConfig, readBoolean(), readString()

### Community 91 - "password-reset.test.cjs"
Cohesion: 0.22
Nodes (6): assert, { AuthService }, { createHash }, ENV_KEYS, {
  PasswordResetMailerService,
}, test

### Community 92 - "getApiBaseUrl"
Cohesion: 0.39
Nodes (5): POST(), maxDuration, POST(), GET(), getApiBaseUrl()

### Community 93 - "input-group.tsx"
Cohesion: 0.28
Nodes (8): InputGroup(), InputGroupAddon(), inputGroupAddonVariants, InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), InputGroupText(), InputGroupTextarea()

### Community 94 - "deploy-release.sh"
Cohesion: 0.47
Nodes (7): fail(), log(), main(), registry_login(), rollback(), deploy-release.sh script, wait_for_healthy()

### Community 95 - "schema/index.ts"
Cohesion: 0.22
Nodes (5): Database, db, queryClient, integrationSyncLocks, metaLeadSyncState

### Community 96 - "voice-integration.service.ts"
Cohesion: 0.20
Nodes (9): DIRECTIONS, EVENT_TYPES, LABELS, LOCALES, MachineRequest, MachineResponse, NormalizedCallResult, NormalizedTurn (+1 more)

### Community 97 - "exclude"
Cohesion: 0.25
Nodes (7): exclude, extends, dist, node_modules, **/*spec.ts, test, ./tsconfig.json

### Community 98 - "vercel.json"
Cohesion: 0.25
Nodes (7): maxDuration, memory, buildCommand, functions, api/index.js, routes, $schema

### Community 99 - "(dashboard)/layout.tsx"
Cohesion: 0.36
Nodes (4): DashboardLayout(), QueryProvider(), PrivacyGuard(), clearLeadSectionState()

### Community 100 - "web/proxy.ts"
Cohesion: 0.36
Nodes (7): ADMIN_ONLY, config, JWT_SECRET, matchesRoute(), PROTECTED, proxy(), UserRole

### Community 101 - "conversations.ts"
Cohesion: 0.25
Nodes (7): conversations, conversationsRelations, messages, messageSenderEnum, messagesRelations, messageStatusEnum, messageTypeEnum

### Community 102 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, tsConfigPath, $schema, sourceRoot

### Community 103 - "serverless.ts"
Cohesion: 0.83
Nodes (3): bootstrap(), expressApp, handler()

### Community 104 - "dashboard-lead-growth.ts"
Cohesion: 0.48
Nodes (6): calculateComparableLeadGrowth(), ComparableLeadGrowth, comparableMonthRanges(), daysInMonth(), istParts(), istStartUtc()

### Community 105 - "command-palette.tsx"
Cohesion: 0.33
Nodes (6): CommandItem, CommandPalette(), CommandPaletteProps, pages, employees, properties

### Community 106 - "toggle-group.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 107 - "Local Docker Full Stack"
Cohesion: 0.48
Nodes (7): NestJS API Service, Local Docker Full Stack, PostgreSQL Service, Redis Service, Next.js Web Service, Local PostgreSQL and Redis Startup, Local PostgreSQL and Redis Infrastructure

### Community 108 - "Linux Local Setup Guide"
Cohesion: 0.29
Nodes (7): Drizzle Database Schema Push, Package-Specific Environment Files, Matching JWT Secrets Prevent Login Redirects, Linux Local Setup Guide, Linux Development Prerequisites, Local Super Admin Seed, Linux Setup

### Community 109 - "employees.ts"
Cohesion: 0.29
Nodes (6): employeeActivities, employeeActivitiesRelations, employeeGoals, employeeGoalsRelations, employees, employeesRelations

### Community 110 - "api/package.json"
Cohesion: 0.33
Nodes (5): engines, node, name, private, version

### Community 111 - "UpdateStatusDto"
Cohesion: 0.40
Nodes (5): IsBoolean, IsIn, IsOptional, IsString, UpdateStatusDto

### Community 112 - "[...path]/route.ts"
Cohesion: 0.53
Nodes (5): DELETE(), GET(), Params, PATCH(), voicePath()

### Community 113 - "Production Release Manifest"
Cohesion: 0.40
Nodes (6): Production API Image, Production Compute Engine VM, Production Build and Deployment Pipeline, GCS Release Bucket, Production Release Manifest, Production Web Image

### Community 114 - "Backend API Integration"
Cohesion: 0.33
Nodes (6): Suggested CRM API Domains, Backend API Integration, CRM Frontend Handover, Frontend Mock Data Source, Replace Mock Imports to Reduce Client Bundles, TypeScript Backend Response Shapes

### Community 115 - "pnpm Workspace Layout"
Cohesion: 0.33
Nodes (6): Application Workspaces, Shared Package Workspaces, pnpm Workspace Layout, Shared JWT Secret Requirement, Pikorua CRM, pnpm Turborepo Monorepo

### Community 116 - "properties Table"
Cohesion: 0.33
Nodes (6): bookings Table, properties Table, property_amenities Table, property_appreciation Table, property_images Table, site_visits Table

### Community 117 - "Q: Which local SQL migrations are included in Graphify?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Which local SQL migrations are included in Graphify?, Source Nodes

### Community 118 - "meta/[id]/route.ts"
Cohesion: 0.40
Nodes (4): Ctx, DELETE(), GET(), PATCH()

### Community 119 - "WhatsAppHubPage"
Cohesion: 0.40
Nodes (5): sentimentMeta(), trendMeta(), WhatsAppHubPage(), getEmployeeById(), getWhatsAppConversationByLeadId()

### Community 121 - "phase1-update.sql"
Cohesion: 0.43
Nodes (6): public.lead_assignment_history, public.pick_least_loaded_executive(), public.reassign_stale_leads(), public.lead_crm_details, public.meta_leads, public.user_profiles

### Community 122 - "clients/[id]/route.ts"
Cohesion: 0.50
Nodes (3): Ctx, GET(), PATCH()

### Community 123 - "crm/route.ts"
Cohesion: 0.50
Nodes (3): Ctx, GET(), PUT()

### Community 126 - "Adaptive Monochrome App Icon"
Cohesion: 0.50
Nodes (4): Abstract Geometric Monogram, Adaptive Monochrome App Icon, Light and Dark Color Adaptation, Rounded Square Background

### Community 127 - "Generic Image Placeholder"
Cohesion: 0.50
Nodes (4): Centered Image Pictogram, Circular Alignment Guides, Generic Image Placeholder, Neutral Gray Background

### Community 128 - "Acme Inc. Placeholder Logo"
Cohesion: 0.50
Nodes (4): Abstract Geometric Emblem, Acme Inc. Placeholder Logo, Acme Inc. Wordmark, Monochrome Black Branding

### Community 129 - "Placeholder Profile Avatar"
Cohesion: 0.50
Nodes (4): Generic User Silhouette, Neutral Gray Outline, Placeholder Profile Avatar, White Background

### Community 130 - "Pikorua CRM API Image"
Cohesion: 0.67
Nodes (4): Pikorua CRM API Image, Google Artifact Registry, Manual Container Image Build Pipeline, Pikorua CRM Web Image

### Community 131 - "voice_call_logs Table"
Cohesion: 0.50
Nodes (4): voice_call_logs Table, voice_events Table, voice_lead_scores Table, voice_transcript_turns Table

### Community 141 - "Pikorua Dark App Icon"
Cohesion: 0.67
Nodes (3): Pikorua Dark App Icon, Dark Background, Gold Infinity Symbol

### Community 142 - "Pikorua Brand Logo"
Cohesion: 0.67
Nodes (3): Pikorua Brand Logo, Gold Pikorua Wordmark, Good People, Great Properties

### Community 143 - "meta_lead_sync_state Table"
Cohesion: 0.67
Nodes (3): integration_sync_locks Table, meta_lead_sync_state Table, meta_leads Table

### Community 235 - "public.lead_activity_events"
Cohesion: 0.50
Nodes (4): public.lead_activity_events, public.mirror_lead_assignment_history_to_activity(), public.meta_leads, public.user_profiles

### Community 236 - "Q: also the sql relations are based on the sql migrations available in the git or all the sql migrations available locally??"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: also the sql relations are based on the sql migrations available in the git or all the sql migrations available locally??, Source Nodes

## Knowledge Gaps
- **866 isolated node(s):** `{ handler }`, `$schema`, `collection`, `sourceRoot`, `deleteOutDir` (+861 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **94 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ApiProperty` connect `auth.controller.ts` to `meta-leads.service.ts`, `CreateSiteVisitDto`, `CreateBookingDto`, `leads.controller.ts`, `properties/page.tsx`, `SendMessageDto`, `CreateUserDto`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `meta-ads/page.tsx`, `dashboard/page.tsx`, `searchable-select.tsx`, `hni-clients/page.tsx`, `hooks/use-toast.ts`, `employee-performance-analysis/page.tsx`, `properties/page.tsx`, `top-nav.tsx`, `bookings/page.tsx`, `utils.ts`, `carousel.tsx`, `form.tsx`, `PropertyCard`, `react`, `chart.tsx`, `input-group.tsx`, `command-palette.tsx`, `toggle-group.tsx`, `WhatsAppHubPage`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `DatabaseService` connect `DatabaseService` to `dashboard.service.ts`, `meta-leads.service.ts`, `CreateSiteVisitDto`, `CreateBookingDto`, `UpsertHniProfileDto`, `leads.controller.ts`, `SendMessageDto`, `CreateUserDto`, `database.service.ts`, `meta-lead-sync.service.ts`, `app.module.ts`, `PropertiesController`, `serializeMetaLead`, `EmployeesController`, `auth.controller.ts`, `poolStatusForClientStatus`, `ImportService`, `WebsiteLeadSyncService`, `voice-integration.service.ts`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `{ handler }`, `$schema`, `collection` to the rest of the system?**
  _866 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dashboard.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05443037974683544 - nodes in this community are weakly interconnected._
- **Should `meta-leads.service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09206349206349207 - nodes in this community are weakly interconnected._
- **Should `data.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.03333333333333333 - nodes in this community are weakly interconnected._