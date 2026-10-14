require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Collection = require('../models/Collection');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const WasteRequest = require('../models/WasteRequest');

const examplePassword = 'ExamplePass123!';

const users = [
  { firstName: 'Ama', lastName: 'Mensah', email: 'ama.mensah@example.com', role: 'resident' },
  { firstName: 'Kojo', lastName: 'Boateng', email: 'kojo.boateng@example.com', role: 'resident' },
  { firstName: 'Abena', lastName: 'Owusu', email: 'abena.owusu@example.com', role: 'collector' },
  { firstName: 'Kofi', lastName: 'Asare', email: 'kofi.asare@example.com', role: 'administrator' },
];

const requests = [
  {
    residentEmail: 'ama.mensah@example.com',
    wasteType: 'Recyclables',
    address: '10 Sample Street, Accra',
    description: 'Bagged plastic bottles and cardboard boxes.',
    collectionDaysFromNow: 3,
    status: 'pending',
  },
  {
    residentEmail: 'kojo.boateng@example.com',
    wasteType: 'Organic',
    address: '22 Example Road, Accra',
    description: 'Kitchen scraps in a sealed compost bin.',
    collectionDaysFromNow: 5,
    status: 'scheduled',
  },
  {
    residentEmail: 'ama.mensah@example.com',
    wasteType: 'General',
    address: '10 Sample Street, Accra',
    description: 'Two tied bags of household waste.',
    collectionDaysFromNow: 7,
    status: 'in-progress',
  },
  {
    residentEmail: 'kojo.boateng@example.com',
    wasteType: 'Electronic',
    address: '22 Example Road, Accra',
    description: 'One non-working small household appliance.',
    collectionDaysFromNow: 10,
    status: 'completed',
  },
];

async function seed() {
  await connectDB();

  try {
    const password = await bcrypt.hash(examplePassword, 10);

    for (const user of users) {
      await User.updateOne(
        { email: user.email },
        { $setOnInsert: { ...user, password } },
        { upsert: true, runValidators: true },
      );
    }

    const savedUsers = await User.find({ email: { $in: users.map((user) => user.email) } });
    const userIdsByEmail = new Map(savedUsers.map((user) => [user.email, user._id]));

    for (const request of requests) {
      const residentId = userIdsByEmail.get(request.residentEmail);

      if (!residentId) {
        throw new Error(`Could not find seeded resident ${request.residentEmail}`);
      }

      const preferredCollectionDate = new Date(
        Date.now() + request.collectionDaysFromNow * 24 * 60 * 60 * 1000,
      );
      const { residentEmail, collectionDaysFromNow, ...requestFields } = request;

      await WasteRequest.updateOne(
        { residentId, description: request.description },
        {
          $setOnInsert: {
            ...requestFields,
            residentId,
            preferredCollectionDate,
          },
        },
        { upsert: true, runValidators: true },
      );
    }

    const savedRequests = await WasteRequest.find({
      residentId: { $in: [...userIdsByEmail.values()] },
      description: { $in: requests.map((request) => request.description) },
    });
    const requestsByDescription = new Map(
      savedRequests.map((request) => [request.description, request]),
    );
    const collectorId = userIdsByEmail.get('abena.owusu@example.com');

    for (const requestExample of requests) {
      const wasteRequest = requestsByDescription.get(requestExample.description);
      if (!wasteRequest) {
        throw new Error(`Could not find seeded waste request "${requestExample.description}"`);
      }

      await Collection.updateOne(
        { wasteRequestId: wasteRequest._id, collectorId },
        {
          $setOnInsert: {
            wasteRequestId: wasteRequest._id,
            collectorId,
            scheduledDate: wasteRequest.preferredCollectionDate,
            status: wasteRequest.status,
            ...(wasteRequest.status === 'completed' ? { completedAt: new Date() } : {}),
            notes: 'Example collection assignment created by the seed script.',
          },
        },
        { upsert: true, runValidators: true },
      );
    }

    const completedExample = requests.find((request) => request.status === 'completed');
    const completedRequest = requestsByDescription.get(completedExample.description);
    await Feedback.updateOne(
      { userId: completedRequest.residentId, wasteRequestId: completedRequest._id },
      {
        $setOnInsert: {
          userId: completedRequest.residentId,
          wasteRequestId: completedRequest._id,
          rating: 5,
          comment: 'Example feedback: the waste collection service was excellent.',
        },
      },
      { upsert: true, runValidators: true },
    );

    const collectionCount = await Collection.countDocuments({ collectorId });
    const feedbackCount = await Feedback.countDocuments({
      wasteRequestId: completedRequest._id,
    });

    console.log('Seeded 4 example users and 4 example waste requests.');
    console.log(`Ensured example collection assignments exist (collector has ${collectionCount}).`);
    console.log(`Ensured example feedback exists (completed request has ${feedbackCount}).`);
    console.log(`Example login password for all seeded users: ${examplePassword}`);
  } finally {
    await require('mongoose').disconnect();
  }
}

seed().catch((error) => {
  console.error('Failed to seed example data:', error);
  process.exitCode = 1;
});
