const crypto = require('crypto');

function signPayload(payload, secret) {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
}

function verifyPayload(token, secret) {
  try {
    const [payloadB64, signature] = String(token || '').split('.');
    if (!payloadB64 || !signature) return null;
    const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
    if (expected !== signature) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearerToken(headers = {}) {
  const auth = headers.authorization || headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

module.exports = { signPayload, verifyPayload, getBearerToken };
