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
