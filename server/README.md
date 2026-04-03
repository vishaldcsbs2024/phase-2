# GigShield Backend - Parametric Income Insurance Platform

> Fast, secure, and automatic income protection for delivery partners during external disruptions

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18+-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791)
![Redis](https://img.shields.io/badge/Redis-6+-DC382D)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-3178C6)

## 🎯 Features

### Core Insurance
- **Weekly Premiums**: Affordable ₹/week subscription model
- **Parametric Payouts**: Instant automatic payouts during disruptions
- **Zero Manual Claims**: Disruptions automatically trigger claims
- **Income Loss Coverage Only**: Focused on income protection

### Supported Platforms
- 🍕 Zomato | 🛵 Swiggy | ⚡ Zepto | 📦 Blinkit | 🛒 Amazon | 🚴 Dunzo

### Disruption Coverage
| Disruption | Payout |
|-----------|--------|
| Heavy Rain | ₹300 |
| Extreme Heat (>45°C) | ₹250 |
| Flood | ₹500 |
| Severe AQI (>300) | ₹200 |
| Curfew | ₹400 |
| Strike | ₹350 |

### Automation
- ✅ Instant claim creation (no manual filing)
- ✅ Auto-approval after 24 hours
- ✅ Daily payout processing
- ✅ Hourly disruption monitoring
- ✅ Weekly premium billing

### Security
- 🔐 JWT authentication
- 🔒 Bcrypt password hashing
- 🛡️ Helmet.js security headers
- 🌐 CORS enabled
- 📝 Environment-based secrets

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm or yarn or bun

### Installation

```bash
# Install dependencies
cd server
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Create database
createdb gigshield

# Start Redis (in another terminal)
redis-server

# Run development server
npm run dev
```

Server will start on `http://localhost:3000`

## 📚 API Overview

### Authentication
```bash
POST   /api/auth/register          # Register new partner
POST   /api/auth/login             # Login partner
GET    /api/auth/profile           # Get partner profile (protected)
PUT    /api/auth/profile           # Update profile (protected)
```

### Policies (Protected)
```bash
POST   /api/policies/create        # Create insurance policy
GET    /api/policies/active        # Get active policy
POST   /api/policies/renew         # Renew policy
GET    /api/policies/:id/claims    # Get policy claims
GET    /api/policies/:id/stats     # Get policy statistics
```

### Claims
```bash
POST   /api/claims/create          # File claim (protected)
GET    /api/claims/my-claims       # Get my claims (protected)
POST   /api/claims/:id/approve     # Approve claim (admin)
POST   /api/claims/report-disruption # Report disruption
```

### Payouts (Protected)
```bash
GET    /api/payouts/my-payouts     # Get my payouts
GET    /api/payouts/stats          # Get payout statistics
GET    /api/payouts/total          # Get total payouts
```

### Disruptions
```bash
POST   /api/disruptions/record     # Record new disruption
GET    /api/disruptions/active     # Get active disruptions
POST   /api/disruptions/:id/resolve # Resolve disruption
```

### Health
```bash
GET    /health                     # Health check with metrics
```

## 📋 Example Usage

### Register Partner
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "9876543210",
    "fullName": "Priya Delivery",
    "password": "secure123"
  }'
```

### Create Policy
```bash
curl -X POST http://localhost:3000/api/policies/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"premiumWeekly": 50}'
```

### File Claim on Rain
```bash
curl -X POST http://localhost:3000/api/claims/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "policy-uuid",
    "disruptionType": "heavy_rain",
    "location": "Mumbai"
  }'
```

## 🏗️ Project Structure

```
server/
├── src/
│   ├── db/                 # Database setup & schema
│   ├── models/             # Data models
│   │   ├── Partner.ts      # Partner information
│   │   ├── Policy.ts       # Insurance policies
│   │   ├── Claim.ts        # Claims filing
│   │   ├── Disruption.ts   # External disruptions
│   │   ├── Payout.ts       # Automatic payouts
│   │   └── Payment.ts      # Premium payments
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic
│   │   ├── auth.service.ts
│   │   ├── policy.service.ts
│   │   ├── claim.service.ts
│   │   ├── payout.service.ts
│   │   └── disruption.service.ts
│   ├── routes/             # API endpoints
│   ├── middleware/         # Auth & error handling
│   ├── utils/              # Config, auth, responses
│   ├── jobs/               # Cron job definitions
│   └── index.ts            # Main server
├── API_DOCUMENTATION.md    # Complete API reference
├── SETUP_GUIDE.md          # Detailed setup instructions
└── package.json
```

## ⚙️ Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Payout Processing | Daily 2 AM | Process pending payouts |
| Claim Processing | Every 6 hours | Auto-approve old claims |
| Disruption Monitor | Hourly | Monitor & auto-resolve disruptions |
| Weekly Billing | Mon 8 AM | Process weekly premiums |

## 📦 Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4.18 |
| Language | TypeScript 5.3 |
| Database | PostgreSQL 14+ |
| Cache | Redis 6+ |
| Auth | JWT + bcrypt |
| Scheduling | node-cron |
| HTTP | axios |
| Security | Helmet.js, CORS |

## 🔐 Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=gigshield

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=strong_secret_key_here

# External APIs
WEATHER_API_KEY=openweather_key
POLLUTION_API_KEY=waqi_key
```

## 📊 Database Schema

### Core Tables
- **partners** - Partner profiles with KYC info
- **policies** - Active insurance policies
- **claims** - Filed claims during disruptions
- **disruptions** - External events (rain, heat, etc.)
- **payouts** - Auto-calculated income payouts
- **payments** - Premium payment transactions

All tables include:
- UUID primary keys
- Timestamps (created_at, updated_at)
- Proper indexing for performance
- CASCADE delete relationships

## 🧪 Testing

```bash
# Health check
curl http://localhost:3000/health

# Get active disruptions
curl http://localhost:3000/api/disruptions/active

# Register test partner
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9999999999","fullName":"Test Partner","password":"test123"}'
```

## 📈 Performance Metrics

- Response time: <100ms average
- Database queries: Indexed and optimized
- Concurrent connections: Support via connection pooling
- Memory usage: ~80-100MB baseline
- Cron job overhead: Minimal async scheduling

## 🚀 Deployment

### Docker
```bash
docker build -t gigshield-backend .
docker run -p 3000:3000 --env-file .env gigshield-backend
```

### Production Checklist
- [ ] Use managed PostgreSQL (AWS RDS, Neon, etc.)
- [ ] Use managed Redis (AWS ElastiCache, Redis Cloud, etc.)
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS/TLS
- [ ] Set NODE_ENV=production
- [ ] Use environment-specific secrets
- [ ] Enable database backups
- [ ] Set up monitoring & alerting
- [ ] Configure rate limiting
- [ ] Enable logging aggregation

## 📖 Documentation

- **API_DOCUMENTATION.md** - Complete API reference with examples
- **SETUP_GUIDE.md** - Step-by-step setup and troubleshooting
- **Database schema** - See src/db/schema.ts

## 🤝 Contributing

GigShield is built for delivery partners' financial protection. 

## 📄 License

Proprietary - GigShield Insurance Platform

---

**Built with ❤️ for delivery partners**

*Protecting livelihoods during external disruptions*
