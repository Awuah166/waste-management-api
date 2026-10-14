const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const standardSecurityHeaders = helmet();
const documentationSecurityHeaders = helmet({ contentSecurityPolicy: false });

app.use((req, res, next) => {
  const isDocumentationRequest = req.path === '/api-docs' || req.path.startsWith('/api-docs/');
  const securityHeaders = isDocumentationRequest
    ? documentationSecurityHeaders
    : standardSecurityHeaders;
  securityHeaders(req, res, next);
});
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const connected = mongoose.connection.readyState === 1;

  res.status(connected ? 200 : 503).json({
    status: connected ? 'ok' : 'unavailable',
    database: connected ? mongoose.connection.name : null,
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/users', require('./routes/users'));
app.use('/api/waste-requests', require('./routes/wasteRequests'));
app.use('/api/collections', require('./routes/collections'));
app.use('/api/feedback', require('./routes/feedback'));

app.use((req, res) => {
  res.status(404).json({ error: { message: 'Route not found.' } });
});
app.use(errorHandler);

module.exports = app;
