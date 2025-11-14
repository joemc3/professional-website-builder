#!/bin/bash

# Script to generate Tauri application icons
# This uses the @tauri-apps/cli icon generator

set -e

echo "Generating Tauri application icons..."

# Check if Tauri CLI is installed
if ! command -v tauri &> /dev/null; then
    echo "Tauri CLI not found. Installing..."
    npm install -g @tauri-apps/cli
fi

# Generate icons from the SVG source
cd src-tauri
tauri icon icons/icon.svg

echo "Icons generated successfully!"
echo "Generated files:"
echo "  - icons/32x32.png"
echo "  - icons/128x128.png"
echo "  - icons/128x128@2x.png"
echo "  - icons/icon.icns (macOS)"
echo "  - icons/icon.ico (Windows)"
