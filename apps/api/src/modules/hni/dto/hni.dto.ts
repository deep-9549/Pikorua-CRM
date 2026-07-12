import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator'

export class UpsertHniProfileDto {
  @IsString() full_name!: string
  @IsOptional() @IsIn(['business', 'celebrity', 'sports', 'politics', 'royalty', 'professional', 'other']) category?: string
  @IsOptional() @IsString() designation?: string
  @IsOptional() @IsString() organisation?: string
  @IsOptional() @IsString() city?: string
  @IsOptional() @IsString() country?: string
  @IsOptional() @IsString() phone?: string
  @IsOptional() @IsEmail() email?: string
  @IsOptional() @IsString() assistant_name?: string
  @IsOptional() @IsString() assistant_phone?: string
  @IsOptional() @IsIn(['platinum', 'diamond', 'black']) tier?: string
  @IsOptional() @IsIn(['prospect', 'introduced', 'engaged', 'active', 'client', 'dormant']) relationship_stage?: string
  @IsOptional() @IsString() relationship_owner_id?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimated_portfolio_value?: number
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimated_budget_min?: number
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) estimated_budget_max?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) properties_owned?: number
  @IsOptional() @IsArray() @IsString({ each: true }) preferences?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) interests?: string[]
  @IsOptional() @IsString() communication_preferences?: string
  @IsOptional() @IsString() relationship_notes?: string
  @IsOptional() @IsString() source?: string
  @IsOptional() @IsDateString() last_contact_at?: string
  @IsOptional() @IsDateString() next_action_at?: string
  @IsOptional() @IsString() next_action?: string
  @IsOptional() @IsBoolean() is_sensitive?: boolean
}

export class CreateHniActivityDto {
  @IsIn(['call', 'meeting', 'message', 'note', 'introduction', 'site_visit', 'deal']) activity_type!: string
  @IsString() title!: string
  @IsOptional() @IsString() notes?: string
  @IsOptional() @IsDateString() occurred_at?: string
}
