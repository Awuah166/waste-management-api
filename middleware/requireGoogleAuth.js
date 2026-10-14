const { OAuth2Client } = require('google-auth-library');

const googleOAuthClient = new OAuth2Client();

function unauthorized(res) {
  return res.status(401).json({
    error: { message: 'A valid Google OAuth ID token is required.' },
  });
}

async function requireGoogleAuth(req, res, next) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(503).json({
      error: { message: 'Google OAuth is not configured on this server.' },
    });
  }

  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  if (!match) {
    return unauthorized(res);
  }

  let ticket;
  try {
    ticket = await googleOAuthClient.verifyIdToken({
      idToken: match[1],
      audience: clientId,
    });
  } catch (error) {
    if (error.name === 'GaxiosError' && (!error.response || error.response.status >= 500)) {
      console.error('Google OAuth verification service is unavailable:', error.message);
      return res.status(503).json({
        error: { message: 'Google OAuth verification is temporarily unavailable.' },
      });
    }
    if (error.name !== 'GaxiosError' && error.name !== 'Error') {
      console.error('Unexpected Google OAuth verification error:', error);
      return res.status(500).json({
        error: { message: 'Google OAuth verification failed unexpectedly.' },
      });
    }
    return unauthorized(res);
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || payload.email_verified !== true) {
    return unauthorized(res);
  }

  req.auth = { googleId: payload.sub, email: payload.email };
  return next();
}

module.exports = requireGoogleAuth;
