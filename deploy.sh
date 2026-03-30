#!/bin/bash

# WhereisJason Deployment Script
# Runs on Raspberry Pi with Ubuntu 25
# First run: Sets up everything
# Subsequent runs: Validates configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="${1:-whereisjason.net}"
EMAIL="${2:-admin@whereisjason.net}"

# Auto-detect APP_DIR from current location (script directory)
# This allows running from any folder location
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validate we're in the right directory (has package.json, client, server folders)
if [ ! -f "${APP_DIR}/package.json" ] || [ ! -d "${APP_DIR}/client" ] || [ ! -d "${APP_DIR}/server" ]; then
    echo -e "${RED}ERROR: This script must be run from the WhereisJason project root directory${NC}"
    echo "Current directory: ${APP_DIR}"
    echo "Required files/folders not found: package.json, client/, server/"
    exit 1
fi

NGINX_CONF="/etc/nginx/sites-available/whereisjason"
NGINX_ENABLED="/etc/nginx/sites-enabled/whereisjason"
CERT_PATH="/etc/letsencrypt/live/${DOMAIN}"
SERVICE_FILE="/etc/systemd/system/whereisjason.service"
LOG_FILE="${APP_DIR}/deploy.log"

# Create log directory if it doesn't exist
mkdir -p "$(dirname "${LOG_FILE}")" 2>/dev/null || true

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✓ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}✗ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}" | tee -a "$LOG_FILE"
}

section() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}$1${NC}" | tee -a "$LOG_FILE"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}" | tee -a "$LOG_FILE"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
        echo "Usage: sudo ./deploy.sh [domain] [email]"
        echo "Example: sudo ./deploy.sh whereisjason.net admin@example.com"
        exit 1
    fi
}

check_node() {
    section "Checking Node.js Installation"

    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        success "Node.js installed: $NODE_VERSION"
    else
        error "Node.js not found. Install Node.js 18+ first:"
        echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
        echo "  sudo apt install -y nodejs"
        exit 1
    fi
}

check_nginx() {
    section "Checking Nginx Installation"

    if command -v nginx &> /dev/null; then
        success "Nginx installed"
    else
        log "Installing Nginx..."
        apt-get update
        apt-get install -y nginx
        success "Nginx installed"
    fi
}

check_certbot() {
    section "Checking Certbot Installation"

    if command -v certbot &> /dev/null; then
        success "Certbot installed"
    else
        log "Installing Certbot..."
        apt-get install -y certbot python3-certbot-nginx
        success "Certbot installed"
    fi
}

setup_letsencrypt() {
    section "Setting Up Let's Encrypt Certificate"

    if [ -f "${CERT_PATH}/fullchain.pem" ]; then
        warning "Certificate already exists at ${CERT_PATH}"
        validate_cert
    else
        log "Obtaining Let's Encrypt certificate for $DOMAIN..."

        if certbot certonly --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --keep; then
            success "Let's Encrypt certificate obtained successfully"
        else
            error "Failed to obtain Let's Encrypt certificate"
            exit 1
        fi
    fi
}

validate_cert() {
    section "Validating SSL Certificate"

    if [ -f "${CERT_PATH}/fullchain.pem" ]; then
        # Check expiry date
        EXPIRY=$(openssl x509 -enddate -noout -in "${CERT_PATH}/fullchain.pem" | cut -d= -f 2)
        EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
        NOW_EPOCH=$(date +%s)
        DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

        if [ $DAYS_LEFT -lt 0 ]; then
            error "Certificate has expired! ($EXPIRY)"
            exit 1
        elif [ $DAYS_LEFT -lt 30 ]; then
            warning "Certificate expires in $DAYS_LEFT days ($EXPIRY)"
        else
            success "Certificate valid for $DAYS_LEFT days (expires: $EXPIRY)"
        fi
    else
        error "Certificate file not found at ${CERT_PATH}/fullchain.pem"
        exit 1
    fi
}

setup_nginx_config() {
    section "Setting Up Nginx Configuration"

    if [ -f "$NGINX_CONF" ]; then
        warning "Nginx config already exists, validating..."
    else
        log "Creating Nginx configuration..."

        cat > "$NGINX_CONF" << 'EOF'
upstream whereisjason_backend {
    server 127.0.0.1:5000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_NAME;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_NAME;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/DOMAIN_NAME/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN_NAME/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/whereisjason_access.log;
    error_log /var/log/nginx/whereisjason_error.log;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Root location - serve React build
    location / {
        root APP_DIR_PATH/client/build;
        try_files $uri $uri/ /index.html;

        # Cache busting for static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API endpoints - proxy to Express backend
    location /api/ {
        proxy_pass http://whereisjason_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

        # Replace domain name and app directory in the config
        sed -i "s/DOMAIN_NAME/$DOMAIN/g" "$NGINX_CONF"
        # Use # as delimiter to handle paths with slashes
        sed -i "s#APP_DIR_PATH#$APP_DIR#g" "$NGINX_CONF"
        success "Nginx configuration created"
    fi

    # Validate Nginx config syntax
    log "Validating Nginx configuration..."
    if nginx -t 2>&1 | grep -q "successful"; then
        success "Nginx configuration is valid"
    else
        error "Nginx configuration has syntax errors:"
        nginx -t
        exit 1
    fi
}

enable_nginx_site() {
    section "Enabling Nginx Site"

    if [ -L "$NGINX_ENABLED" ]; then
        success "Site already enabled"
    else
        log "Enabling site..."
        ln -s "$NGINX_CONF" "$NGINX_ENABLED"

        # Remove default site if it exists
        rm -f /etc/nginx/sites-enabled/default

        success "Site enabled"
    fi
}

setup_systemd_service() {
    section "Setting Up Systemd Service"

    if [ -f "$SERVICE_FILE" ]; then
        warning "Service file already exists, validating..."
    else
        log "Creating systemd service file..."

        cat > "$SERVICE_FILE" << 'EOF'
[Unit]
Description=WhereisJason Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=APP_DIR
Environment="NODE_ENV=production"
EnvironmentFile=APP_DIR/.env
ExecStart=/usr/bin/node APP_DIR/server/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

        # Replace app directory
        sed -i "s|APP_DIR|$APP_DIR|g" "$SERVICE_FILE"
        success "Systemd service file created"
    fi

    # Enable service to start on boot
    log "Enabling service to start on boot..."
    systemctl daemon-reload
    systemctl enable whereisjason.service
    success "Service enabled for auto-start on boot"
}

check_app_files() {
    section "Checking Application Files"

    if [ ! -d "$APP_DIR" ]; then
        error "Application directory not found at $APP_DIR"
        error "Make sure to clone the repo to $APP_DIR"
        exit 1
    fi

    success "Application directory found at $APP_DIR"

    # Check key files
    local files_to_check=(
        ".env"
        "server/dist/index.js"
        "client/build/index.html"
    )

    for file in "${files_to_check[@]}"; do
        if [ -f "${APP_DIR}/${file}" ]; then
            success "Found: $file"
        else
            warning "Missing: $file (may not be built yet)"
        fi
    done
}

check_service_status() {
    section "Checking Service Status"

    if systemctl is-active --quiet whereisjason.service; then
        success "WhereisJason service is running"
        systemctl status whereisjason.service --no-pager
    else
        warning "WhereisJason service is not running"
        log "To start the service, run: systemctl start whereisjason.service"
    fi

    if systemctl is-active --quiet nginx; then
        success "Nginx is running"
    else
        warning "Nginx is not running"
        log "To start Nginx, run: systemctl start nginx"
    fi
}

enable_certbot_renewal() {
    section "Setting Up Automatic Certificate Renewal"

    log "Enabling Certbot auto-renewal timer..."
    systemctl enable certbot.timer
    systemctl start certbot.timer

    if systemctl is-active --quiet certbot.timer; then
        success "Certbot renewal timer is active"
    else
        success "Certbot renewal timer enabled"
    fi
}

print_summary() {
    section "Deployment Summary"

    echo -e "${GREEN}Configuration:${NC}" | tee -a "$LOG_FILE"
    echo "  Domain: $DOMAIN" | tee -a "$LOG_FILE"
    echo "  App Directory: $APP_DIR" | tee -a "$LOG_FILE"
    echo "  Certificate Path: ${CERT_PATH}" | tee -a "$LOG_FILE"
    echo "  Config File: $LOG_FILE" | tee -a "$LOG_FILE"

    echo -e "\n${GREEN}Services:${NC}" | tee -a "$LOG_FILE"
    if systemctl is-active --quiet whereisjason.service; then
        echo -e "  WhereisJason: ${GREEN}Running${NC}" | tee -a "$LOG_FILE"
    else
        echo -e "  WhereisJason: ${YELLOW}Stopped${NC}" | tee -a "$LOG_FILE"
    fi

    if systemctl is-active --quiet nginx; then
        echo -e "  Nginx: ${GREEN}Running${NC}" | tee -a "$LOG_FILE"
    else
        echo -e "  Nginx: ${YELLOW}Stopped${NC}" | tee -a "$LOG_FILE"
    fi

    echo -e "\n${GREEN}Next Steps:${NC}" | tee -a "$LOG_FILE"
    echo "  1. Verify HTTPS is working: curl https://$DOMAIN/" | tee -a "$LOG_FILE"
    echo "  2. Check logs: tail -f /var/log/nginx/whereisjason_access.log" | tee -a "$LOG_FILE"
    echo "  3. View app logs: journalctl -u whereisjason.service -f" | tee -a "$LOG_FILE"
    echo "  4. Restart services: systemctl restart whereisjason nginx" | tee -a "$LOG_FILE"

    echo -e "\n${GREEN}Log file saved to: $LOG_FILE${NC}" | tee -a "$LOG_FILE"
}

main() {
    check_root

    section "WhereisJason Deployment Script"
    log "Starting deployment..."
    log "Detected app directory: $APP_DIR"
    log "Domain: $DOMAIN"
    log "Email: $EMAIL"

    check_node
    check_nginx
    check_certbot
    setup_letsencrypt
    validate_cert
    setup_nginx_config
    enable_nginx_site
    setup_systemd_service
    enable_certbot_renewal
    check_app_files
    check_service_status
    print_summary

    success "Deployment configuration complete!"
}

# Run main function
main
