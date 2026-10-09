const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to your .env file.');
  }

  const options = process.env.MONGODB_DB
    ? { dbName: process.env.MONGODB_DB }
    : {};

  await mongoose.connect(uri, options);
  console.log(`Connected to MongoDB Atlas database "${mongoose.connection.name}"`);
}

module.exports = connectDB;