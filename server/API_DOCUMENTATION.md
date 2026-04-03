# GigShield Backend - API Documentation

## Overview
GigShield is a parametric income insurance platform for delivery partners. It provides automatic payouts during external disruptions without requiring manual claim approval.

## Base URL
```
http://localhost:3000/api
```

## Response Format
All API responses follow this format:
```json
{
  "success": true,
  "data": {},
  "error": ""
}
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## endpoints

### Authentication (/api/auth)

#### 1. Register
- **POST** `/register`
- **Body:**
  ```json
  {
    "phoneNumber": "9876543210",
    "fullName": "John Doe",
    "password": "secure_password"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "partner": {
        "id": "uuid",
        "phone_number": "9876543210",
        "full_name": "John Doe"
      },
      "token": "jwt_token"
    },
    "error": ""
  }
  ```

#### 2. Login
- **POST** `/login`
- **Body:**
  ```json
  {
    "phoneNumber": "9876543210",
    "password": "secure_password"
  }
  ```

#### 3. Get Profile
- **GET** `/profile` (Protected)
- **Response includes:** Partner details + active policies

#### 4. Update Profile
- **PUT** `/profile` (Protected)
- **Body:**
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "bankAccount": "1234567890",
    "ifscCode": "HDFC0001234",
    "upiId": "jane@upi",
    "platforms": ["zomato", "swiggy"]
  }
  ```

---

### Policies (/api/policies)

#### 1. Create Policy
- **POST** `/create` (Protected)
- **Body:**
  ```json
  {
    "premiumWeekly": 50
  }
  ```
- **Response:** New policy object with coverage amount

#### 2. Get Active Policy
- **GET** `/active` (Protected)
- **Returns:** Current active policy for the partner

#### 3. Renew Policy
- **POST** `/renew` (Protected)
- **Body:**
  ```json
  {
    "premiumWeekly": 50
  }
  ```

#### 4. Get Policy Claims
- **GET** `/:policyId/claims` (Protected)
- **Returns:** All claims for the policy

#### 5. Get Policy Stats
- **GET** `/:policyId/stats` (Protected)
- **Returns:** Total claims, total payouts, and claim details

---

### Claims (/api/claims)

#### 1. Create Claim
- **POST** `/create` (Protected)
- **Body:**
  ```json
  {
    "policyId": "uuid",
    "disruptionType": "heavy_rain",
    "location": "Mumbai"
  }
  ```
- **Valid Disruption Types:**
  - `heavy_rain` - ₹300 payout
  - `extreme_heat` - ₹250 payout
  - `flood` - ₹500 payout
  - `severe_aqi` - ₹200 payout
  - `curfew` - ₹400 payout
  - `strike` - ₹350 payout

#### 2. Get My Claims
- **GET** `/my-claims` (Protected)
- **Returns:** All claims filed by the partner

#### 3. Approve Claim
- **POST** `/:claimId/approve`
- **Returns:** Updated claim with approved status and initiated payout

#### 4. Report Disruption
- **POST** `/report-disruption`
- **Body:**
  ```json
  {
    "disruptionType": "heavy_rain",
    "location": "Mumbai"
  }
  ```
- **Response:** Number of claims created automatically

---

### Payouts (/api/payouts)

#### 1. Get My Payouts
- **GET** `/my-payouts` (Protected)
- **Returns:** All payouts for the partner

#### 2. Get Payout Stats
- **GET** `/stats` (Protected)
- **Returns:** Total payouts, breakdown by status, recent payouts

#### 3. Get Total Payouts
- **GET** `/total` (Protected)
- **Returns:** Total amount of completed payouts

---

### Disruptions (/api/disruptions)

#### 1. Record Disruption
- **POST** `/record`
- **Body:**
  ```json
  {
    "disruptionType": "heavy_rain",
    "location": "Mumbai",
    "severity": 3
  }
  ```

#### 2. Get Active Disruptions
- **GET** `/active`
- **Returns:** All currently active disruptions

#### 3. Resolve Disruption
- **POST** `/:disruptionId/resolve`
- **Marks disruption as resolved**

---

## Cron Jobs

### 1. Payout Processing (Daily at 2 AM)
- Processes all pending payouts
- Updates status to 'completed'
- Generates bank references

### 2. Claim Processing (Every 6 hours)
- Auto-approves claims older than 24 hours
- Initiates payouts for approved claims

### 3. Disruption Monitoring (Hourly)
- Checks for active disruptions
- Auto-resolves disruptions older than 24 hours

### 4. Weekly Billing (Every Monday at 8 AM)
- Processes weekly premium payments
- Updates policy renewal status

---

## Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | Bad Request | Missing/invalid fields |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Internal server error |

---

## Example Workflow

### 1. Partner Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"9876543210","fullName":"John Doe","password":"pass123"}'
```

### 2. Create Insurance Policy
```bash
curl -X POST http://localhost:3000/api/policies/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"premiumWeekly":50}'
```

### 3. File a Claim During Disruption
```bash
curl -X POST http://localhost:3000/api/claims/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"policyId":"<policy-id>","disruptionType":"heavy_rain","location":"Mumbai"}'
```

### 4. Check Payouts
```bash
curl -X GET http://localhost:3000/api/payouts/my-payouts \
  -H "Authorization: Bearer <token>"
```

---

## Environment Variables Required

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=gigshield
REDIS_URL=redis://localhost:6379
PORT=3000
JWT_SECRET=your_secret_key
WEATHER_API_KEY=openweather_api_key
POLLUTION_API_KEY=aqi_api_key
```

---

## Database Schema Overview

### Tables:
- **partners** - User profiles with KYC info
- **policies** - Insurance plans with weekly premiums
- **claims** - Filed claims during disruptions
- **disruptions** - External disruptions (rain, heat, flood, etc.)
- **payouts** - Auto-calculated and processed payouts
- **payments** - Premium payment tracking

All tables have timestamps and proper indexing for performance.
