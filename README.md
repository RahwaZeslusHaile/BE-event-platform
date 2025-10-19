# BE-event-platform

This repository contains the backend for the Events Platform. It is a small Express server that fetches events from the Ticketmaster Discovery API, provides a simple /api/events endpoint to the frontend, and creates Stripe Checkout sessions for payments.

## Recommended deployment

We recommend deploying the backend to Render (https://render.com) for a simple, reliable managed service that supports environment variables and automatic GitHub deployments.

### Render deployment steps

1. Create an account on Render and connect your GitHub account.
2. In Render, click "New" → "Web Service" and select the `BE-event-platform` repository.
3. For the service settings use:
	 - Name: be-event-platform (or your preferred name)
	 - Branch: `main`
	 - Root Directory: leave empty (server files are at repository root)
	 - Build Command: leave empty or `npm install` (Render auto-detects Node)
	 - Start Command: `node server.js`
	 - Instance Type: Starter (or as needed)
4. Add the required environment variables under the "Environment" tab:
	 - `TICKETMASTER_API_KEY` — your Ticketmaster API key
	 - `STRIPE_SECRET_KEY` — your Stripe secret key
	 - `PORT` — optional; Render sets this automatically, but the server will fall back to process.env.PORT
5. Create the service and deploy. Render will build and run the app and provide a public URL like `https://be-event-platform.onrender.com`.

### After deployment

- Note the public URL Render provides (for example `https://be-event-platform.onrender.com`).
- Update your frontend to use this URL as the API base. In the frontend repo (client) set the environment variable:
	- `VITE_API_URL=https://be-event-platform.onrender.com`

	If your frontend reads `VITE_API_URL` at build time, rebuild and redeploy the frontend (e.g., Netlify) so the client points to the production backend.

### Health checks and logging

- Render provides a live log view and automatic restarts on failure. Use logs to troubleshoot runtime errors.

## Development notes

- To run locally:
	- Add a `.env` file in the `server` folder with:
		```
		TICKETMASTER_API_KEY=your_ticketmaster_key
		STRIPE_SECRET_KEY=your_stripe_secret_key
		```
	- Install dependencies and start the server:
		```bash
		cd server
		npm install
		node server.js
		```

