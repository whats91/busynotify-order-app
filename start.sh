#!/bin/bash

# =====================================================
# BUSY NOTIFY - Production Startup Script
# =====================================================
# This script loads environment variables from .env
# and starts the application using PM2
#
# Usage:
#   ./start.sh         - Start the application
#   ./start.sh build   - Build the application first
#   ./start.sh stop    - Stop the application
#   ./start.sh restart - Restart the application
#   ./start.sh logs    - View logs
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Path to .env file
ENV_FILE="$SCRIPT_DIR/.env"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to load and export environment variables from .env
load_env() {
    if [ -f "$ENV_FILE" ]; then
        print_info "Loading environment variables from .env..."
        
        # Export all variables from .env
        set -a
        while IFS= read -r line || [ -n "$line" ]; do
            # Skip empty lines and comments
            line=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
            if [ -z "$line" ] || [[ "$line" =~ ^# ]]; then
                continue
            fi
            
            # Parse KEY=VALUE
            if [[ "$line" =~ ^([^=]+)=(.*)$ ]]; then
                key="${BASH_REMATCH[1]}"
                value="${BASH_REMATCH[2]}"
                
                # Remove quotes from value
                value="${value%\"}"
                value="${value#\"}"
                value="${value%\'}"
                value="${value#\'}"
                
                export "$key=$value"
            fi
        done < "$ENV_FILE"
        set +a
        
        print_success "Environment variables loaded"
    else
        print_warning ".env file not found at $ENV_FILE"
        print_info "Creating default .env file..."
        
        cat > "$ENV_FILE" << 'EOF'
# =====================================================
# BUSY NOTIFY - Environment Configuration
# =====================================================

# Application Settings
APP_NAME=busy-notify
APP_PORT=3000
NODE_ENV=production

# Database Configuration
DATABASE_URL=file:/home/z/my-project/db/custom.db
EOF
        
        print_success "Default .env file created"
        load_env
    fi
}

# Function to display current configuration
show_config() {
    print_info "Current Configuration:"
    echo -e "  ${YELLOW}APP_NAME:${NC} ${APP_NAME:-busy-notify}"
    echo -e "  ${YELLOW}APP_PORT:${NC} ${APP_PORT:-3000}"
    echo -e "  ${YELLOW}NODE_ENV:${NC} ${NODE_ENV:-production}"
    echo ""
}

# Function to create logs directory
create_logs_dir() {
    LOGS_DIR="$SCRIPT_DIR/logs"
    if [ ! -d "$LOGS_DIR" ]; then
        mkdir -p "$LOGS_DIR"
        print_info "Created logs directory"
    fi
}

# Function to build the application
build_app() {
    print_info "Building application with npm..."
    
    # Load environment before build
    load_env
    
    # Build using npm
    npm run build
    
    print_success "Build completed"
}

# Function to start the application
start_app() {
    print_info "Starting application with PM2..."
    
    # Load environment variables
    load_env
    show_config
    
    # Create logs directory
    create_logs_dir
    
    # Check if already running
    if pm2 describe "${APP_NAME:-busy-notify}" > /dev/null 2>&1; then
        print_warning "Application is already running"
        print_info "Use './start.sh restart' to restart"
        exit 0
    fi
    
    # Start with PM2 using ecosystem config
    pm2 start ecosystem.config.js
    
    print_success "Application started"
    pm2 status
}

# Function to stop the application
stop_app() {
    print_info "Stopping application..."
    
    pm2 stop ecosystem.config.js 2>/dev/null || pm2 stop "${APP_NAME:-busy-notify}" 2>/dev/null || {
        print_warning "Application not running or already stopped"
    }
    
    print_success "Application stopped"
}

# Function to restart the application
restart_app() {
    print_info "Restarting application..."
    
    # Load environment variables
    load_env
    show_config
    
    # Create logs directory
    create_logs_dir
    
    pm2 restart ecosystem.config.js
    
    print_success "Application restarted"
    pm2 status
}

# Function to show logs
show_logs() {
    pm2 logs "${APP_NAME:-busy-notify}"
}

# Function to show status
show_status() {
    pm2 status
}

# Main script logic
case "${1:-start}" in
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app
        ;;
    build)
        build_app
        ;;
    build-start)
        build_app
        start_app
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    env)
        load_env
        show_config
        ;;
    *)
        echo ""
        echo "Busy Notify - Production Management Script"
        echo ""
        echo "Usage: $0 {start|stop|restart|build|build-start|logs|status|env}"
        echo ""
        echo "Commands:"
        echo "  start       - Start the application with PM2"
        echo "  stop        - Stop the application"
        echo "  restart     - Restart the application"
        echo "  build       - Build the application (npm run build)"
        echo "  build-start - Build and then start the application"
        echo "  logs        - View application logs"
        echo "  status      - Show PM2 status"
        echo "  env         - Load and display environment variables"
        echo ""
        exit 1
        ;;
esac
