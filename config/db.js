const mongoose = require('mongoose');
const Collection = require('../models/Collection');
const Feedback = require('../models/Feedback');

async function ensureCollection(model) {
  const collectionName = model.collection.collectionName;
  const existing = await mongoose.connection.db
    .listCollections({ name: collectionName }, { nameOnly: true })
    .hasNext();

  if (!existing) {
    await model.createCollection();
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  const options = process.env.MONGODB_DB
    ? { dbName: process.env.MONGODB_DB }
    : {};

  await mongoose.connect(uri, options);
  await Promise.all([ensureCollection(Collection), ensureCollection(Feedback)]);
  console.log(`Connected to MongoDB Atlas database "${mongoose.connection.name}"`);
}

module.exports = connectDB;