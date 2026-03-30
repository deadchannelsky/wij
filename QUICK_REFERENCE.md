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
cd /opt/whereisjason
npm install
npm run build
npm run db:migrate
sudo chmod +x deploy.sh
sudo ./deploy.sh whereisjason.net admin@whereisjason.net

# Code updates
cd /opt/whereisjason
git pull origin main
npm install
npm run build
sudo systemctl restart whereisjason

# Validate deployment (after first deploy)
sudo ./deploy.sh whereisjason.net admin@whereisjason.net
```

## Service Management

```bash
# Check status
sudo systemctl status whereisjason
sudo systemctl status nginx

# Restart
sudo systemctl restart whereisjason
sudo systemctl restart nginx

# View logs
sudo journalctl -u whereisjason.service -f
sudo tail -f /var/log/nginx/whereisjason_error.log

# Start/stop
sudo systemctl start whereisjason
sudo systemctl stop whereisjason
```

## SSL/Certificate

```bash
# Check certificate expiry
sudo openssl x509 -in /etc/letsencrypt/live/whereisjason.net/fullchain.pem -noout -enddate

# Renew certificate
sudo certbot renew

# Check renewal timer
sudo systemctl status certbot.timer
```

## Troubleshooting

```bash
# Application won't start
sudo journalctl -u whereisjason.service -n 50

# Nginx issues
sudo nginx -t
sudo tail -50 /var/log/nginx/whereisjason_error.log

# Port already in use
lsof -i :5000
lsof -i :3000

# Test HTTPS
curl https://whereisjason.net/api/health
```

## File Locations

```
/opt/whereisjason/              # Application root
/opt/whereisjason/.env          # Environment variables
/opt/whereisjason/server/data/app.db  # Database
/opt/whereisjason/client/build/ # Built React app
/etc/nginx/sites-available/whereisjason  # Nginx config
/etc/letsencrypt/live/whereisjason.net/  # SSL certificates
/etc/systemd/system/whereisjason.service # Service definition
/var/log/nginx/whereisjason_*.log        # Nginx logs
```
