# Inksesh Studio Admin

A clean, simple admin dashboard for managing tattoo studio assets, artists, and profile information.

## Quick Start

To try the app, use the phone number **`+919876543210`** to login with the OTP `123456` (in development). Once logged in, you can:
- Edit your studio profile (name, location, specialties)
- Add and manage artists with their styles
- Upload images and videos that are automatically optimized with WebP variants and poster frames
- View your asset gallery with status badges showing optimization progress

## Stack

- **Backend**: Express + TypeScript + Prisma + PostgreSQL + pg-boss + AWS S3
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS

## Project Structure

```
inksesh/
├── backend/           # Express API server
│   ├── src/
│   │   ├── modules/   # Feature modules (auth, studio, artists, assets)
│   │   ├── middleware/
│   │   ├── queue/     # pg-boss job queue
│   │   └── worker.ts  # Asset optimization worker
│   └── prisma/        # Database schema & migrations
└── frontend/          # Next.js app
    └── app/           # App router pages
```

## Setup

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database
- AWS S3 bucket (for asset storage)

### Environment Variables

#### Backend Variables (Root `.env`)

Copy `.env.example` to `.env` and update with your values:

```env
# Backend
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:3000,https://your-frontend.vercel.app

# AWS S3
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
ASSET_URL_TTL_SECONDS=1800
```

#### Frontend Variables (`/frontend/.env.local`)

Create `/frontend/.env.local` for local development:

```env
# For local development with local backend
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# For local development with deployed backend
# NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

**Note**: `.env.local` is gitignored. For production deployment (Vercel), set `NEXT_PUBLIC_API_URL` as an environment variable in the Vercel dashboard.

### Installation

From the root directory:

```bash
# Install all dependencies
pnpm install

# Setup Prisma
cd backend
pnpm prisma generate
pnpm prisma migrate deploy

# Or for development:
pnpm prisma migrate dev
```

### Running the App

#### Development

```bash
# Terminal 1 - API Server
cd backend
pnpm dev:api

# Terminal 2 - Worker (for asset processing)
cd backend
pnpm dev:worker

# Terminal 3 - Frontend
cd frontend
pnpm dev
```

#### Production

```bash
# Build backend
cd backend
pnpm build

# Run API and Worker
pnpm start:api    # Terminal 1
pnpm start:worker # Terminal 2

# Build and run frontend
cd frontend
pnpm build
pnpm start
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - Request OTP (sends mock OTP in dev)
- `POST /api/auth/verify` - Verify OTP and get JWT token
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout (protected)

### Studio

- `GET /api/studio` - Get or create studio profile (protected)
- `PUT /api/studio` - Update studio profile (protected)

### Artists

- `GET /api/artists` - List all artists (protected)
- `POST /api/artists` - Create artist (protected)
- `GET /api/artists/:id` - Get artist by ID (protected)

### Assets

- `POST /api/assets/init-upload` - Initialize asset upload, get presigned S3 URL (protected)
- `POST /api/assets/complete-upload` - Mark upload complete, trigger optimization (protected)
- `GET /api/assets` - List all assets with signed URLs (protected)
- `DELETE /api/assets/:id` - Delete asset and S3 objects (protected)

## Features

### Authentication

- Phone-based OTP login (Indian format: +91XXXXXXXXXX)
- Mock OTP: `123456` (for development)
- JWT authentication with configurable expiration

### Studio Management

- Single studio profile per admin
- Update name, area, and specialties

### Artist Management

- Create and list artists
- Track artist styles and details

### Asset Management

- Upload images and videos to S3
- Automatic optimization:
  - **Images**: Generate WebP variants (thumb, card, full)
  - **Videos**: Generate poster frame thumbnails
- Background processing via pg-boss queue
- Presigned URLs for secure access
- S3 cleanup on deletion (resilient to partial failures)

## Frontend Features

- Clean, minimal design
- Phone + OTP login flow
- Real-time data from backend API
- Dashboard showing:
  - Studio profile
  - Artists list
  - Assets list with status
- Logout functionality
- Mobile-responsive layout

## Development Notes

### Mock OTP

In development, the OTP `123456` is accepted and displayed in an alert.  
For production, integrate a real SMS provider (Twilio, AWS SNS, etc.).

### Asset Optimization

The worker process automatically:
1. Downloads original assets from S3
2. Generates optimized variants
3. Uploads variants back to S3
4. Updates database with variant metadata

### Error Handling

- All endpoints use centralized error middleware
- Zod validation for request schemas
- AsyncHandler wrapper for Express routes
- Detailed logging in development mode

## Testing Authentication

Using curl:

```bash
# 1. Request OTP
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210"}'

# 2. Verify OTP (use "123456")
curl -X POST http://localhost:4000/api/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919876543210","otp":"123456"}'

# 3. Access protected route
curl -X GET http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer <your-token>"

# 4. Logout
curl -X POST http://localhost:4000/api/auth/logout \
  -H "Authorization: Bearer <your-token>"
```

## License

Private - All Rights Reserved
