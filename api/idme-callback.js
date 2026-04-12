const https = require('https');
const querystring = require('querystring');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, redirectUri } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, reason: 'missing_code' });
  }

  const baseUrl = process.env.IDME_BASE_URL;
  const clientId = process.env.IDME_CLIENT_ID;
  const clientSecret = process.env.IDME_CLIENT_SECRET;
  const resolvedRedirectUri = redirectUri || process.env.IDME_REDIRECT_URI;

  try {
    // Step 1 — Exchange auth code for access token
    const accessToken = await exchangeCodeForToken(
      baseUrl,
      clientId,
      clientSecret,
      code,
      resolvedRedirectUri
    );

    // Step 2 — Fetch nurse attributes from ID.me
    const idmeData = await fetchAttributes(baseUrl, accessToken);

    // Step 3 — Validate IAL2 + nurse community membership
    const validation = validateAttributes(idmeData);
    if (!validation.valid) {
      return res.status(200).json({ success: false, reason: validation.reason });
    }

    // Step 4 — Extract and return verified attributes to Bubble
    const attributes = extractAttributes(idmeData);
    return res.status(200).json({ success: true, ...attributes });

  } catch (error) {
    console.error('ID.me callback error:', error.message);
    return res.status(500).json({ success: false, reason: 'server_error', error: error.message });
  }
};

// ─── Token Exchange ───────────────────────────────────────────────────────────

function exchangeCodeForToken(baseUrl, clientId, clientSecret, code, redirectUri) {
  return new Promise((resolve, reject) => {
    const body = querystring.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const url = new URL(`${baseUrl}/oauth/token`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const reqHttp = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.access_token) {
            return reject(new Error(`Token exchange failed: ${data}`));
          }
          resolve(parsed.access_token);
        } catch {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    reqHttp.on('error', reject);
    reqHttp.write(body);
    reqHttp.end();
  });
}

// ─── Fetch Attributes ─────────────────────────────────────────────────────────

function fetchAttributes(baseUrl, accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/public/v3/attributes.json`);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };

    const reqHttp = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          reject(new Error(`Failed to parse attributes response: ${data}`));
        }
      });
    });

    reqHttp.on('error', reject);
    reqHttp.end();
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAttributes(idmeData) {
  // Check IAL2
  const ialAttr = getAttribute(idmeData, 'ial');
  if (ialAttr !== '2') {
    return { valid: false, reason: 'ial_insufficient' };
  }

  // Check nurse community membership
  const status = idmeData.status;
  if (!status || !Array.isArray(status) || status.length === 0) {
    return { valid: false, reason: 'no_community_status' };
  }

  const nurseStatus = status.find(
    (s) => s.group === 'nurse' && s.verified === true
  );

  if (!nurseStatus) {
    return { valid: false, reason: 'nurse_community_not_verified' };
  }

  return { valid: true };
}

// ─── Attribute Extraction ─────────────────────────────────────────────────────

function extractAttributes(idmeData) {
  const nurseStatus = idmeData.status.find((s) => s.group === 'nurse');

  return {
    firstName: getAttribute(idmeData, 'fname'),
    lastName: getAttribute(idmeData, 'lname'),
    email: getAttribute(idmeData, 'email'),
    idmeSubject: getAttribute(idmeData, 'uuid'),
    ial: getAttribute(idmeData, 'ial'),
    group: nurseStatus?.group || null,
    subgroup: nurseStatus?.subgroup || null,
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getAttribute(idmeData, handle) {
  if (!idmeData.attributes || !Array.isArray(idmeData.attributes)) return null;
  const attr = idmeData.attributes.find((a) => a.handle === handle);
  return attr ? attr.value : null;
}
