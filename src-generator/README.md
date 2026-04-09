# Portfolio Website Generator

Next.js-based static site generator for creating professional portfolio websites.

## Overview

This is a Next.js 14 application that generates static portfolio websites from JSON data. It uses the App Router, TypeScript, and Tailwind CSS to create responsive, production-ready portfolio sites.

## Features

- **Static Site Generation (SSG)**: Outputs static HTML/CSS/JS that can be hosted anywhere
- **Theme System**: Supports multiple themes (currently includes "Onyx" theme)
- **TypeScript**: Full type safety for portfolio data
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **Responsive**: Mobile-first design that works on all devices

## Directory Structure

```
src-generator/
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Main page (routes to theme)
│   ├── globals.css             # Global styles and Tailwind directives
│   ├── types/
│   │   └── portfolio.ts        # TypeScript types for portfolio data
│   ├── lib/
│   │   └── loadPortfolioData.ts # Data loading utility
│   └── themes/
│       └── onyx/               # Onyx theme
│           ├── theme.config.json
│           ├── page.tsx        # Main theme template
│           └── components/     # Theme components
├── public/
│   └── themes/
│       └── onyx/
│           └── thumbnail.png   # Theme preview
├── package.json
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind configuration
└── tsconfig.json               # TypeScript configuration
```

## Usage

### Install Dependencies

```bash
cd src-generator
npm install
```

### Development Mode

```bash
npm run dev
```

This starts a development server at http://localhost:3000

### Build for Production

```bash
# Build with default data
npm run build

# Build with specific session file
SESSION_FILE=/path/to/session.json npm run build
```

The build output will be generated in `../user-data/generated-site/`

### Data Loading

The generator reads portfolio data from a JSON file specified by the `SESSION_FILE` environment variable.

- **Default path**: `../../user-data/session.json` (relative to src-generator)
- **Override**: Set `SESSION_FILE` environment variable to a custom path

If the file is not found, it falls back to default sample data.

### Portfolio Data Format

The JSON data must follow the schema defined in `app/types/portfolio.ts`:

```typescript
{
  "profile": {
    "fullName": "Your Name",
    "title": "Your Title",
    "summary": "Your professional summary"
  },
  "contact": {
    "email": "your@email.com",
    "phone": "+1 234 567 8900",
    "website": "https://yourwebsite.com",
    "socialLinks": [
      { "platform": "GitHub", "url": "https://github.com/yourusername" }
    ]
  },
  "workExperience": [...],
  "projects": [...],
  "education": [...],
  "skills": [...],
  "theme": { "name": "onyx" }
}
```

See `/home/user/vitae/user-data/session.json` for a complete example.

## Themes

### Available Themes

#### Onyx (Dark Professional)
- Dark theme with blue/teal accents
- Perfect for developers and tech professionals
- Clean, modern design
- Sections: Hero, About, Work Experience, Projects, Education, Skills, Contact

### Creating a New Theme

1. Create a new directory in `app/themes/[theme-name]/`
2. Add `theme.config.json`:
   ```json
   {
     "name": "Theme Name",
     "description": "Theme description",
     "thumbnail": "/themes/[theme-name]/thumbnail.png"
   }
   ```
3. Create `page.tsx` with your theme implementation
4. Add components in `components/` directory
5. Update `app/page.tsx` to include the new theme in the switch statement

## Configuration

### Output Directory

The static site output directory is configured in `next.config.js`:

```javascript
distDir: '../user-data/generated-site'
```

### Tailwind Custom Colors

Custom color tokens are defined in `tailwind.config.js`:

- `onyx-950` to `onyx-600`: Dark theme backgrounds
- `accent-blue`: #60a5fa
- `accent-teal`: #5eead4

## Integration with Tauri

The Tauri backend should:

1. Write approved portfolio JSON to `user-data/session.json`
2. Set the `SESSION_FILE` environment variable to the absolute path
3. Spawn the build process: `cd src-generator && npm run build`
4. Wait for completion
5. The static site will be available in `user-data/generated-site/`

## Development Notes

- **System Fonts**: Uses system font stack for optimal performance and compatibility
- **Static Export**: All pages are pre-rendered at build time
- **No External Fonts**: Avoids external font dependencies for offline builds
- **Error Handling**: Gracefully handles missing or invalid JSON data

## Linting and Formatting

```bash
# Run ESLint
npm run lint

# Format code with Prettier
npm run format
```

## Technologies

- Next.js 14.2+
- React 18.3+
- TypeScript 5.4+
- Tailwind CSS 3.4+
- PostCSS with Autoprefixer
