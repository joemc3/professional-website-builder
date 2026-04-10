---
tags:
  - data-structure
  - specification
  - json-schema
---
# Data Structure Specification - Vitae

## 1. Introduction

This document defines the standard JSON data structure that will serve as the "single source of truth" for a user's portfolio. This schema will be used by the application UI for data population and editing, and by the website generator to build the final static site. A consistent data structure is critical for ensuring that themes can be applied interchangeably.

## 2. High-Level Schema

The entire portfolio will be represented by a single JSON object. This object will contain all user-provided information, organized into logical sections.

```json
{
  "profile": {},
  "contact": {},
  "workExperience": [],
  "projects": [],
  "education": [],
  "skills": [],
  "theme": {}
}
```

## 3. Detailed Schema Breakdown

### 3.1. `profile`
Contains core personal and professional identification.

-   `fullName` (string, required): The user's full name.
-   `title` (string, required): The user's professional title (e.g., "Senior Software Engineer", "UX/UI Designer").
-   `summary` (string, optional): A 2-4 sentence professional summary or biography.

**Example:**
```json
"profile": {
  "fullName": "Jane Doe",
  "title": "Full-Stack Developer & AI Enthusiast",
  "summary": "Innovative developer with 5+ years of experience building responsive web applications and exploring the intersection of AI and user experience."
}
```

### 3.2. `contact`
Contains information for contacting the user.

-   `email` (string, optional): The user's email address.
-   `phone` (string, optional): The user's phone number.
-   `website` (string, optional): A link to a personal blog or other relevant website.
-   `socialLinks` (array, optional): A list of social media profiles.
    -   `platform` (string): The name of the platform (e.g., "GitHub", "LinkedIn").
    -   `url` (string): The full URL to the user's profile.

**Example:**
```json
"contact": {
  "email": "jane.doe@email.com",
  "socialLinks": [
    {
      "platform": "GitHub",
      "url": "https://github.com/janedoe"
    },
    {
      "platform": "LinkedIn",
      "url": "https://linkedin.com/in/janedoe"
    }
  ]
}
```

### 3.3. `workExperience`
An array of objects, where each object represents a single job or position.

-   `company` (string, required): The name of the company.
-   `location` (string, optional): The location of the job (e.g., "San Francisco, CA").
-   `title` (string, required): The user's title at the company.
-   `startDate` (string, required): The start date in "YYYY-MM" format.
-   `endDate` (string, required): The end date in "YYYY-MM" format, or "Present".
-   `responsibilities` (array, optional): A list of strings, where each string is a key accomplishment or responsibility.

**Example:**
```json
"workExperience": [
  {
    "company": "Tech Solutions Inc.",
    "location": "Remote",
    "title": "Software Engineer",
    "startDate": "2020-01",
    "endDate": "Present",
    "responsibilities": [
      "Developed and maintained client-facing features using React and Node.js.",
      "Led the migration of a legacy system to a modern microservices architecture."
    ]
  }
]
```

### 3.4. `projects`
An array of objects, where each object represents a significant project.

-   `name` (string, required): The name of the project.
-   `description` (string, required): A brief description of the project.
-   `technologies` (array, optional): A list of strings identifying the technologies used.
-   `url` (string, optional): A URL to the project's repository or live demo.

**Example:**
```json
"projects": [
  {
    "name": "Portfolio Builder",
    "description": "A desktop app to generate professional websites from resumes and other documents.",
    "technologies": ["Tauri", "React", "Rust", "Next.js"],
    "url": "https://github.com/janedoe/portfolio-builder"
  }
]
```

### 3.5. `education`
An array of objects representing the user's educational background.

-   `institution` (string, required): The name of the school or institution.
-   `degree` (string, required): The degree obtained (e.g., "B.S.", "M.Sc.").
-   `fieldOfStudy` (string, optional): The field of study (e.g., "Computer Science").
-   `startDate` (string, optional): The start year in "YYYY" format.
-   `endDate` (string, required): The end year in "YYYY" format.

**Example:**
```json
"education": [
  {
    "institution": "State University",
    "degree": "B.S.",
    "fieldOfStudy": "Computer Science",
    "startDate": "2016",
    "endDate": "2020"
  }
]
```

### 3.6. `skills`
An array of objects used to group skills by category.

-   `category` (string, required): The name of the skill category (e.g., "Programming Languages", "Databases", "Cloud Platforms").
-   `items` (array, required): A list of strings representing individual skills.

**Example:**
```json
"skills": [
  {
    "category": "Programming Languages",
    "items": ["JavaScript (ES6+)", "TypeScript", "Python", "Rust"]
  },
  {
    "category": "Frameworks & Libraries",
    "items": ["React", "Next.js", "Node.js", "Tauri"]
  }
]
```

### 3.7. `theme`
An object to store theme-specific settings.

-   `name` (string, required): The identifier for the selected theme (e.g., "onyx", "quartz", "serene").
-   `layoutOptions` (object, optional): For future use, to allow for theme-specific customizations (e.g., color palettes, font choices).

**Example:**
```json
"theme": {
  "name": "onyx"
}
```
