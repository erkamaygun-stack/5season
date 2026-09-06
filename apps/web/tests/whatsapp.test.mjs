import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import test from 'node:test'

import {
  isWhatsAppStopRequest,
  parseMetaWebhook,
  parseReceiptSelectionId,
  verifyMetaWebhookSignature,
} from '../lib/integrations/whatsapp/webhook.ts'
import {
  buildReceiptStoragePath,
  validateReceiptImage,
} from '../lib/integrations/whatsapp/media.ts'

test('Meta webhook signature is verified against the unmodified body', () => {
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] })
  const secret = 'test-app-secret'
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

  assert.equal(verifyMetaWebhookSignature(body, signature, secret), true)
  assert.equal(verifyMetaWebhookSignature(`${body} `, signature, secret), false)
  assert.equal(verifyMetaWebhookSignature(body, 'sha256=invalid', secret), false)
})

test('Meta webhook parser normalizes image, interactive and delivery events', () => {
  const payload = {
    entry: [{
      changes: [{
        value: {
          metadata: { phone_number_id: 'phone-1' },
          messages: [
            { id: 'wamid-image', from: '905550000000', type: 'image', timestamp: '1700000000', image: { id: 'media-1' } },
            { id: 'wamid-stop', from: '905550000000', type: 'text', timestamp: '1700000001', text: { body: 'İptal' } },
            {
              id: 'wamid-choice', from: '905550000000', type: 'interactive', timestamp: '1700000002',
              interactive: { list_reply: { id: 'receipt:00000000-0000-0000-0000-000000000001:aidat:00000000-0000-0000-0000-000000000002' } },
            },
          ],
          statuses: [{ id: 'wamid-out', status: 'delivered', timestamp: '1700000003' }],
        },
      }],
    }],
  }

  const events = parseMetaWebhook(payload)
  assert.equal(events.length, 4)
  assert.deepEqual(events[0], {
    kind: 'message',
    phoneNumberId: 'phone-1',
    providerMessageId: 'wamid-image',
    senderWaId: '905550000000',
    messageType: 'image',
    occurredAt: '2023-11-14T22:13:20.000Z',
    mediaId: 'media-1',
    interactiveReplyId: null,
    isStopRequest: false,
  })
  assert.equal(events[1].isStopRequest, true)
  assert.equal(events[2].interactiveReplyId?.startsWith('receipt:'), true)
  assert.equal(events[3].kind, 'status')
  assert.equal(events[3].deliveryStatus, 'delivered')
})

test('receipt selection ids are strict and opaque', () => {
  const valid = 'receipt:00000000-0000-0000-0000-000000000001:equipment:00000000-0000-0000-0000-000000000002'
  assert.deepEqual(parseReceiptSelectionId(valid), {
    submissionId: '00000000-0000-0000-0000-000000000001',
    invoiceType: 'equipment',
    invoiceId: '00000000-0000-0000-0000-000000000002',
  })
  assert.equal(parseReceiptSelectionId('receipt:../../etc/passwd'), null)
})

test('stop keywords are normalized without accepting partial text', () => {
  assert.equal(isWhatsAppStopRequest('  DUR  '), true)
  assert.equal(isWhatsAppStopRequest('İptal'), true)
  assert.equal(isWhatsAppStopRequest('durumu göster'), false)
})

test('receipt images require matching JPEG or PNG magic bytes', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  assert.equal(validateReceiptImage(jpeg, 'image/jpeg').extension, 'jpg')
  assert.equal(validateReceiptImage(png, 'image/png').extension, 'png')
  assert.throws(() => validateReceiptImage(jpeg, 'image/png'), /mime_mismatch/)
  assert.throws(() => validateReceiptImage(new Uint8Array(8), 'image/jpeg'), /magic_bytes/)
})

test('receipt storage paths are tenant/submission scoped and unpredictable', () => {
  const first = buildReceiptStoragePath('school-id', 'submission-id', 'jpg')
  const second = buildReceiptStoragePath('school-id', 'submission-id', 'jpg')
  assert.match(first, /^school-id\/submission-id\/[0-9a-f-]{36}\.jpg$/)
  assert.notEqual(first, second)
})
