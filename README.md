# Waste Management API

Node.js and Express API for managing users, resident waste collection requests, collection assignments, and resident feedback with MongoDB Atlas.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your Atlas connection string. Set `MONGODB_DB` to the database name you want the API to use, and configure `GOOGLE_CLIENT_ID` with your Google OAuth 2.0 Web client ID.
3. Start the API with `npm start`.
4. Open `http://localhost:3000/api-docs` for interactive Swagger documentation. `GET /health` reports API/database connection status.

Create a Web application OAuth client in Google Cloud Console, configure the OAuth consent screen, and use its client ID as `GOOGLE_CLIENT_ID`. The client application must complete Google OpenID Connect sign-in and send the resulting ID token in the `Authorization` header using the `Bearer` scheme when calling protected endpoints. The API verifies the token signature, issuer, audience, and verified email with Google's published keys.

Keep `.env` private; do not commit Atlas credentials or other secrets.

## Deploy to Render

Create a Render **Web Service** for this repository and configure:

- **Build command:** `npm install`
- **Start command:** `npm start`
- **Environment variables:** `MONGODB_URI` (Atlas connection string), `MONGODB_DB` (database name), and `GOOGLE_CLIENT_ID` (Google OAuth Web client ID)

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
| GET | `/api/collections` | List collection assignments |
| POST | `/api/collections` | Create a collection assignment |
| GET | `/api/collections/:id` | Get a collection assignment |
| PUT | `/api/collections/:id` | Update a collection assignment |
| DELETE | `/api/collections/:id` | Delete a collection assignment |
| GET | `/api/feedback` | List resident feedback |
| POST | `/api/feedback` | Submit resident feedback |
| GET | `/api/feedback/:id` | Get feedback |
| PUT | `/api/feedback/:id` | Update feedback |
| DELETE | `/api/feedback/:id` | Delete feedback |

User passwords are hashed before storage and omitted from API responses. Request validation errors return `400`, duplicate email addresses and attempts to delete a resident with requests return `409`, and missing records return `404`.

All `/api/waste-requests` and `/api/collections` endpoints require a valid Google OAuth/OpenID Connect ID token. User, feedback, and health endpoints do not require Google authentication. Swagger documents the bearer-token requirement and provides an **Authorize** control for testing protected routes.

## MongoDB models

- `Collection` stores collection assignments and activities in the `collections` collection, referencing a waste request and collector.
- `Feedback` stores resident feedback in the `feedback` collection, referencing its submitting user and optionally a waste request.

The `collections` and `feedback` MongoDB collections are created automatically when the API connects to the configured database. Collection references must point to existing records; collection assignments require a collector user and feedback requires a resident user.
