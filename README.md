# Waste Management API

Node.js and Express API for managing users and resident waste collection requests with MongoDB Atlas.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your Atlas connection string. Set `MONGODB_DB` to the database name you want the API to use.
3. Start the API with `npm start`.
4. Open `http://localhost:3000/api-docs` for interactive Swagger documentation. `GET /health` reports API/database connection status.

Keep `.env` private; do not commit Atlas credentials.

## Deploy to Render

Create a Render **Web Service** for this repository and configure:

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Environment variables:** `MONGODB_URI` (Atlas connection string) and `MONGODB_DB` (database name)

The server listens on Render's `PORT` environment variable. Once deployed, Swagger is available at `https://<your-render-service>.onrender.com/api-docs`. Confirm your Atlas network access settings allow the deployed service to connect.

## CRUD endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/users` | List users |
| POST | `/api/users` | Create a user |
| GET | `/api/users/:id` | Get a user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |
| GET | `/api/waste-requests` | List waste requests |
| POST | `/api/waste-requests` | Create a waste request |
| GET | `/api/waste-requests/:id` | Get a waste request |
| PUT | `/api/waste-requests/:id` | Update a waste request |
| DELETE | `/api/waste-requests/:id` | Delete a waste request |

User passwords are hashed before storage and omitted from API responses. Request validation errors return `400`, duplicate email addresses and attempts to delete a resident with requests return `409`, and missing records return `404`.
