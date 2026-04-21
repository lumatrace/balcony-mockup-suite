import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const uploadBucket = process.env.SUPABASE_UPLOAD_BUCKET || 'balcony-submissions'

function requireServerEnv(key) {
  const value = process.env[key]

  if (!value) {
    throw new Error(`Missing ${key}.`)
  }

  return value
}

export function getSupabaseAdminClient() {
  return createClient(
    requireServerEnv('SUPABASE_URL'),
    requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
  )
}

export function parseJsonBody(request) {
  if (!request.body) {
    return {}
  }

  if (typeof request.body === 'string') {
    return JSON.parse(request.body)
  }

  return request.body
}

export function sanitizeFileSegment(value) {
  return String(value || 'submission.zip')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildStoragePath(submissionType, filename) {
  const dateSegment = new Date().toISOString().slice(0, 10)
  const safeName = sanitizeFileSegment(filename) || 'submission.zip'

  return `${submissionType}/${dateSegment}/${randomUUID()}-${safeName}`
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB'
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function sendSubmissionEmail({
  projectName,
  submissionType,
  originalFilename,
  fileSizeBytes,
  includedVenues,
  downloadUrl,
}) {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const toEmail = process.env.SUBMISSION_NOTIFICATION_EMAIL || 'corey@lumatrace.net'

  if (!apiKey || !fromEmail) {
    return {
      emailSent: false,
      warning: 'Submission saved, but email delivery is not configured yet. Check your Resend API key and sender address.',
    }
  }

  const resend = new Resend(apiKey)
  const venueList = includedVenues?.length ? includedVenues.join(', ') : 'ZIP upload handoff'
  const subject = `Balcony submission: ${projectName || originalFilename}`

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [toEmail],
    subject,
    html: `
      <div style="font-family: Avenir Next, Helvetica Neue, sans-serif; color: #12121a;">
        <h1 style="font-size: 20px; margin-bottom: 12px;">New Balcony submission received</h1>
        <p style="margin: 0 0 8px;"><strong>Project:</strong> ${projectName || 'Untitled submission'}</p>
        <p style="margin: 0 0 8px;"><strong>Type:</strong> ${submissionType}</p>
        <p style="margin: 0 0 8px;"><strong>File:</strong> ${originalFilename}</p>
        <p style="margin: 0 0 8px;"><strong>Size:</strong> ${formatBytes(fileSizeBytes)}</p>
        <p style="margin: 0 0 20px;"><strong>Included venues:</strong> ${venueList}</p>
        <p style="margin: 0 0 20px;">
          <a href="${downloadUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 12px; background: #8e47ff; color: white; text-decoration: none;">
            Download submission ZIP
          </a>
        </p>
      </div>
    `,
  })

  if (error) {
    return {
      emailSent: false,
      warning: `Submission saved, but email delivery failed. ${error.message}`,
    }
  }

  return { emailSent: true }
}
