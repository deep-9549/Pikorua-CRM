export class ImportRowError {
  row: number
  reason: string
}

export class ImportResultDto {
  total: number
  inserted: number
  skipped: number
  errors: ImportRowError[]
}
