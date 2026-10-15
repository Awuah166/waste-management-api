require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const port = process.env.PORT || 3000;

async function startServer() {
  await connectDB();

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start the API server:', error);
  process.exitCode = 1;
});


