# Development Guide

This document provides detailed information for developers working on the Professional Website Builder.

## Development Environment Setup

### 1. Install Prerequisites

See the main README.md for platform-specific prerequisites.

### 2. Clone and Install

```bash
git clone <repository-url>
cd professional-website-builder
npm install
```

### 3. Install Workspace Dependencies

```bash
# Tauri doesn't need explicit install (uses Cargo)
# React UI
cd src-ui && npm install && cd ..

# Next.js generator
cd src-generator && npm install && cd ..
```

## Architecture Overview

### Three-Layer Architecture

1. **Tauri Backend (Rust)** - `src-tauri/`
   - File I/O and document parsing
   - LLM API integration
   - Secure credential storage
   - System integration

2. **React Frontend (TypeScript)** - `src-ui/`
   - Desktop application UI
   - User workflows and forms
   - State management
   - Tauri API client

3. **Next.js Generator (TypeScript)** - `src-generator/`
   - Static site generation
   - Theme system
   - Portfolio rendering
   - Export functionality

### Data Flow

```
User drops files → Tauri copies to user-data/source-files/
                 ↓
            Rust parses documents
                 ↓
            Aggregated text
                 ↓
┌────────────────┴────────────────┐
│                                 │
Tier 1 (Manual)           Tier 2/3 (AI)
User fills forms          LLM generates JSON
│                                 │
└────────────────┬────────────────┘
                 ↓
         User reviews/edits
                 ↓
        Final JSON approved
                 ↓
   Written to user-data/session.json
                 ↓
    Next.js builds static site
                 ↓
   Output to user-data/generated-site/
```

## Module Guide

### Rust Backend Modules

**src-tauri/src/main.rs**
- Entry point
- Tauri command registration

**src-tauri/src/commands.rs**
- Tauri command implementations
- API exposed to React frontend
- Commands: `ingest_files`, `get_aggregated_text`, `get_json_from_ai`, `generate_website`, etc.

**src-tauri/src/document_parser.rs**
- Document parsing for multiple formats
- Functions: `parse_markdown`, `parse_docx`, `parse_pdf`, `parse_xlsx`, `parse_pptx`
- Uses: `comrak`, `zip`, `pdf-extract`, `quick-xml`

**src-tauri/src/llm_client.rs**
- LLM API client
- Supports: Anthropic, OpenAI, Gemini, Local (Ollama/LM Studio)
- Prompt engineering for portfolio generation
- Response parsing and validation

**src-tauri/src/storage.rs**
- Secure credential storage
- Platform-specific implementations:
  - macOS: `security-framework` (Keychain)
  - Windows: `windows` crate (Credential Manager)
  - Linux: `secret-service` crate (GNOME Keyring/KWallet)

**src-tauri/src/validator.rs**
- JSON schema validation
- Data integrity checks
- Date format validation
- Required field validation

**src-tauri/src/types.rs**
- Rust data structures
- Matches TypeScript types exactly
- Serde serialization for JSON

### React Frontend Components

**src-ui/src/App.tsx**
- Main app component
- Global state management
- Routing setup
- Loading overlay and toast notifications

**src-ui/src/components/FileIngestion.tsx**
- Screen 1: File upload and processing tier selection
- Drag-and-drop functionality
- File list management
- Tier selection UI

**src-ui/src/components/Settings.tsx**
- Screen 2: API key configuration (modal)
- Cloud AI tab (Anthropic, OpenAI, Gemini)
- Local AI tab (endpoint configuration)
- Test connection functionality

**src-ui/src/components/MainEditor.tsx**
- Screen 3: Portfolio data editor
- Section navigation sidebar
- Dynamic form generation
- Add/remove array items (work experience, projects, etc.)

**src-ui/src/components/ThemeSelection.tsx**
- Screen 4: Theme picker with preview
- Theme grid
- Live preview panel
- Generate website button

**src-ui/src/components/GenerationSuccess.tsx**
- Screen 5: Success screen
- Open folder / Preview in browser
- Next steps guidance

**src-ui/src/utils/tauri.ts**
- Tauri API command wrappers
- Type-safe function calls
- Error handling

### Next.js Generator

**src-generator/app/page.tsx**
- Theme router
- Redirects to selected theme

**src-generator/app/lib/loadPortfolioData.ts**
- Loads session.json
- Provides default fallback data
- Type-safe data loading

**src-generator/app/themes/[theme]/page.tsx**
- Main theme template
- Imports all components
- Theme-specific styling

**src-generator/app/themes/[theme]/components/**
- Reusable portfolio sections
- Header, Profile, WorkExperience, Projects, Education, Skills, Contact
- Responsive design
- Theme-specific colors

## Adding a New Feature

### Example: Adding a New Field to Profile

**1. Update Rust types** (`src-tauri/src/types.rs`):
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub full_name: String,
    pub title: String,
    pub summary: Option<String>,
    pub tagline: Option<String>, // NEW FIELD
}
```

**2. Update TypeScript types** (`src-ui/src/types/portfolio.ts` and `src-generator/app/types/portfolio.ts`):
```typescript
export interface Profile {
  fullName: string;
  title: string;
  summary?: string;
  tagline?: string; // NEW FIELD
}
```

**3. Update UI form** (`src-ui/src/components/MainEditor.tsx`):
```tsx
<input
  type="text"
  value={portfolioData.profile.tagline || ''}
  onChange={(e) => updateProfile('tagline', e.target.value)}
  placeholder="Your professional tagline"
  className="input-field"
/>
```

**4. Update LLM prompt** (`src-tauri/src/llm_client.rs`):
Add `tagline` to the prompt schema.

**5. Update theme components** (`src-generator/app/themes/*/components/Profile.tsx`):
```tsx
{data.profile.tagline && (
  <p className="text-xl italic">{data.profile.tagline}</p>
)}
```

**6. Update validator** (`src-tauri/src/validator.rs`):
Add validation if needed.

## Testing

### Unit Tests

**Rust:**
```bash
cd src-tauri
cargo test
```

**React:**
```bash
cd src-ui
npm test
```

**Next.js:**
```bash
cd src-generator
npm test
```

### Integration Testing

1. **Test file ingestion:**
   - Drop sample files (MD, DOCX, PDF)
   - Verify text extraction

2. **Test manual mode:**
   - Fill out all form fields
   - Navigate between sections
   - Generate website

3. **Test AI mode:**
   - Configure API key
   - Test connection
   - Generate portfolio
   - Review AI output

4. **Test themes:**
   - Select each theme
   - Preview in iframe
   - Generate and verify output

5. **Test website generation:**
   - Check `user-data/generated-site/`
   - Verify HTML output
   - Test in browser

### Manual Test Checklist

- [ ] Files can be dragged and dropped
- [ ] File parsing works for all formats
- [ ] Settings modal opens and saves keys
- [ ] API connection test works
- [ ] Manual mode form validation works
- [ ] AI mode generates valid JSON
- [ ] All 5 themes display correctly
- [ ] Theme preview updates in real-time
- [ ] Website generation completes
- [ ] Generated site opens in browser
- [ ] All portfolio sections render
- [ ] Responsive design works (mobile/desktop)
- [ ] Social links work
- [ ] External project links work

## Debugging

### Enable Rust Debug Logging

```bash
RUST_LOG=debug npm run dev
```

### Enable Tauri DevTools

DevTools are automatically available in development mode. Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS).

### Debug Document Parsing

Add test files to `src-tauri/tests/fixtures/` and run:

```bash
cd src-tauri
cargo test --test document_parser_test -- --nocapture
```

### Debug LLM Integration

Use the test connection feature in Settings to verify API connectivity.

For detailed logging:
```bash
RUST_LOG=debug,reqwest=trace npm run dev
```

### Debug Next.js Build

```bash
cd src-generator
NODE_OPTIONS='--inspect' npm run build
```

## Performance Optimization

### Rust Backend

- Document parsing is done synchronously but could be parallelized with `rayon`
- LLM requests have 60-second timeout (configurable in `llm_client.rs`)
- File I/O uses standard library (fast enough for typical resume sizes)

### React Frontend

- Use React DevTools Profiler to identify slow renders
- Form state is in parent component (could be optimized with Context/Zustand)
- File drag-and-drop is debounced to prevent excessive re-renders

### Next.js Generation

- Static generation is fast (~2-5 seconds for typical portfolio)
- Images should be optimized if added to themes
- Consider code splitting for large theme libraries

## Code Style

### TypeScript

- Use functional components with hooks
- Prefer `const` over `let`
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Avoid `any` type
- Use descriptive variable names

### Rust

- Follow Rust API guidelines
- Use `Result<T, E>` for error handling
- Prefer `&str` over `String` for function parameters
- Use `serde` for serialization
- Document public APIs with `///` comments

### CSS/Tailwind

- Mobile-first responsive design
- Use Tailwind utility classes
- Create custom classes in `@layer components` for reusable patterns
- Keep theme-specific styles in theme directories

## Common Issues

### "Failed to parse DOCX"

Ensure the DOCX file is valid and not corrupted. Test with a simple Word document first.

### "API key invalid"

Verify the key in Settings. Test the connection. Check that the key has proper permissions.

### "Website generation failed"

Check that `session.json` exists and is valid JSON. Review Next.js build logs.

### "Permission denied" on file operations

Tauri has strict file system access. Ensure files are in allowed directories.

## Release Process

### 1. Update Version

Update version in:
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

### 2. Build Installers

```bash
npm run build
```

Installers will be in `src-tauri/target/release/bundle/`:
- macOS: `.dmg` and `.app`
- Windows: `.msi`
- Linux: `.deb`, `.AppImage`

### 3. Test Installers

Install on clean VM or test machine. Verify:
- Application launches
- All features work
- No console errors
- Icons display correctly

### 4. Create Release

Tag the release:
```bash
git tag v0.1.0
git push origin v0.1.0
```

Upload installers to GitHub Releases or distribution platform.

## Additional Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Rust Book](https://doc.rust-lang.org/book/)

## Getting Help

- Check existing issues in the repository
- Read the project standards documentation
- Review code comments and inline documentation
- Ask in discussions or create an issue
