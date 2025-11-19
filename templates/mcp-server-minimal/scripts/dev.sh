#!/bin/bash

# Development runner script
# Provides convenient commands for development workflow

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored message
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists, create from example if not
check_env() {
    if [ ! -f .env ]; then
        print_warn ".env file not found"
        if [ -f .env.example ]; then
            print_info "Creating .env from .env.example"
            cp .env.example .env
            print_info "Please update .env with your configuration"
        else
            print_error ".env.example not found"
            exit 1
        fi
    fi
}

# Install dependencies
install() {
    print_info "Installing dependencies..."
    npm install
    print_info "Dependencies installed successfully"
}

# Run development server
dev() {
    check_env
    print_info "Starting development server..."
    npm run dev
}

# Build for production
build() {
    print_info "Building for production..."
    npm run build
    print_info "Build complete"
}

# Run tests
test() {
    print_info "Running tests..."
    npm test
}

# Run tests in watch mode
test_watch() {
    print_info "Running tests in watch mode..."
    npm run test:watch
}

# Run linter
lint() {
    print_info "Running linter..."
    npm run lint
}

# Format code
format() {
    print_info "Formatting code..."
    npm run format
}

# Docker build
docker_build() {
    print_info "Building Docker image..."
    npm run docker:build
    print_info "Docker image built successfully"
}

# Docker up
docker_up() {
    check_env
    print_info "Starting Docker containers..."
    npm run docker:up
    print_info "Containers started. View logs with: npm run docker:logs"
}

# Docker down
docker_down() {
    print_info "Stopping Docker containers..."
    npm run docker:down
    print_info "Containers stopped"
}

# Show help
show_help() {
    cat << EOF
MCP Server Development Script

Usage: ./scripts/dev.sh [command]

Commands:
  install       Install dependencies
  dev           Start development server
  build         Build for production
  test          Run tests
  test:watch    Run tests in watch mode
  lint          Run linter
  format        Format code
  docker:build  Build Docker image
  docker:up     Start Docker containers
  docker:down   Stop Docker containers
  help          Show this help message

Examples:
  ./scripts/dev.sh install
  ./scripts/dev.sh dev
  ./scripts/dev.sh test

EOF
}

# Main command handler
main() {
    case "${1:-help}" in
        install)
            install
            ;;
        dev)
            dev
            ;;
        build)
            build
            ;;
        test)
            test
            ;;
        test:watch)
            test_watch
            ;;
        lint)
            lint
            ;;
        format)
            format
            ;;
        docker:build)
            docker_build
            ;;
        docker:up)
            docker_up
            ;;
        docker:down)
            docker_down
            ;;
        help)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
