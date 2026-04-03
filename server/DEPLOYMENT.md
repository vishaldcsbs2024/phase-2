# GigShield Backend - Deployment Guide

## Production Deployment Options

### Option 1: AWS (Recommended)

#### Services Required
- **Compute**: EC2 or Elastic Beanstalk
- **Database**: RDS for PostgreSQL
- **Cache**: ElastiCache for Redis
- **Storage**: S3 for documents (future)
- **CDN**: CloudFront for API distribution

#### Setup Steps

1. **Create RDS PostgreSQL Instance**
```bash
# Via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier gigshield-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --allocated-storage 20
```

2. **Create ElastiCache Redis Instance**
```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id gigshield-cache \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

3. **Create EC2 Instance**
```bash
# Launch Ubuntu 22.04 LTS instance
# Security groups: Allow 3000 (HTTP), 443 (HTTPS)
```

4. **Deploy Application**
```bash
# SSH into EC2
ssh -i key.pem ubuntu@instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install git
sudo apt-get install -y git

# Clone repository
git clone <your-repo-url>
cd server

# Install dependencies
npm install

# Set environment variables
nano .env
# Update with RDS and ElastiCache endpoints

# Build for production
npm run build

# Start with PM2
npm install -g pm2
pm2 start dist/index.js --name "gigshield"
pm2 save
```

5. **Setup NGINX Reverse Proxy**
```bash
sudo apt-get install -y nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/gigshield
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/gigshield /etc/nginx/sites-enabled/
sudo systemctl start nginx
```

#### Environment Variables for AWS
```env
# RDS PostgreSQL
DB_HOST=gigshield-db.xxxxx.rds.amazonaws.com
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=strong_password
DB_NAME=gigshield

# ElastiCache Redis
REDIS_URL=redis://gigshield-cache.xxxxx.ng.0001.usw2.cache.amazonaws.com:6379

# Application
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=generate_strong_secret

# API Keys
WEATHER_API_KEY=openweather_key
POLLUTION_API_KEY=waqi_key
```

---

### Option 2: Heroku (Quickest)

#### Setup Steps

1. **Install Heroku CLI**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Create Heroku Account and App**
```bash
heroku login
heroku create gigshield-backend
```

3. **Add PostgreSQL Addon**
```bash
heroku addons:create heroku-postgresql:hobby-dev
```

4. **Add Redis Addon**
```bash
heroku addons:create heroku-redis:premium-0
```

5. **Set Environment Variables**
```bash
heroku config:set \
  JWT_SECRET=your_secret \
  WEATHER_API_KEY=your_key \
  POLLUTION_API_KEY=your_key \
  NODE_ENV=production
```

6. **Deploy**
```bash
git push heroku main
```

---

### Option 3: DigitalOcean Droplet

#### Setup Steps

1. **Create Droplet**
   - Select Ubuntu 22.04 LTS
   - 2GB RAM minimum
   - $12/month basic plan

2. **Install Dependencies**
```bash
ssh root@droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib

# Install Redis
apt-get install -y redis-server

# Install Nginx
apt-get install -y nginx
```

3. **Setup PostgreSQL**
```bash
sudo -u postgres createdb gigshield
```

4. **Deploy Application**
```bash
git clone <your-repo>
cd server
npm install
npm run build

# Copy .env with production settings
cp .env.example .env
nano .env
```

5. **Setup PM2**
```bash
npm install -g pm2
pm2 start dist/index.js --name gigshield
pm2 startup
pm2 save
```

---

### Option 4: Docker + Any Cloud

#### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DB_HOST=postgres
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: gigshield
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Deploy to Docker Hub
```bash
docker build -t your-registry/gigshield-backend:latest .
docker push your-registry/gigshield-backend:latest
```

---

## Production Checklist

### Pre-Deployment
- [ ] Database backup strategy configured
- [ ] Redis persistence enabled
- [ ] JWT_SECRET set to strong value
- [ ] NODE_ENV=production
- [ ] All API keys configured
- [ ] HTTPS/SSL certificates obtained
- [ ] CORS whitelist configured
- [ ] Rate limiting configured
- [ ] Logging configured
- [ ] Monitoring alerts set up

### Infrastructure
- [ ] Load balancer configured
- [ ] Auto-scaling groups created
- [ ] Database replicas configured
- [ ] Redis backups enabled
- [ ] WAF rules configured
- [ ] DDoS protection enabled

### Security
- [ ] Security headers enabled (via helmet)
- [ ] API authentication tested
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection configured
- [ ] Input validation tested
- [ ] Secrets manager integrated

### Monitoring
- [ ] Error tracking (Sentry/LogRocket)
- [ ] Performance monitoring (New Relic/DataDog)
- [ ] Log aggregation (CloudWatch/ELK)
- [ ] Uptime monitoring
- [ ] Database monitoring
- [ ] API latency monitoring

### Backup & Recovery
- [ ] Daily database backups
- [ ] Backup retention policy
- [ ] Disaster recovery plan
- [ ] Recovery time objective (RTO) defined
- [ ] Recovery point objective (RPO) defined

---

## Scaling Strategy

### Horizontal Scaling
```
Load Balancer
    ↓
┌───┴───┬───────┐
│       │       │
Node-1  Node-2  Node-3  (Stateless)
│       │       │
└───┴───┴───────┘
    ↓
PostgreSQL (Read Replicas)
Redis (Cluster)
```

### Caching Strategy
- Database query results → Redis
- Session data → Redis
- Static assets → CDN

### Database Optimization
- Query optimization
- Index tuning
- Connection pooling
- Read replicas for reporting

---

## Monitoring & Alerting

### Key Metrics to Monitor
```
1. Response Time (p50, p95, p99)
2. Error Rate (4xx, 5xx)
3. Database Connections
4. Redis Memory Usage
5. CPU & Memory Utilization
6. Request Volume
7. Payout Processing Time
8. Claim Processing Lag
```

### Alert Thresholds
```
- Response time > 1000ms → Warning
- Error rate > 1% → Critical
- DB connections > 80% → Warning
- Redis memory > 90% → Critical
- CPU > 80% → Alert
- Disk space < 20% → Warning
```

---

## Disaster Recovery

### Backup Strategy
```bash
# Daily database backup
0 2 * * * pg_dump gigshield > /backups/gigshield-$(date +\%Y\%m\%d).sql

# S3 backup
aws s3 cp /backups/gigshield-*.sql s3://gigshield-backups/
```

### Recovery Procedure
```bash
# In case of data loss
psql gigshield < /backups/gigshield-latest.sql

# Verify recovery
psql gigshield -c "SELECT COUNT(*) FROM partners;"
```

---

## Cost Estimation

### AWS (Small Deployment)
```
EC2 t3.small          : $20/month
RDS db.t3.micro       : $15/month
ElastiCache t3.micro  : $15/month
S3 (minimal)          : $1/month
Data Transfer         : ~$5/month
─────────────────────
Total                 : ~$56/month
```

### DigitalOcean (Better Value)
```
App Platform (2GB)    : $12/month
Managed DB            : $15/month
Managed Redis         : $15/month
─────────────────────
Total                 : ~$42/month
```

### Heroku (Easiest)
```
Dyno Standard-1X      : $25/month
Postgres Standard     : $50/month
Redis Premium-0       : $30/month
─────────────────────
Total                 : ~$105/month
```

---

## Maintenance & Updates

### Regular Tasks
- Daily: Monitor logs & errors
- Weekly: Review performance metrics
- Monthly: Security updates
- Quarterly: Database optimization
- Yearly: Capacity planning

### Rollback Procedure
```bash
# Keep previous versions in deployment
git tag deployment-v1
git checkout deployment-v1
npm run build
pm2 restart gigshield
```

---

## Support & Troubleshooting

### Common Issues in Production

**Database Connection Timeout**
```bash
# Increase pool size
pg.Pool({ max: 20 })

# Check RDS security groups
```

**Redis Connection Error**
```bash
# Verify ElastiCache security group
# Test redis-cli connection
redis-cli -h endpoint ping
```

**High Memory Usage**
```bash
# Check for memory leaks
node --inspect dist/index.js

# Review logs
pm2 logs gigshield
```

---

## Conclusion

Choose deployment option based on:
- **Heroku**: Quickest, easiest to manage, costs more
- **DigitalOcean**: Best value, manual management
- **AWS**: Most scalable, complex setup
- **Docker**: Maximum flexibility, self-managed infrastructure

Start with **DigitalOcean** or **Heroku** for MVP, scale to **AWS** as traffic grows.

---

For more information, refer to:
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Heroku Documentation](https://devcenter.heroku.com/)
- [DigitalOcean Documentation](https://docs.digitalocean.com/)
- [Node.js Deployment Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
