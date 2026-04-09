# Vitae - Web UI

This is the React-based web application for Vitae. It has been converted from a Tauri desktop application to a standalone web application.

## Architecture

The application is a React SPA (Single Page Application) that communicates with a backend API server via HTTP/REST.

### Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API calls
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Build tool and dev server

## Setup

### Prerequisites

- Node.js v20.x or higher
- npm v10.x or higher

### Installation

```bash
# Install dependencies
npm install
```

### Environment Configuration

Create environment files for your deployment:

1. For development, copy `.env.example` to `.env.development`:
   ```bash
   cp .env.example .env.development
   ```

2. Update the API URL in `.env.development`:
   ```
   VITE_API_URL=http://localhost:3001
   ```

3. For production, create `.env.production`:
   ```
   VITE_API_URL=https://your-production-domain.com
   ```

## Development

```bash
# Run development server (with hot reload)
npm run dev

# The app will be available at http://localhost:5173
```

The dev server includes a proxy configuration that forwards `/api/*` requests to `http://localhost:3001` (configurable in `vite.config.ts`).

## Building for Production

```bash
# Build the application
npm run build

# Preview production build locally
npm run preview
```

The built files will be in the `dist/` directory, ready to be deployed to any static hosting service or served by your backend.

## API Integration

The application expects a backend API server running at the URL specified in the environment variables. The API should implement the following endpoints:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### File Management
- `POST /api/files/ingest` - Upload files (multipart/form-data)
- `GET /api/files/aggregated-text` - Get extracted text from files

### AI Processing
- `POST /api/ai/process` - Process documents with AI

### Website Generation
- `POST /api/website/generate` - Generate website from portfolio data

### Settings
- `POST /api/settings/api-key` - Save API key
- `GET /api/settings/api-key/:provider` - Get API key
- `DELETE /api/settings/api-key/:provider` - Delete API key
- `POST /api/settings/test-connection` - Test API connection
- `POST /api/settings/local-endpoint` - Save local AI endpoint
- `GET /api/settings/local-endpoint` - Get local AI endpoint

### Themes
- `GET /api/themes` - Get available themes

## Authentication

The application uses JWT-based authentication:

- Tokens are stored in `localStorage` as `authToken`
- All API requests include the token in the `Authorization` header
- Protected routes redirect to `/login` if user is not authenticated
- 401 responses automatically clear the token and redirect to login

## Project Structure

```
src-ui/
├── src/
│   ├── components/          # React components
│   │   ├── Login.tsx        # Login page
│   │   ├── Register.tsx     # Registration page
│   │   ├── ProtectedRoute.tsx  # Auth guard
│   │   ├── FileIngestion.tsx   # File upload
│   │   ├── MainEditor.tsx      # Portfolio editor
│   │   ├── ThemeSelection.tsx  # Theme picker
│   │   ├── GenerationSuccess.tsx  # Success page
│   │   └── Settings.tsx        # Settings modal
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context
│   ├── services/
│   │   └── api.ts           # API client and functions
│   ├── utils/
│   │   └── tauri.ts         # API wrappers (legacy naming)
│   ├── types/
│   │   └── portfolio.ts     # TypeScript types
│   ├── App.tsx              # Main app component with routing
│   └── main.tsx             # App entry point
├── .env.development         # Development environment variables
├── .env.production          # Production environment variables
├── .env.example             # Example environment file
├── vite.config.ts           # Vite configuration
└── package.json             # Dependencies and scripts
```

## Application Flow

1. **Login/Register** (`/login`, `/register`) - User authentication
2. **File Ingestion** (`/app`) - Users upload documents and choose processing tier
3. **Main Editor** (`/app/editor`) - Users review and edit portfolio content
4. **Theme Selection** (`/app/themes`) - Users choose a visual theme with preview
5. **Generation Success** (`/app/success`) - Users download or preview their website

## Deployment

### Static Hosting (Netlify, Vercel, etc.)

1. Build the application: `npm run build`
2. Deploy the `dist/` directory
3. Configure environment variables in your hosting platform
4. Set up redirects for SPA routing (all routes → `/index.html`)

### Self-Hosted

1. Build the application: `npm run build`
2. Serve the `dist/` directory with any web server (nginx, Apache, etc.)
3. Configure the web server to handle SPA routing
4. Set the `VITE_API_URL` environment variable before building

Example nginx configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Migration from Tauri Desktop App

This web application was converted from a Tauri desktop application. Key changes:

1. **Removed Dependencies**:
   - `@tauri-apps/api` - Replaced with HTTP API calls via axios

2. **Added Dependencies**:
   - `axios` - HTTP client for API communication

3. **Architecture Changes**:
   - File selection: Tauri dialog → HTML file input
   - File upload: Local paths → FormData multipart upload
   - API calls: Tauri invoke → HTTP REST API
   - Authentication: OS-level → JWT with server session
   - Storage: OS keychain → Server-side encrypted storage
   - Website download: File system → HTTP download URL

4. **New Features**:
   - User authentication (login/register)
   - Multi-user support
   - Cloud-based file storage
   - Session management

## Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

## Notes

- API keys are stored on the server (encrypted) instead of OS keychain
- Files are uploaded to the server instead of being accessed locally
- Generated websites are downloaded as ZIP files instead of being written to local filesystem
- Authentication is required to access the application
