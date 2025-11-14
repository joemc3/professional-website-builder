# Professional Website Builder - Desktop UI

This is the React + TypeScript + Vite frontend application for the Professional Website Builder desktop app.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling framework
- **Tauri API** - Desktop integration and communication with Rust backend
- **React Router** - Client-side routing

## Project Structure

```
src-ui/
├── src/
│   ├── components/           # React components for each screen
│   │   ├── FileIngestion.tsx      # Screen 1: File upload & tier selection
│   │   ├── Settings.tsx           # Screen 2: API key configuration
│   │   ├── MainEditor.tsx         # Screen 3: Content editing forms
│   │   ├── ThemeSelection.tsx     # Screen 4: Theme picker with preview
│   │   └── GenerationSuccess.tsx  # Screen 5: Success screen
│   ├── types/
│   │   └── portfolio.ts      # TypeScript interfaces matching Rust data structures
│   ├── utils/
│   │   └── tauri.ts          # Tauri API command wrappers
│   ├── App.tsx               # Main app component with routing
│   ├── App.css               # App-specific styles
│   ├── main.tsx              # Application entry point
│   └── index.css             # Global styles with Tailwind
├── index.html                # HTML entry point
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vite.config.ts            # Vite configuration for Tauri
├── tailwind.config.js        # Tailwind CSS configuration
└── postcss.config.js         # PostCSS configuration
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run the dev server (standalone)
npm run dev

# Run with Tauri (full app)
cd ..
npm run tauri dev
```

The dev server will start on `http://localhost:5173`.

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

### Linting & Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

## Application Flow

1. **File Ingestion** (`/`) - Users drag & drop or select documents, then choose processing tier (Manual/Cloud AI/Local AI)
2. **Main Editor** (`/editor`) - Users review and edit portfolio content across 6 sections (Profile, Contact, Work, Projects, Education, Skills)
3. **Theme Selection** (`/themes`) - Users choose a visual theme and see a live preview
4. **Generation Success** (`/success`) - Users can open the generated website folder or preview in browser

## Key Features

### Tauri Integration

The app communicates with the Rust backend via Tauri commands:

- `ingest_files` - Process uploaded documents
- `get_aggregated_text` - Get extracted text from documents
- `get_json_from_ai` - AI-powered content generation
- `generate_website` - Build static website
- `save_api_key` / `get_api_key` - Secure API key storage
- `test_api_connection` - Verify AI provider connections

### State Management

Application state is managed in `App.tsx` and passed down via props:
- Portfolio data (profile, contact, experience, etc.)
- Processing tier selection
- Ingested files list
- Theme selection

### Styling

Uses Tailwind CSS with custom utility classes:
- `.btn-primary` - Primary action buttons
- `.btn-secondary` - Secondary action buttons
- `.btn-outline` - Outlined buttons
- `.input-field` - Text input fields
- `.textarea-field` - Textarea fields
- `.card` - Card container
- `.label` - Form labels

### Loading States

Global loading overlay managed in `App.tsx`:
```typescript
showLoading('Processing documents...');
// ... async operation
hideLoading();
```

### Toast Notifications

Transient notifications for user feedback:
```typescript
showToast('Success message', 'success');
showToast('Error message', 'error');
showToast('Warning message', 'warning');
```

## TypeScript Types

All data structures match the backend Rust types and the Data Structure Specification:

- `PortfolioData` - Complete portfolio structure
- `Profile` - User profile information
- `Contact` - Contact details and social links
- `WorkExperience` - Job history
- `Project` - Project portfolio items
- `Education` - Educational background
- `SkillCategory` - Grouped skills
- `Theme` - Theme configuration

## Development Notes

### Adding New Components

1. Create component in `src/components/`
2. Import and use in `App.tsx` or other components
3. Add route if needed in `App.tsx`

### Adding New Tauri Commands

1. Define command wrapper in `src/utils/tauri.ts`
2. Add proper TypeScript types
3. Handle errors appropriately
4. Implement corresponding Rust command in `src-tauri/`

### Styling Guidelines

- Use Tailwind utility classes first
- Create custom classes in `index.css` for reusable patterns
- Follow existing color scheme (primary blue)
- Maintain consistent spacing (gap-4, p-6, etc.)

## Browser Support

The app targets modern browsers as specified in Vite config:
- Chrome 105+ (Windows)
- Safari 13+ (macOS)

## License

Part of the Professional Website Builder project.
