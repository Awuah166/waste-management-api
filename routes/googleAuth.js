const crypto = require('node:crypto');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const stateCookieName = 'google_oauth_state';
const stateLifetimeSeconds = 600;

function getOAuthConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    return null;
  }

  let redirectUrl;
  try {
    redirectUrl = new URL(GOOGLE_REDIRECT_URI);
  } catch (error) {
    return null;
  }

  if (!['http:', 'https:'].includes(redirectUrl.protocol)
    || (redirectUrl.protocol === 'http:' && redirectUrl.hostname !== 'localhost')) {
    return null;
  }

  return {
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: redirectUrl.toString(),
    secureCookie: redirectUrl.protocol === 'https:',
  };
}

function stateCookieOptions(config, maxAge) {
  return {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: 'lax',
    path: '/auth/google',
    maxAge,
  };
}

function readStateCookie(req) {
  const cookieHeader = req.get('cookie') || '';
  const entry = cookieHeader.split(';').map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${stateCookieName}=`));
  return entry ? entry.slice(stateCookieName.length + 1) : null;
}

function validState(expectedState, suppliedState) {
  if (!expectedState || !suppliedState) {
    return false;
  }

  const expected = Buffer.from(expectedState);
  const supplied = Buffer.from(suppliedState);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

function configurationError(res) {
  return res.status(503).json({
    error: {
      message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.',
    },
  });
}

router.get('/', (req, res) => {
  const config = getOAuthConfig();
  if (!config) {
    return configurationError(res);
  }

  const state = crypto.randomBytes(32).toString('base64url');
  res.cookie(stateCookieName, state, stateCookieOptions(
    config,
    stateLifetimeSeconds * 1000,
  ));

  const oauthClient = new OAuth2Client(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
  const authorizationUrl = oauthClient.generateAuthUrl({
    access_type: 'online',
    include_granted_scopes: true,
    prompt: 'select_account',
    response_type: 'code',
    scope: ['openid', 'email', 'profile'],
    state,
  });

  return res.redirect(302, authorizationUrl);
});

router.get('/callback', async (req, res) => {
  const config = getOAuthConfig();
  if (!config) {
    return configurationError(res);
  }

  res.clearCookie(stateCookieName, stateCookieOptions(config, 0));
  if (req.query.error) {
    return res.status(401).json({
      error: { message: 'Google sign-in was denied or could not be completed.' },
    });
  }

  if (typeof req.query.state !== 'string'
    || !validState(readStateCookie(req), req.query.state)) {
    return res.status(400).json({
      error: { message: 'Google OAuth state is missing, expired, or invalid. Start sign-in again.' },
    });
  }

  if (typeof req.query.code !== 'string' || !req.query.code) {
    return res.status(400).json({
      error: { message: 'Google OAuth callback is missing its authorization code.' },
    });
  }

  const oauthClient = new OAuth2Client(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );

  try {
    const { tokens } = await oauthClient.getToken({
      code: req.query.code,
      redirect_uri: config.redirectUri,
    });
    if (!tokens.id_token) {
      return res.status(401).json({
        error: { message: 'Google did not return an OpenID Connect ID token.' },
      });
    }

    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: config.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || payload.email_verified !== true) {
      return res.status(401).json({
        error: { message: 'Google returned an invalid or unverified identity.' },
      });
    }

    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    return res.json({
      data: {
        idToken: tokens.id_token,
        user: {
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        },
      },
    });
  } catch (error) {
    console.error('Google OAuth callback failed:', error.message);
    return res.status(502).json({
      error: { message: 'Google sign-in could not be verified. Please try again.' },
    });
  }
});

module.exports = router;
