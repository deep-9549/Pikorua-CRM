const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const test = require('node:test')

const { AuthService } = require('../dist/modules/auth/auth.service.js')
const {
  PasswordResetMailerService,
} = require('../dist/modules/auth/password-reset-mailer.service.js')

const ENV_KEYS = [
  'NODE_ENV',
  'WEB_APP_URL',
  'BREVO_API_KEY',
  'BREVO_SEND_URL',
  'DEFAULT_SENDER_EMAIL',
  'DEFAULT_SENDER_NAME',
]

function withEnvironment(values, callback) {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
  for (const key of ENV_KEYS) delete process.env[key]
  Object.assign(process.env, values)

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      for (const key of ENV_KEYS) {
        if (original[key] === undefined) delete process.env[key]
        else process.env[key] = original[key]
      }
    })
}

function quietLogger() {
  return { log() {}, warn() {}, error() {} }
}

test('forgot password stores only a hash and emails a fragment-based link', async () => {
  let inserted
  let email
  const transaction = async (callback) => callback({
    delete: () => ({ where: async () => undefined }),
    insert: () => ({ values: async (value) => { inserted = value } }),
  })
  const database = {
    db: {
      query: {
        userProfiles: {
          findFirst: async () => ({
            id: '11111111-1111-1111-1111-111111111111',
            email: 'person@example.com',
            fullName: 'Person',
            passwordHash: 'present',
          }),
        },
      },
      transaction,
      delete: () => ({ where: async () => undefined }),
    },
  }
  const mailer = { sendPasswordReset: async (value) => { email = value } }
  const service = new AuthService(database, {}, mailer)
  service.logger = quietLogger()

  await withEnvironment(
    { NODE_ENV: 'production', WEB_APP_URL: 'https://crm.pikorua.in' },
    async () => {
      assert.deepEqual(await service.forgotPassword({ email: ' PERSON@example.com ' }), {
        accepted: true,
      })
    },
  )

  assert.equal(inserted.userId, '11111111-1111-1111-1111-111111111111')
  assert.match(inserted.tokenHash, /^[a-f0-9]{64}$/)
  assert.match(email.resetUrl, /^https:\/\/crm\.pikorua\.in\/reset-password#token=/)
  assert.equal(email.resetUrl.includes('?token='), false)

  const token = new URLSearchParams(email.resetUrl.split('#')[1]).get('token')
  assert.equal(token.length, 43)
  assert.equal(createHash('sha256').update(token).digest('hex'), inserted.tokenHash)
})

test('a missing reset-token table is isolated and does not expose the account', async () => {
  let mailCalled = false
  const database = {
    db: {
      query: {
        userProfiles: {
          findFirst: async () => ({
            id: '11111111-1111-1111-1111-111111111111',
            email: 'person@example.com',
            fullName: 'Person',
            passwordHash: 'present',
          }),
        },
      },
      transaction: async () => { throw new Error('relation password_reset_tokens does not exist') },
      delete: () => ({ where: async () => undefined }),
    },
  }
  const mailer = { sendPasswordReset: async () => { mailCalled = true } }
  const service = new AuthService(database, {}, mailer)
  service.logger = quietLogger()

  assert.deepEqual(await service.forgotPassword({ email: 'person@example.com' }), {
    accepted: true,
  })
  assert.equal(mailCalled, false)
})

test('reset password claims the token once and stores a bcrypt password hash', async () => {
  let updateNumber = 0
  let userUpdate
  const tx = {
    query: {
      passwordResetTokens: {
        findFirst: async () => ({
          id: '22222222-2222-2222-2222-222222222222',
          userId: '11111111-1111-1111-1111-111111111111',
        }),
      },
    },
    update: () => {
      updateNumber += 1
      const currentUpdate = updateNumber
      return {
        set: (value) => ({
          where: () => {
            if (currentUpdate === 1) {
              return { returning: async () => [{ id: '22222222-2222-2222-2222-222222222222' }] }
            }
            if (currentUpdate === 2) {
              userUpdate = value
              return { returning: async () => [{ id: '11111111-1111-1111-1111-111111111111' }] }
            }
            return Promise.resolve()
          },
        }),
      }
    },
  }
  const database = { db: { transaction: async (callback) => callback(tx) } }
  const service = new AuthService(database, {}, {})
  service.logger = quietLogger()

  assert.deepEqual(await service.resetPassword({
    token: 'a'.repeat(43),
    new_password: 'SecurePass1',
  }), { changed: true })

  assert.equal(updateNumber, 3)
  assert.notEqual(userUpdate.passwordHash, 'SecurePass1')
  assert.equal(await require('bcryptjs').compare('SecurePass1', userUpdate.passwordHash), true)
})

test('Brevo mailer sends the verified sender and never puts the key in the body', async () => {
  const originalFetch = global.fetch
  let request
  global.fetch = async (url, options) => {
    request = { url, options }
    return { ok: true, status: 201, text: async () => '' }
  }

  try {
    await withEnvironment({
      BREVO_API_KEY: 'private-test-key',
      BREVO_SEND_URL: 'https://api.brevo.com/v3/smtp/email',
      DEFAULT_SENDER_EMAIL: 'pikoruaweb@gmail.com',
      DEFAULT_SENDER_NAME: 'PIKORUA',
    }, async () => {
      const mailer = new PasswordResetMailerService()
      mailer.logger = quietLogger()
      await mailer.sendPasswordReset({
        email: 'person@example.com',
        name: 'Person',
        resetUrl: 'https://crm.pikorua.in/reset-password#token=abc',
      })
    })
  } finally {
    global.fetch = originalFetch
  }

  const body = JSON.parse(request.options.body)
  assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email')
  assert.equal(request.options.headers['api-key'], 'private-test-key')
  assert.deepEqual(body.sender, { name: 'PIKORUA', email: 'pikoruaweb@gmail.com' })
  assert.deepEqual(body.to, [{ email: 'person@example.com', name: 'Person' }])
  assert.equal(request.options.body.includes('private-test-key'), false)
})

test('Brevo rejection is surfaced to the auth service for safe cleanup', async () => {
  const originalFetch = global.fetch
  global.fetch = async () => ({ ok: false, status: 401, text: async () => '{"message":"unauthorized"}' })

  try {
    await withEnvironment({
      BREVO_API_KEY: 'invalid',
      DEFAULT_SENDER_EMAIL: 'pikoruaweb@gmail.com',
    }, async () => {
      const mailer = new PasswordResetMailerService()
      mailer.logger = quietLogger()
      await assert.rejects(
        mailer.sendPasswordReset({
          email: 'person@example.com',
          name: 'Person',
          resetUrl: 'https://crm.pikorua.in/reset-password#token=abc',
        }),
        /Email service is temporarily unavailable/,
      )
    })
  } finally {
    global.fetch = originalFetch
  }
})
