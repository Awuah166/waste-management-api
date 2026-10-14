const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Waste Management API',
      version: '1.0.0',
      description: 'CRUD API for users, waste requests, collection assignments, and feedback.',
    },
    servers: [{ url: '/', description: 'Current server' }],
    tags: [
      { name: 'Users', description: 'Registered users' },
      { name: 'Waste Requests', description: 'Resident waste collection requests' },
      { name: 'Collections', description: 'Collection assignments and activities' },
      { name: 'Feedback', description: 'Resident feedback' },
    ],
    components: {
      parameters: {
        Id: {
          name: 'id',
          in: 'path',
          required: true,
          description: 'MongoDB ObjectId',
          schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
        },
      },
      schemas: {
        UserInput: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password', 'role'],
          properties: {
            firstName: { type: 'string', example: 'Ama' },
            lastName: { type: 'string', example: 'Mensah' },
            email: { type: 'string', format: 'email', example: 'ama@example.com' },
            password: { type: 'string', minLength: 8, writeOnly: true, example: 'StrongPass123!' },
            role: { type: 'string', enum: ['resident', 'collector', 'administrator'] },
          },
        },
        UserUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, writeOnly: true },
            role: { type: 'string', enum: ['resident', 'collector', 'administrator'] },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '65a123456789012345678901' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['resident', 'collector', 'administrator'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        WasteRequestInput: {
          type: 'object',
          required: ['residentId', 'wasteType', 'address', 'description', 'preferredCollectionDate'],
          properties: {
            residentId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            wasteType: { type: 'string', example: 'Recyclables' },
            address: { type: 'string', example: '10 Sample Street, Accra' },
            description: { type: 'string', example: 'Bagged plastic bottles and cardboard.' },
            preferredCollectionDate: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
              default: 'pending',
            },
          },
        },
        WasteRequestUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            residentId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            wasteType: { type: 'string' },
            address: { type: 'string' },
            description: { type: 'string' },
            preferredCollectionDate: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
            },
          },
        },
        WasteRequest: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            residentId: {
              oneOf: [
                { type: 'string' },
                { $ref: '#/components/schemas/User' },
              ],
            },
            wasteType: { type: 'string' },
            address: { type: 'string' },
            description: { type: 'string' },
            preferredCollectionDate: { type: 'string', format: 'date-time' },
            status: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CollectionInput: {
          type: 'object',
          required: ['wasteRequestId', 'collectorId', 'scheduledDate'],
          properties: {
            wasteRequestId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            collectorId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            scheduledDate: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
            },
            completedAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        CollectionUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            wasteRequestId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            collectorId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            scheduledDate: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['pending', 'scheduled', 'in-progress', 'completed', 'cancelled'],
            },
            completedAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        FeedbackInput: {
          type: 'object',
          required: ['userId', 'rating'],
          properties: {
            userId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            wasteRequestId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
          },
        },
        FeedbackUpdate: {
          type: 'object',
          minProperties: 1,
          properties: {
            userId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            wasteRequestId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                details: { type: 'array', items: {} },
              },
              required: ['message'],
            },
          },
          required: ['error'],
        },
      },
      responses: {
        BadRequest: {
          description: 'Invalid input or identifier.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        NotFound: {
          description: 'The requested record does not exist.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        Conflict: {
          description: 'The request conflicts with an existing record or relationship.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        ServerError: {
          description: 'Unexpected server error.',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
  },
  apis: [path.join(__dirname, '..', 'routes', '*.js').replace(/\\/g, '/')],
};

module.exports = swaggerJsdoc(options);
