# GigShield Backend - Setup Guide

## Installation

### 1. Install Dependencies
```bash
cd server
npm install
# or with yarn
yarn install
# or with bun
bun install
```

### 2. Set Up Environment Variables
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

### 3. Create PostgreSQL Database
```bash
createdb gigshield
# or through psql
psql -U postgres
CREATE DATABASE gigshield;
```

### 4. Start Redis Server
```bash
redis-server
# or if using Docker
docker run -d -p 6379:6379 redis
```

### 5. Run Development Server
```bash
npm run dev
```

The server will:
- Initialize the database schema
- Start all cron jobs
- Listen on `http://localhost:3000`

---

## Project Structure

```
server/
├── src/
│   ├── db/              # Database connection & schema
│   ├── models/          # Data models (Partner, Policy, Claim, etc.)
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & error handling
│   ├── utils/           # Helpers (config, auth, response)
│   ├── jobs/            # Cron jobs
│   └── index.ts         # Main server file
├── package.json
├── tsconfig.json
├── .env.example
└── API_DOCUMENTATION.md
```

---

## Key Features

### 1. Partner Management
- Phone-based registration
- KYC verification status
- Multi-platform support (Zomato, Swiggy, Zepto, etc.)

### 2. Weekly Premiums
- Flexible premium structure (₹/week)
- Coverage = Premium × 500 multiplier
- Auto-renewal system

### 3. Parametric Payouts
- **Heavy Rain** → ₹300
- **Extreme Heat** → ₹250
- **Flood** → ₹500
- **Severe AQI** → ₹200
- **Curfew** → ₹400
- **Strike** → ₹350

### 4. Automatic Processing
- Instant claim creation on disruption reports
- Auto-approval of claims after 24 hours
- Daily payout processing
- Hourly disruption monitoring

### 5. Security
- JWT authentication
- Password hashing with bcrypt
- Environment-based secrets
- Helmet.js for HTTP headers
- CORS enabled

---

## Testing API

### Using cURL

#### Register Partner
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "fullName": "John Delivery",
    "password": "secure123"
  }'
```

#### Create Policy
```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/api/policies/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"premiumWeekly": 50}'
```

#### File a Claim
```bash
curl -X POST http://localhost:3000/api/claims/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "policy-uuid-here",
    "disruptionType": "heavy_rain",
    "location": "Mumbai"
  }'
```

#### Check Payouts
```bash
curl -X GET http://localhost:3000/api/payouts/my-payouts \
  -H "Authorization: Bearer $TOKEN"
```

---

## Database Queries

### Check Active Policies
```sql
SELECT * FROM policies WHERE status = 'active';
```

### Get Claims for Partner
```sql
SELECT * FROM claims WHERE partner_id = '...' ORDER BY claim_date DESC;
```

### Pending Payouts
```sql
SELECT * FROM payouts WHERE status = 'pending' ORDER BY created_at ASC;
```

### Active Disruptions by Location
```sql
SELECT * FROM disruptions WHERE location = 'Mumbai' AND resolved_at IS NULL;
```

---

## Deployment

### Build for Production
```bash
npm run build
npm start
```

### Docker Deployment
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment for Production
- Set strong JWT_SECRET
- Use managed PostgreSQL service (RDS, Neon, etc.)
- Use managed Redis (ElastiCache, Redis Cloud, etc.)
- Enable HTTPS
- Set NODE_ENV=production

---

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Verify DB credentials in .env
- Check if database exists: `psql -U postgres -l`

### Redis Connection Error
- Ensure Redis is running on port 6379
- Check REDIS_URL in .env
- Try: `redis-cli ping` (should return PONG)

### JWT Token Errors
- Token must be prefixed with "Bearer " in Authorization header
- Token expires after 7 days by default
- Update JWT_SECRET for production

### Port Already in Use
- Change PORT in .env
- Or kill process: `lsof -i :3000` then `kill -9 <PID>`

---

## Support

For issues or questions, refer to:
- API_DOCUMENTATION.md for endpoint details
- Database schema in src/db/schema.ts
- Service layer for business logic details

---

## License
Proprietary - GigShield Insurance Platform
