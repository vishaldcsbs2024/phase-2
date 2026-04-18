# GigShield (Phase 3)

AI-powered parametric insurance demo for gig workers with automated disruption simulation, claim processing, fraud checks, and payouts.

## Step-by-Step: Run Locally

1. Clone the repository.

```bash
git clone https://github.com/vishaldcsbs2024/phase-3.git
cd phase-3
```

2. Install frontend dependencies.

```bash
npm install
```

3. Install backend dependencies.

```bash
cd server
npm install
cd ..
```

4. Start the backend server (required first).

Windows PowerShell:

```powershell
$env:JWT_SECRET='dev_local_jwt_secret'
cd server
npm run dev
```

macOS/Linux:

```bash
cd server
JWT_SECRET=dev_local_jwt_secret npm run dev
```

Backend runs on:

- `http://localhost:3001`

5. Open a new terminal and start the frontend.

```bash
npm run dev
```

Frontend usually runs on:

- `http://localhost:5173`

If 5173 is busy, Vite will use another port (for example `http://localhost:5174`).

6. Open the frontend URL in your browser and use the app.

## API Base URL (Optional)

If your backend runs on a custom host/port, create a `.env` file in the project root and set:

```env
VITE_API_BASE_URL=http://localhost:3001
```

Then restart the frontend server.

## Common Issues

1. Error: `Unable to reach the GigShield backend`

- Ensure backend terminal is running.
- Confirm backend URL is reachable at `http://localhost:3001/api/health`.
- Set `VITE_API_BASE_URL` if using a different backend host/port.

2. Error: `secretOrPrivateKey must have a value`

- Start backend with `JWT_SECRET` set (see Step 4).

3. Frontend port already in use

- Vite auto-switches port; use the URL shown in terminal output.

## Scripts

Root (`phase-3`):

- `npm run dev` - start frontend
- `npm run build` - production build
- `npm run test` - run tests

Backend (`phase-3/server`):

- `npm run dev` - start backend with nodemon
- `npm start` - start backend with node
