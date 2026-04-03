# GigShield Backend - Quick Start Guide

## Folder Structure

```
server/
├── src/
│   ├── config/
│   │   ├── database.js          # PostgreSQL connection & queries
│   │   └── redis.js             # Redis cache setup
│   ├── middleware/
│   │   ├── auth.js              # JWT verification
│   │   └── errorHandler.js      # Global error handling
│   ├── routes/
│   │   ├── partners.js          # Partner registration & profile
│   │   ├── premium.js           # Premium calculation & enrollment
│   │   ├── claims.js            # Claims management
│   │   └── demo.js              # Demo scenario endpoint
│   ├── services/
│   │   ├── premiumCalculator.js # Premium calculation logic
│   │   ├── fraudDetector.js     # Fraud detection checks
│   │   └── payoutService.js     # Payout processing
│   └── index.js                 # Express server setup
├── package.json                 # Dependencies
├── .env                         # Environment variables (configured)
├── .env.example                 # Example env file
├── DATABASE_SCHEMA.sql          # SQL schema to create tables
└── QUICKSTART.md                # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Setup PostgreSQL Database

```bash
# Create database
createdb gigshield

# Create tables (run in psql)
psql -U postgres -d gigshield -f DATABASE_SCHEMA.sql
```

### 3. Start Redis (in another terminal)

```bash
redis-server
```

### 4. Configure Environment

The `.env` file is already configured with default values:
- PORT: 3001
- DATABASE_URL: postgresql://postgres:password@localhost:5432/gigshield
- REDIS_URL: redis://localhost:6379
- JWT_SECRET: dev-secret

Update `DATABASE_URL` if your PostgreSQL credentials are different.

### 5. Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

## API Endpoints

### Partners
```
POST   /api/partners/register      # Register with phone, name, platform, city
POST   /api/partners/verify-otp    # Verify OTP to complete registration
GET    /api/partners/profile       # Get partner profile (needs token)
```

### Premium
```
POST   /api/premium/quote          # Get premium quote
POST   /api/premium/enroll         # Enroll in policy (needs token)
```

### Claims
```
GET    /api/claims/my-claims       # Get partner claims (needs token)
POST   /api/claims/manual          # File manual claim (needs token)
```

### Demo
```
GET    /api/demo/trigger-scenario  # Run end-to-end demo
```

### Health
```
GET    /api/health                 # Health check
```

## Test Flow Example

### 1. Health Check
```bash
curl http://localhost:3001/api/health
```

### 2. Register Partner
```bash
curl -X POST http://localhost:3001/api/partners/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "name": "Rajesh Kumar",
    "platform": "zomato",
    "city": "Mumbai"
  }'
```

### 3. Verify OTP (use the OTP from step 2 response)
```bash
curl -X POST http://localhost:3001/api/partners/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "otp": "123456"
  }'
```

### 4. Get Premium Quote
```bash
curl -X POST http://localhost:3001/api/premium/quote \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zomato",
    "city": "Mumbai",
    "riskFactors": {
      "rain": true,
      "heat": false,
      "aqi": false
    }
  }'
```

### 5. Enroll in Policy (use token from step 3)
```bash
curl -X POST http://localhost:3001/api/premium/enroll \
  -H "Authorization: Bearer <TOKEN_FROM_STEP_3>" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "zomato",
    "city": "Mumbai",
    "riskFactors": {
      "rain": true,
      "heat": false,
      "aqi": false
    }
  }'
```

### 6. Run Demo Scenario (creates fake flow end-to-end)
```bash
curl http://localhost:3001/api/demo/trigger-scenario
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "error": ""
}
```

Error response:
```json
{
  "success": false,
  "data": null,
  "error": "Error message"
}
```

## Key Features Implemented

✅ Partner registration with OTP verification  
✅ JWT token authentication  
✅ Premium calculation based on platform & risk factors  
✅ Policy enrollment  
✅ Claim filing with fraud detection  
✅ Payout processing  
✅ End-to-end demo scenario  
✅ Redis caching for quotes  
✅ Parameterized SQL queries (SQL injection safe)  
✅ Global error handling  
✅ Rate limiting  

## Environment Variables

```
PORT            - Server port (default: 3001)
DATABASE_URL    - PostgreSQL connection string
REDIS_URL       - Redis connection string
JWT_SECRET      - Secret key for JWT tokens
NODE_ENV        - development or production
```

## Troubleshooting

### Database connection error
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env matches your setup
- Run `psql -U postgres -d gigshield -c "SELECT 1"` to test

### Redis connection error
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_URL in .env

### Port already in use
- Change PORT in .env
- Or kill process on 3001: `lsof -i :3001` then `kill -9 <PID>`

## Next Steps

1. Test all endpoints using the curl examples above
2. Review the code in `src/` to understand the flow
3. Modify premium rates in `src/services/premiumCalculator.js`
4. Add more fraud checks in `src/services/fraudDetector.js`
5. Customize payout logic in `src/services/payoutService.js`
6. Deploy to production (update JWT_SECRET and DATABASE_URL)

---

**Backend is ready to use!** 🚀
