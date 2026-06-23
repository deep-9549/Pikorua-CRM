import { Injectable, Logger } from '@nestjs/common'
import {
  META_LEAD_FIELDS,
  MetaEdgePage,
  MetaLeadData,
} from './meta-lead.types'

interface MetaApiErrorBody {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
  }
}

export class MetaGraphError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
  ) {
    super(message)
    this.name = 'MetaGraphError'
  }
}

export interface MetaGraphResult<T> {
  data: T
  usageHigh: boolean
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))

@Injectable()
export class MetaGraphService {
  private readonly logger = new Logger(MetaGraphService.name)

  private config(accessTokenOverride?: string) {
    const accessToken = accessTokenOverride ?? process.env.META_PAGE_ACCESS_TOKEN
    const graphVersion = process.env.META_GRAPH_API_VERSION
    if (!accessToken || !graphVersion) {
      throw new Error(
        'Meta Graph API is not configured: META_PAGE_ACCESS_TOKEN and META_GRAPH_API_VERSION are required',
      )
    }
    return { accessToken, graphVersion }
  }

  private usageIsHigh(response: Response): boolean {
    for (const name of ['x-app-usage', 'x-page-usage', 'x-ad-account-usage']) {
      const raw = response.headers.get(name)
      if (!raw) continue
      try {
        const values = Object.values(JSON.parse(raw) as Record<string, unknown>)
          .filter((value): value is number => typeof value === 'number')
        if (values.some((value) => value >= 80)) {
          this.logger.warn(`Meta usage threshold reached according to ${name}`)
          return true
        }
      } catch {
        this.logger.warn(`Meta returned an unreadable ${name} header`)
      }
    }
    return false
  }

  async get<T>(
    objectPath: string,
    params: Record<string, string>,
    accessToken?: string,
    attempt = 0,
  ): Promise<MetaGraphResult<T>> {
    const { accessToken: token, graphVersion } = this.config(accessToken)
    const url = new URL(
      `https://graph.facebook.com/${graphVersion}/${objectPath.replace(/^\/+/, '')}`,
    )
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

    let response: Response
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(12_000),
      })
    } catch (error) {
      if (attempt < 2) {
        await sleep(500 * (2 ** attempt))
        return this.get<T>(objectPath, params, accessToken, attempt + 1)
      }
      throw error
    }

    const usageHigh = this.usageIsHigh(response)
    if (response.ok) {
      return { data: await response.json() as T, usageHigh }
    }

    const body = await response.json().catch(() => ({})) as MetaApiErrorBody
    const metaError = body.error
    const retryable = response.status === 429 || response.status >= 500
    if (retryable && attempt < 2) {
      await sleep(500 * (2 ** attempt))
      return this.get<T>(objectPath, params, accessToken, attempt + 1)
    }

    throw new MetaGraphError(
      metaError?.message ?? `Meta Graph API request failed with status ${response.status}`,
      response.status,
      metaError?.code,
      metaError?.error_subcode,
    )
  }

  async fetchLead(leadgenId: string, accessToken?: string): Promise<MetaLeadData> {
    const result = await this.get<MetaLeadData>(encodeURIComponent(leadgenId), {
      fields: META_LEAD_FIELDS,
    }, accessToken)
    if (!result.data.id || !Array.isArray(result.data.field_data)) {
      throw new MetaGraphError('Meta returned incomplete lead details', 502)
    }
    return result.data
  }

  getEdgePage<T>(
    objectPath: string,
    params: Record<string, string>,
    accessToken?: string,
  ): Promise<MetaGraphResult<MetaEdgePage<T>>> {
    return this.get<MetaEdgePage<T>>(objectPath, params, accessToken)
  }
}
