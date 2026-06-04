import {
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger'
import { Response } from 'express'
import { memoryStorage } from 'multer'
import { ImportService } from './import.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('template/meta-leads')
  @ApiOperation({ summary: 'Download blank Excel import template for meta leads' })
  downloadTemplate(@Res() res: Response) {
    const buffer = this.importService.generateMetaLeadsTemplate()
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="pikorua-leads-template.xlsx"',
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }

  @Post('meta-leads')
  @ApiOperation({ summary: 'Import meta leads from an Excel or CSV file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/csv',
        ]
        if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|csv)$/i)) {
          cb(null, true)
        } else {
          cb(new Error('Only .xlsx and .csv files are allowed'), false)
        }
      },
    }),
  )
  async importMetaLeads(@UploadedFile() file: Express.Multer.File) {
    return this.importService.importMetaLeads(file)
  }
}
