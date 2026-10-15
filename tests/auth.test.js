const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

const app = require('../app');
const swagger = require('../config/swagger');

test('waste request and collection endpoints reject requests without Google OAuth', async () => {
  const previousClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address();
    const protectedRoutes = [
      ['GET', '/api/waste-requests'],
      ['POST', '/api/waste-requests'],
      ['GET', '/api/waste-requests/507f1f77bcf86cd799439011'],
      ['PUT', '/api/waste-requests/507f1f77bcf86cd799439011'],
      ['DELETE', '/api/waste-requests/507f1f77bcf86cd799439011'],
      ['GET', '/api/collections'],
      ['POST', '/api/collections'],
      ['GET', '/api/collections/507f1f77bcf86cd799439011'],
      ['PUT', '/api/collections/507f1f77bcf86cd799439011'],
      ['DELETE', '/api/collections/507f1f77bcf86cd799439011'],
    ];

    for (const [method, path] of protectedRoutes) {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, { method });
      assert.equal(response.status, 401, `${method} ${path} should require authentication`);
    }
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    if (previousClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = previousClientId;
    }
  }
});

test('Swagger secures only waste request and collection operations', () => {
  for (const path of ['/api/waste-requests', '/api/waste-requests/{id}', '/api/collections', '/api/collections/{id}']) {
    for (const operation of Object.values(swagger.paths[path])) {
      assert.deepEqual(operation.security, [{ GoogleOAuth: [] }]);
    }
  }

  for (const path of ['/api/users', '/api/users/{id}', '/api/feedback', '/api/feedback/{id}']) {
    for (const operation of Object.values(swagger.paths[path])) {
      assert.equal(operation.security, undefined);
    }
  }
});

test('Google sign-in route redirects to Google when OAuth credentials are configured', async () => {
  const originalEnvironment = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_REDIRECT_URI = 'https://api.example.com/auth/google/callback';

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/auth/google`, {
      redirect: 'manual',
    });
    assert.equal(response.status, 302);
    const authorizationUrl = new URL(response.headers.get('location'));
    assert.equal(authorizationUrl.origin, 'https://accounts.google.com');
    assert.equal(authorizationUrl.searchParams.get('client_id'), process.env.GOOGLE_CLIENT_ID);
    assert.equal(
      authorizationUrl.searchParams.get('redirect_uri'),
      process.env.GOOGLE_REDIRECT_URI,
    );
    assert.equal(authorizationUrl.searchParams.get('response_type'), 'code');
    assert.ok(authorizationUrl.searchParams.get('state'));
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    for (const [key, value] of Object.entries({
      GOOGLE_CLIENT_ID: originalEnvironment.clientId,
      GOOGLE_CLIENT_SECRET: originalEnvironment.clientSecret,
      GOOGLE_REDIRECT_URI: originalEnvironment.redirectUri,
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test('Google sign-in accepts loopback redirect URIs for local development', async () => {
  const originalEnvironment = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  };
  process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
  process.env.GOOGLE_REDIRECT_URI = 'http://127.0.0.1:3000/auth/google/callback';

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/auth/google`, {
      redirect: 'manual',
    });
    assert.equal(response.status, 302);
    const authorizationUrl = new URL(response.headers.get('location'));
    assert.equal(authorizationUrl.searchParams.get('redirect_uri'), process.env.GOOGLE_REDIRECT_URI);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    for (const [key, value] of Object.entries({
      GOOGLE_CLIENT_ID: originalEnvironment.clientId,
      GOOGLE_CLIENT_SECRET: originalEnvironment.clientSecret,
      GOOGLE_REDIRECT_URI: originalEnvironment.redirectUri,
    })) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test('Google sign-in reports missing callback configuration instead of returning a 404', async () => {
  const originalRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  delete process.env.GOOGLE_REDIRECT_URI;

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/auth/google`);
    assert.equal(response.status, 503);
    assert.match((await response.json()).error.message, /GOOGLE_REDIRECT_URI/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    if (originalRedirectUri !== undefined) {
      process.env.GOOGLE_REDIRECT_URI = originalRedirectUri;
    }
  }
});
