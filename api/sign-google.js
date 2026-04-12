const jwt = require('jsonwebtoken');

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
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const classId = process.env.GOOGLE_WALLET_CLASS_ID;
    const objectId = `passto_nurse_${nurseId}_${Date.now()}`;

    const genericObject = {
      id: `${issuerId}.${objectId}`,
      classId: `${issuerId}.${classId}`,
      state: 'ACTIVE',
      hexBackgroundColor: '#1A1A2E',
      logo: {
        sourceUri: {
          uri: process.env.PASSTO_LOGO_URL,
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: 'PassTo Logo',
          },
        },
      },
      cardTitle: {
        defaultValue: {
          language: 'en-US',
          value: 'PassTo',
        },
      },
      subheader: {
        defaultValue: {
          language: 'en-US',
          value: 'Verified Nursing License',
        },
      },
      header: {
        defaultValue: {
          language: 'en-US',
          value: verifiedName,
        },
      },
      textModulesData: [
        {
          id: 'license_number',
          header: 'LICENSE #',
          body: licenseNumber,
        },
        {
          id: 'license_type',
          header: 'TYPE',
          body: licenseType || 'Registered Nurse',
        },
        {
          id: 'status',
          header: 'STATUS',
          body: status,
        },
        {
          id: 'valid_through',
          header: 'VALID THROUGH',
          body: expirationDate,
        },
        {
          id: 'state',
          header: 'STATE',
          body: state,
        },
      ],
      linksModuleData: {
        uris: [
          {
            uri: `https://passto.com/verify/${objectId}`,
            description: 'Verify This Credential',
            id: 'verify_link',
          },
        ],
      },
      barcode: {
        type: 'QR_CODE',
        value: `https://passto.com/verify/${objectId}`,
        alternateText: licenseNumber,
      },
    };

    const claims = {
      iss: serviceAccount.client_email,
      aud: 'google',
      origins: ['passto.com', 'app.passto.com'],
      typ: 'savetowallet',
      payload: {
        genericObjects: [genericObject],
      },
    };

    const token = jwt.sign(claims, serviceAccount.private_key, {
      algorithm: 'RS256',
    });

    return res.status(200).json({
      success: true,
      saveUrl: `https://pay.google.com/gp/v/save/${token}`,
      objectId: `${issuerId}.${objectId}`,
    });
  } catch (error) {
    console.error('Google Wallet signing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
