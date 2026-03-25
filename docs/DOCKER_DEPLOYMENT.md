# Docker Deployment Guide - Islamic Scholar RAG App

## 🚀 One-Command Deployment

This guide will help you deploy your RAG application using Docker on any VPS.

---

## Prerequisites

Your VPS needs:
- Docker installed
- Docker Compose installed
- At least 2GB RAM
- 10GB free disk space

---

## Step 1: Install Docker on VPS

**SSH into your VPS:**
```bash
ssh root@your-vps-ip
```

**Install Docker:**
```bash
# Update packages
sudo apt-get update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

---

## Step 2: Upload Your Code

**Option A: Using Git (Recommended)**
```bash
# On VPS
cd /opt
git clone your-repo-url rag-app
cd rag-app
```

**Option B: Using SCP**
```bash
# On your local machine
scp -r C:/Users/MD\ SAHIL\ HASNAIN/Desktop/Projects/rag root@your-vps-ip:/opt/
```

---

## Step 3: Configure Environment

```bash
cd /opt/rag-app

# Create .env file
nano .env
```

**Add your configuration:**
```env
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

**Save and exit** (Ctrl+X, Y, Enter)

---

## Step 4: Deploy with One Command! 🎉

```bash
docker compose up -d
```

That's it! Your app is now running.

---

## Step 5: Access Your App

**With Nginx (Port 80):**
```
http://your-vps-ip
```

**Direct Access (Port 3000):**
```
http://your-vps-ip:3000
```

---

## Managing Your App

### View Logs
```bash
# All logs
docker compose logs -f

# Just app logs
docker compose logs -f rag-app

# Last 100 lines
docker compose logs --tail=100 rag-app
```

### Check Status
```bash
docker compose ps
```

### Restart App
```bash
docker compose restart
```

### Stop App
```bash
docker compose down
```

### Update App
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build
```

### View Resource Usage
```bash
docker stats
```

---

## Data Persistence

Your data is stored in these folders (automatically created):
- `./data/vectorstore.json` - Vector embeddings
- `./data/jobs.db` - Background job tracking

**These persist even if you restart containers!**

---

## Troubleshooting

### Port Already in Use
```bash
# Check what's using port 80
sudo lsof -i :80

# Kill it
sudo kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead
```

### Container Won't Start
```bash
# View detailed logs
docker compose logs rag-app

# Rebuild from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Out of Memory
```bash
# Check memory usage
free -h

# Add swap space (if needed)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Remove Everything and Start Fresh
```bash
docker compose down -v
docker system prune -a
docker compose up -d --build
```

---

## Production Optimizations

### 1. Enable HTTPS (Recommended)

**Install Certbot:**
```bash
sudo apt-get install certbot
```

**Get SSL Certificate:**
```bash
sudo certbot certonly --standalone -d your-domain.com
```

**Update nginx.conf** to use SSL (certificates will be in `/etc/letsencrypt/`)

### 2. Auto-Restart on Server Reboot

Docker containers are already set to `restart: unless-stopped`, so they'll auto-start on reboot!

### 3. Backup Your Data

```bash
# Backup script
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# Restore
tar -xzf backup-20240325.tar.gz
```

### 4. Monitor Logs

```bash
# Install log rotation
sudo apt-get install logrotate

# Docker logs are automatically rotated
```

---

## Architecture

```
Internet
   ↓
Nginx (Port 80) ← Optional reverse proxy
   ↓
Next.js App (Port 3000)
   ↓
Data Volume (./data/)
   ├── vectorstore.json
   └── jobs.db
```

---

## Benefits of This Setup

✅ **One command deployment**: `docker compose up -d`
✅ **Isolated environment**: No conflicts with other apps
✅ **Easy updates**: Just `git pull && docker compose up -d --build`
✅ **Persistent data**: Survives container restarts
✅ **Auto-restart**: Comes back up after server reboot
✅ **Easy monitoring**: `docker compose logs -f`
✅ **Portable**: Works on any VPS with Docker

---

## Scaling (Future)

When you need more power:

```yaml
# In docker-compose.yml
services:
  rag-app:
    deploy:
      replicas: 3  # Run 3 instances
      resources:
        limits:
          cpus: '2'
          memory: 4G
```

---

## Cost Estimate

**VPS Requirements:**
- **Minimum**: 2GB RAM, 2 CPU cores (~$5-10/month)
- **Recommended**: 4GB RAM, 4 CPU cores (~$20/month)
- **For 5000-page books**: 8GB RAM recommended (~$40/month)

**Providers:**
- DigitalOcean: $12/month (2GB RAM)
- Hetzner: €4.5/month (2GB RAM) - Cheapest!
- Linode: $12/month (2GB RAM)
- Vultr: $12/month (2GB RAM)

---

## Next Steps

1. ✅ Deploy with `docker compose up -d`
2. ✅ Upload your 5000-page PDF
3. ✅ Close browser and let it process overnight
4. ✅ Come back and query your Islamic scholar AI!

Your app is now running 24/7 on the VPS! 🎉
