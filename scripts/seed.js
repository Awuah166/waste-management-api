require('dotenv').config();

const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
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

    console.log('Seeded 4 example users and 4 example waste requests.');
    console.log(`Example login password for all seeded users: ${examplePassword}`);
  } finally {
    await require('mongoose').disconnect();
  }
}

seed().catch((error) => {
  console.error('Failed to seed example data:', error);
  process.exitCode = 1;
});
