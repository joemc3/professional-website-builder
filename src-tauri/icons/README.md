# Tauri Application Icons

This directory contains the application icons for different platforms.

## Required Icon Files

The following icon files are required for building the application:

- **32x32.png** - 32x32 pixel PNG icon
- **128x128.png** - 128x128 pixel PNG icon
- **128x128@2x.png** - 256x256 pixel PNG icon (2x resolution for retina displays)
- **icon.icns** - macOS icon file (multiple resolutions bundled)
- **icon.ico** - Windows icon file (multiple resolutions bundled)

## Generating Icons

You can use the following tools to generate icons from a source image:

### Using Tauri Icon Generator
```bash
npm install -g @tauri-apps/cli
tauri icon path/to/source-icon.png
```

This will automatically generate all required icon sizes and formats.

### Manual Generation

For manual generation:

1. **PNG files**: Use any image editor (GIMP, Photoshop, etc.) to resize your source icon
2. **ICNS (macOS)**: Use `iconutil` on macOS or tools like `png2icns`
3. **ICO (Windows)**: Use tools like ImageMagick or online converters

## Design Guidelines

- Use a simple, recognizable symbol or logo
- Ensure the icon looks good at small sizes (32x32)
- Use a transparent background for better integration
- Consider using the app's primary color (blue/teal) as the main color
- Test the icon on both light and dark backgrounds

## Temporary Placeholders

For development purposes, placeholder icon files have been created. **Replace these with production-quality icons before distributing the application.**
