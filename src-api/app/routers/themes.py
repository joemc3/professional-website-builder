from fastapi import APIRouter

router = APIRouter(prefix="/api/themes", tags=["themes"])

THEMES = [
    {
        "slug": "onyx",
        "name": "Onyx",
        "description": "Dark, technical, sharp edges",
        "audience": "Developers, engineers",
        "fonts": {"heading": "JetBrains Mono", "body": "Inter"},
        "colors": {
            "primary": "#0a0a0a",
            "accent": "#7c8aff",
            "background": "#0a0a0a",
            "surface": "#1a1a1a",
            "text": "#e0e0e0",
        },
    },
    {
        "slug": "coral",
        "name": "Coral",
        "description": "Warm, bold, energetic",
        "audience": "Creative professionals, designers",
        "fonts": {"heading": "Poppins", "body": "DM Sans"},
        "colors": {
            "primary": "#d4553a",
            "accent": "#f4a261",
            "background": "#fffaf7",
            "surface": "#fff5f0",
            "text": "#2d2420",
        },
    },
    {
        "slug": "serene",
        "name": "Serene",
        "description": "Clean, minimal, spacious",
        "audience": "Consultants, executives",
        "fonts": {"heading": "Source Serif 4", "body": "Source Sans 3"},
        "colors": {
            "primary": "#2c3e50",
            "accent": "#7f8c8d",
            "background": "#fafbfc",
            "surface": "#ffffff",
            "text": "#2c3e50",
        },
    },
    {
        "slug": "jade",
        "name": "Jade",
        "description": "Earthy, balanced, sophisticated",
        "audience": "Academics, researchers",
        "fonts": {"heading": "Libre Baskerville", "body": "Nunito Sans"},
        "colors": {
            "primary": "#3d6b4f",
            "accent": "#8fb380",
            "background": "#f4f7f2",
            "surface": "#ffffff",
            "text": "#2a3a2e",
        },
    },
    {
        "slug": "quartz",
        "name": "Quartz",
        "description": "Light, crisp, corporate",
        "audience": "Business and finance professionals",
        "fonts": {"heading": "Inter", "body": "Inter"},
        "colors": {
            "primary": "#3355cc",
            "accent": "#5577ee",
            "background": "#ffffff",
            "surface": "#f8f9fb",
            "text": "#1a1a2e",
        },
    },
]


@router.get("")
async def list_themes():
    return THEMES
