const { PKPass } = require('passkit-generator');
const { put } = require('@vercel/blob');
const path = require('path');
const fs = require('fs');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    nurseId,
    verifiedName,
    licenseNumber,
    licenseType,
    status,
    expirationDate,
    issuedDate,
    state = 'New York',
  } = req.body;

  if (!nurseId || !verifiedName || !licenseNumber || !status || !expirationDate) {
    return res.status(400).json({ error: 'Missing required fields: nurseId, verifiedName, licenseNumber, status, expirationDate' });
  }

  try {
    const serialNumber = `passto-${nurseId}-${Date.now()}`;

    // Load certificates from environment variables (stored as base64-encoded PEM)
    const wwdr = Buffer.from(process.env.APPLE_WWDR_PEM_BASE64, 'base64');
    const signerCert = Buffer.from(process.env.APPLE_CERT_PEM_BASE64, 'base64');
    const signerKey = Buffer.from(process.env.APPLE_KEY_PEM_BASE64, 'base64');

    // Load pass image assets (stored in api/assets/ — replace placeholders with real images)
    const assetsDir = path.join(__dirname, 'assets');
    const icon = fs.readFileSync(path.join(assetsDir, 'icon.png'));
    const icon2x = fs.readFileSync(path.join(assetsDir, 'icon@2x.png'));
    const logo = fs.readFileSync(path.join(assetsDir, 'logo.png'));
    const logo2x = fs.readFileSync(path.join(assetsDir, 'logo@2x.png'));

    // Pass layout definition
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
      teamIdentifier: process.env.APPLE_TEAM_ID,
      serialNumber,
      description: 'PassTo Verified Nursing License',
      organizationName: 'PassTo',
      logoText: 'PassTo',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(26, 26, 46)',
      labelColor: 'rgb(79, 142, 247)',
      generic: {
        primaryFields: [
          {
            key: 'name',
            label: 'NURSE',
            value: verifiedName,
          },
        ],
        secondaryFields: [
          {
            key: 'license',
            label: 'LICENSE #',
            value: licenseNumber,
          },
          {
            key: 'type',
            label: 'TYPE',
            value: licenseType || 'Registered Nurse',
          },
        ],
        auxiliaryFields: [
          {
            key: 'status',
            label: 'STATUS',
            value: status,
          },
          {
            key: 'expires',
            label: 'VALID THROUGH',
            value: expirationDate,
          },
        ],
        backFields: [
          {
            key: 'state',
            label: 'STATE',
            value: state,
          },
          {
            key: 'issued',
            label: 'DATE OF LICENSURE',
            value: issuedDate || '',
          },
          {
            key: 'source',
            label: 'VERIFIED BY',
            value: 'NY State Education Department',
          },
          {
            key: 'issuer',
            label: 'CREDENTIAL ISSUED BY',
            value: 'PassTo — passto.com',
          },
        ],
      },
    };

    // Generate .pkpass bundle
    const pass = new PKPass(
      {
        'pass.json': Buffer.from(JSON.stringify(passJson)),
        'icon.png': icon,
        'icon@2x.png': icon2x,
        'logo.png': logo,
        'logo@2x.png': logo2x,
      },
      {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase: process.env.APPLE_CERT_PASSWORD,
      }
    );

    const pkpassBuffer = await pass.getAsBuffer();

    // Upload to Vercel Blob — stable public URL for Apple Wallet download
    const blob = await put(
      `passes/${nurseId}/${serialNumber}.pkpass`,
      pkpassBuffer,
      {
        access: 'public',
        contentType: 'application/vnd.apple.pkpass',
      }
    );

    return res.status(200).json({
      success: true,
      url: blob.url,
      serialNumber,
    });
  } catch (error) {
    console.error('Apple pass signing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
