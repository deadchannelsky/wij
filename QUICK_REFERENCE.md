# Quick Reference

Common commands for development and deployment.

## Development (Windows)

```bash
# Install dependencies
npm install

# Start dev servers (React on :3000, Express on :5000)
npm run dev

# Build for production
npm run build

# Run production build locally
npm start

# Code quality
npm run lint
npm run type-check

# Database
npm run db:migrate
npm run db:reset
```

## Deployment (Raspberry Pi)

```bash
# Initial deployment
cd /opt/wheresjason
npm install
npm run build
npm run db:migrate
sudo chmod +x deploy.sh
sudo ./deploy.sh wheresjason.net admin@wheresjason.net

# Code updates
cd /opt/wheresjason
git pull origin main
npm install
npm run build
sudo systemctl restart wheresjason

# Validate deployment (after first deploy)
sudo ./deploy.sh wheresjason.net admin@wheresjason.net
```

## Service Management

```bash
# Check status
sudo systemctl status wheresjason
sudo systemctl status nginx

# Restart
sudo systemctl restart wheresjason
sudo systemctl restart nginx

# View logs
sudo journalctl -u wheresjason.service -f
sudo tail -f /var/log/nginx/wheresjason_error.log

# Start/stop
sudo systemctl start wheresjason
sudo systemctl stop wheresjason
```

## SSL/Certificate

```bash
# Check certificate expiry
sudo openssl x509 -in /etc/letsencrypt/live/wheresjason.net/fullchain.pem -noout -enddate

# Renew certificate
sudo certbot renew

# Check renewal timer
sudo systemctl status certbot.timer
```

## Troubleshooting

```bash
# Application won't start
sudo journalctl -u wheresjason.service -n 50

# Nginx issues
sudo nginx -t
sudo tail -50 /var/log/nginx/wheresjason_error.log

# Port already in use
lsof -i :5000
lsof -i :3000

# Test HTTPS
curl https://wheresjason.net/api/health
```

## File Locations

```
/opt/wheresjason/              # Application root
/opt/wheresjason/.env          # Environment variables
/opt/wheresjason/server/data/app.db  # Database
/opt/wheresjason/client/build/ # Built React app
/etc/nginx/sites-available/wheresjason  # Nginx config
/etc/letsencrypt/live/wheresjason.net/  # SSL certificates
/etc/systemd/system/wheresjason.service # Service definition
/var/log/nginx/wheresjason_*.log        # Nginx logs
```
