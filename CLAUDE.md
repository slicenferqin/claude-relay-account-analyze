# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Redis account dashboard application built with Vue 3, Node.js, and TypeScript. It's a monorepo containing frontend, backend, and shared packages for monitoring API key usage and account statistics from Redis data.

## Build and Development Commands

### Root Level Commands
- **Development**: `npm run dev` - Starts both frontend and backend in development mode
- **Build**: `npm run build` - Builds both frontend and backend for production
- **Clean**: `npm run clean` - Removes all node_modules and dist directories
- **Install**: `npm install` - Installs dependencies for all packages

### Backend Commands (packages/backend/)
- **Development**: `npm run dev` - Starts backend server with hot reload
- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Start**: `npm run start` - Runs built production server
- **Test**: `npm run test` - Runs backend tests
- **Lint**: `npm run lint` - Runs ESLint

### Frontend Commands (packages/frontend/)
- **Development**: `npm run dev` - Starts Vite dev server
- **Build**: `npm run build` - Builds for production
- **Preview**: `npm run preview` - Preview production build locally

## Project Structure

```
account-dashboard/
├── packages/
│   ├── frontend/          # Vue 3 + TypeScript frontend
│   │   ├── src/
│   │   │   ├── components/    # Vue components
│   │   │   ├── views/         # Page views
│   │   │   ├── stores/        # Pinia stores
│   │   │   ├── utils/         # Utility functions
│   │   │   └── router/        # Vue router config
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── backend/           # Node.js + Express backend
│   │   ├── src/
│   │   │   ├── controllers/   # API controllers
│   │   │   ├── services/      # Business logic
│   │   │   ├── routes/        # Express routes
│   │   │   ├── config/        # Configuration files
│   │   │   └── utils/         # Utility functions
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared/            # Shared TypeScript types
│       ├── src/types/         # Type definitions
│       ├── tsconfig.json
│       └── package.json
│
├── docker/                # Docker configurations
├── scripts/               # Deployment scripts
├── docs/                  # Documentation
└── package.json          # Root package.json (workspace)
```

## Technology Stack

### Frontend
- Vue 3 with Composition API
- TypeScript for type safety
- Element Plus UI components
- ECharts for data visualization
- Pinia for state management
- Socket.io-client for real-time updates
- Vite as build tool

### Backend
- Node.js with Express framework
- TypeScript throughout
- Socket.io for WebSocket communication
- ioredis for Redis connectivity
- Winston for logging
- Express middleware for security

### Infrastructure
- Redis as primary data store
- Docker for containerization
- Nginx for reverse proxy (production)

## Development Environment Setup

1. **Prerequisites**: Node.js 18+, Redis 6+
2. **Install dependencies**: `npm install` (installs all workspace packages)
3. **Configure backend**: Copy `packages/backend/.env.example` to `.env` and configure Redis connection
4. **Start development**: `npm run dev` (starts both frontend and backend)
5. **Access**: Frontend at http://localhost:5173, Backend at http://localhost:3002

## Key Features

- **API Key Management**: Monitor usage statistics, RPM, costs, and group associations
- **Account Statistics**: Track token usage, expenses, and group activity
- **Real-time Updates**: WebSocket-powered live data updates
- **Data Visualization**: Interactive charts and graphs using ECharts
- **Group Management**: Organize accounts into groups with member statistics

## Redis Data Integration

The application connects to Redis to read:
- API key information (`apikey:*` keys)
- Account data (`claude_console_account:*`, etc.)
- Usage statistics (`usage:*`, `account_usage:*` patterns)
- System metrics (`system:metrics:*`)
- Group management (`account_group:*`, `account_groups`)

## Architecture Patterns

- **Monorepo**: Uses npm workspaces for code sharing
- **Type Safety**: Shared TypeScript types across frontend/backend
- **Real-time**: WebSocket connections for live updates
- **Modular**: Service-oriented backend architecture
- **Responsive**: Element Plus components with custom styling

## Common Development Tasks

- **Adding new API endpoints**: Create controller in `packages/backend/src/controllers/`
- **Adding new views**: Create Vue component in `packages/frontend/src/views/`
- **Modifying data types**: Update `packages/shared/src/types/`
- **Adding charts**: Use ECharts integration in frontend views
- **Testing API**: Use health check endpoint `/health`

## Production Deployment

- Uses Docker containers with nginx reverse proxy
- Environment-specific configuration files
- Automated deployment scripts in `scripts/` directory
- Comprehensive deployment guide in `docs/deployment-guide.md`

## Performance Considerations

- Redis connection pooling and error handling
- Frontend component lazy loading
- WebSocket connection management
- Efficient data caching strategies
- Optimized build outputs