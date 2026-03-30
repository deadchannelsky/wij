# Deployment Guide

Complete instructions for deploying WhereisJason to your Raspberry Pi 4 running Ubuntu 25.

## Prerequisites

Before starting, ensure you have:
- Raspberry Pi 4 with Ubuntu 25 installed
- SSH access to the Raspberry Pi
- A domain name (e.g., whereisjason.net) pointing to your Raspberry Pi's IP
- Google Calendar API credentials
- Git repository access

## Step 1: Prepare the Raspberry Pi

SSH into your Raspberry Pi and run these commands:

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (required)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version    # Should be v18.x or higher
npm --version
```

## Step 2: Clone the Repository

```bash
# Clone the repository to /opt/whereisjason
sudo git clone <your-git-repo-url> /opt/whereisjason

# Change into the directory
cd /opt/whereisjason

# Verify files are present
ls -la
```

## Step 3: Configure Environment Variables

```bash
# Copy the example environment file
sudo cp .env.example .env

# Edit the .env file with your settings
sudo nano .env
```

Update the following variables:
```
GOOGLE_CALENDAR_ID=your-calendar-id-here
GOOGLE_API_KEY=your-api-key-here
NODE_ENV=production
SERVER_PORT=5000
DATABASE_PATH=./server/data/app.db
CALENDAR_SYNC_INTERVAL=10
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

## Step 4: Build the Application

```bash
cd /opt/whereisjason

# Install dependencies
npm install

# Build the React frontend and compile TypeScript
npm run build

# Initialize the database
npm run db:migrate
```

This process may take a few minutes on the Raspberry Pi.

## Step 5: Run the Deployment Script

The deployment script sets up Nginx, SSL certificates, and systemd services:

```bash
# Make the script executable
sudo chmod +x deploy.sh

# Run the script with your domain and email
sudo ./deploy.sh whereisjason.net admin@whereisjason.net
```

Replace:
- `whereisjason.net` with your actual domain
- `admin@whereisjason.net` with a valid email for Let's Encrypt notifications

The script will:
- Check/install Nginx and Certbot
- Obtain a free SSL certificate from Let's Encrypt
- Configure Nginx to serve your site over HTTPS
- Create a systemd service for auto-start
- Enable automatic certificate renewal
- Validate all configurations
- Report status

**Example output:**
```
[2024-03-29 10:15:32] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2024-03-29 10:15:32] Checking Node.js Installation
[2024-03-29 10:15:32] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2024-03-29 10:15:32] ✓ Node.js installed: v18.19.0
...
[2024-03-29 10:15:45] ✓ Certificate valid for 90 days
...
[2024-03-29 10:15:50] Deployment configuration complete!
```

## Step 6: Start Services

```bash
# Start the WhereisJason application
sudo systemctl start whereisjason

# Start Nginx (if not already running)
sudo systemctl start nginx

# Check status
sudo systemctl status whereisjason
sudo systemctl status nginx
```

## Step 7: Verify It's Working

```bash
# Test HTTPS access
curl https://whereisjason.net/

# You should see HTML content from your React app
```

Open a browser and navigate to `https://whereisjason.net/`. You should see the WhereisJason dashboard.

## Automatic Startup on Reboot

Both services are configured to start automatically on boot:

```bash
# Verify auto-start is enabled
sudo systemctl is-enabled whereisjason.service  # Should show "enabled"
sudo systemctl is-enabled nginx                # Should show "enabled"
```

After rebooting the Raspberry Pi, the services will start automatically:
```bash
sudo reboot

# After reboot, verify services are running
sudo systemctl status whereisjason
sudo systemctl status nginx
```

## Post-Deployment Checks

After initial deployment, verify everything is working:

```bash
# 1. Check application logs
sudo journalctl -u whereisjason.service -n 20

# 2. Check Nginx is running
sudo systemctl status nginx

# 3. Check SSL certificate
sudo openssl x509 -in /etc/letsencrypt/live/whereisjason.net/fullchain.pem -noout -text

# 4. Test the API
curl https://whereisjason.net/api/config

# 5. Check certificate renewal timer
sudo systemctl status certbot.timer
```

## Updating the Application

When you push code changes from Windows, deploy them to the Raspberry Pi:

```bash
cd /opt/whereisjason

# Pull latest code
git pull origin main

# Install any new dependencies
npm install

# Rebuild the application
npm run build

# Restart the service
sudo systemctl restart whereisjason
```

The site should be updated within seconds. No need to restart Nginx unless you've changed the configuration.

## Running the Deployment Script Again

You can run the deployment script multiple times. On subsequent runs, it will validate:
- All required packages are installed
- SSL certificate is valid and not expiring soon
- Nginx configuration is correct
- Services are configured for auto-start
- Services are currently running

```bash
sudo ./deploy.sh whereisjason.net admin@whereisjason.net
```

## Troubleshooting

### Site not loading (HTTPS error)

1. **Check services are running:**
   ```bash
   sudo systemctl status whereisjason
   sudo systemctl status nginx
   ```

2. **Check logs:**
   ```bash
   # Application logs
   sudo journalctl -u whereisjason.service -n 50

   # Nginx logs
   sudo tail -50 /var/log/nginx/whereisjason_error.log
   ```

3. **Check SSL certificate:**
   ```bash
   sudo openssl x509 -in /etc/letsencrypt/live/whereisjason.net/fullchain.pem -noout -enddate
   ```

### Service won't start

1. **Check for errors:**
   ```bash
   sudo journalctl -u whereisjason.service -n 50
   ```

2. **Verify database exists:**
   ```bash
   ls -la /opt/whereisjason/server/data/app.db
   ```

3. **Verify .env file:**
   ```bash
   sudo cat /opt/whereisjason/.env
   ```

4. **Check permissions:**
   ```bash
   sudo chown -R root:root /opt/whereisjason
   ```

### SSL Certificate Issues

1. **Check certificate expiry:**
   ```bash
   sudo openssl x509 -in /etc/letsencrypt/live/whereisjason.net/fullchain.pem -noout -enddate
   ```

2. **Manually renew (if needed):**
   ```bash
   sudo certbot renew --force-renewal
   sudo systemctl restart nginx
   ```

### Cannot access domain

1. **Verify domain DNS is pointing to your Raspberry Pi's IP:**
   ```bash
   nslookup whereisjason.net
   ```

2. **Check port forwarding on your router:**
   - Port 80 (HTTP) → Raspberry Pi
   - Port 443 (HTTPS) → Raspberry Pi

3. **Test local access:**
   ```bash
   curl https://localhost/
   # Should work if your IP is correct but domain DNS isn't set up yet
   ```

## Service Management Commands

```bash
# Start/stop/restart services
sudo systemctl start whereisjason
sudo systemctl stop whereisjason
sudo systemctl restart whereisjason

# View service status
sudo systemctl status whereisjason

# View recent logs
sudo journalctl -u whereisjason.service -n 100

# Follow logs in real-time
sudo journalctl -u whereisjason.service -f

# Nginx commands
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl status nginx

# Test Nginx config
sudo nginx -t
```

## Backup and Recovery

### Backup your database

```bash
sudo cp /opt/whereisjason/server/data/app.db /opt/whereisjason/server/data/app.db.backup
```

### Backup your .env file

```bash
sudo cp /opt/whereisjason/.env /opt/whereisjason/.env.backup
```

### Restore from backup

```bash
sudo cp /opt/whereisjason/server/data/app.db.backup /opt/whereisjason/server/data/app.db
sudo systemctl restart whereisjason
```

## Getting Help

If you encounter issues:

1. Check the logs as described in Troubleshooting
2. Review the CLAUDE.md file for architecture details
3. Ensure all prerequisites are installed
4. Verify your domain DNS is pointing to the Raspberry Pi
5. Check port forwarding on your router (ports 80 and 443)
