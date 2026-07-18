import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { DatabaseService } from '../../database/database.service'
import { passwordResetTokens, userProfiles } from '@pikorua/db'
import { LoginDto } from './dto/login.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { PasswordResetMailerService } from './password-reset-mailer.service'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly passwordResetMailer: PasswordResetMailerService,
  ) {}

  private get db() { return this.database.db }

  async login(dto: LoginDto) {
    const user = await this.db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.email, dto.email),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })

    if (!user || !user.passwordHash) {
      // Log failed attempts (email only, never the password) so brute-force
      // patterns are visible. The client still gets a generic message.
      this.logger.warn(`Failed login attempt for ${dto.email}`)
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) {
      this.logger.warn(`Failed login attempt for ${dto.email}`)
      throw new UnauthorizedException('Invalid credentials')
    }

    this.logger.log(`User ${user.id} logged in`)

    const payload = {
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
      name: user.fullName ?? '',
    }

    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.fullName, email: user.email, role: user.role },
    }
  }

  async getMe(userId: string) {
    const user = await this.db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, userId),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })
    if (!user) throw new UnauthorizedException()
    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase()
    const user = await this.db.query.userProfiles.findFirst({
      where: and(
        sql`lower(${userProfiles.email}) = ${email}`,
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })

    // Always return the same response so this endpoint cannot be used to
    // enumerate CRM accounts.
    if (!user || !user.email || !user.passwordHash) return { accepted: true }

    const token = randomBytes(32).toString('base64url')
    const tokenHash = this.hashResetToken(token)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id))
    await this.db.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt })

    const appUrl = (process.env.WEB_APP_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:3000')
      .split(',')[0]
      .trim()
      .replace(/\/$/, '')
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`

    try {
      await this.passwordResetMailer.sendPasswordReset({
        email: user.email,
        name: user.fullName ?? '',
        resetUrl,
      })
    } catch (error) {
      await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash))
      // Keep the public response identical for known and unknown addresses.
      // The detailed SMTP error remains server-side for operators.
      this.logger.error(
        `Unable to send password reset email for user ${user.id}`,
        error instanceof Error ? error.stack : String(error),
      )
      return { accepted: true }
    }

    this.logger.log(`Password reset email sent for user ${user.id}`)
    return { accepted: true }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(dto.token)
    const now = new Date()

    const changed = await this.db.transaction(async (tx) => {
      const resetToken = await tx.query.passwordResetTokens.findFirst({
        where: and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      })
      if (!resetToken) return false

      // Claim the token atomically. This prevents two simultaneous requests
      // from using the same link.
      const [claimed] = await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(
          eq(passwordResetTokens.id, resetToken.id),
          isNull(passwordResetTokens.usedAt),
        ))
        .returning({ id: passwordResetTokens.id })
      if (!claimed) return false

      const passwordHash = await bcrypt.hash(dto.new_password, 12)
      const [user] = await tx
        .update(userProfiles)
        .set({ passwordHash, passwordChangedAt: now, updatedAt: now })
        .where(and(
          eq(userProfiles.id, resetToken.userId),
          eq(userProfiles.status, 'active'),
          isNull(userProfiles.deletedAt),
        ))
        .returning({ id: userProfiles.id })
      if (!user) return false

      await tx
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(and(
          eq(passwordResetTokens.userId, resetToken.userId),
          isNull(passwordResetTokens.usedAt),
        ))
      return true
    })

    if (!changed) throw new BadRequestException('This reset link is invalid or has expired')

    this.logger.log('A user password was reset using email verification')
    return { changed: true }
  }

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex')
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const fullName = dto.full_name.trim()
    if (fullName.length < 2) {
      throw new BadRequestException('Full name must be at least 2 characters')
    }

    const [user] = await this.db
      .update(userProfiles)
      .set({
        fullName,
        phone: dto.phone?.trim() || null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(userProfiles.id, userId),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ))
      .returning()

    if (!user) throw new UnauthorizedException()

    return {
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.db.query.userProfiles.findFirst({
      where: and(
        eq(userProfiles.id, userId),
        eq(userProfiles.status, 'active'),
        isNull(userProfiles.deletedAt),
      ),
    })
    if (!user || !user.passwordHash) throw new UnauthorizedException()

    const currentPasswordMatches = await bcrypt.compare(dto.current_password, user.passwordHash)
    if (!currentPasswordMatches) {
      throw new BadRequestException('Current password is incorrect')
    }

    const reusesCurrentPassword = await bcrypt.compare(dto.new_password, user.passwordHash)
    if (reusesCurrentPassword) {
      throw new BadRequestException('New password must be different from the current password')
    }

    const passwordHash = await bcrypt.hash(dto.new_password, 12)
    await this.db
      .update(userProfiles)
      .set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() })
      .where(eq(userProfiles.id, userId))

    this.logger.log(`User ${userId} changed their password`)
    return { changed: true }
  }
}
