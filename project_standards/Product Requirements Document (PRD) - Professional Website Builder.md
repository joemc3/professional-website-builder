---
tags:
  - prd
  - project-management
  - product-specification
---
# Product Requirements Document (PRD) - Vitae

## 1. Introduction & Vision

To create a user-friendly desktop application for macOS and Windows that empowers professionals to effortlessly generate slick, modern, and personalized portfolio websites. The application will transform a user's collection of professional documents (resumes, project histories, recommendations, etc.) into a polished web presence with minimal friction.

## 2. Target Audience

Professionals of all types seeking to establish or update their online portfolio, including:
-   Software Developers
-   Designers & Creatives
-   Academics & Researchers
-   Consultants & Freelancers
-   Job Seekers

## 3. Core Features

### 3.1. File Ingestion & Management
-   **Drag-and-Drop Interface:** Users can drag and drop files directly into the application.
-   **Supported File Types:** The application will support a wide range of common professional document formats, including `.md`, `.docx`, `.xlsx`, `.pdf`, and `.pptx`.
-   **Local Persistence:** All user-provided documents will be copied and stored in a local, project-specific folder, allowing for easy access, updates, and re-generation.
-   **File Management:** Users can add or remove documents from the collection at any time.

### 3.2. Website Generation
-   **One-Click Generation:** Once documents are added, the user can trigger the website generation process.
-   **Modern Web Stack:** Websites will be built using modern, robust technologies.
    -   **Frontend:** JavaScript (React/Next.js), HTML5, CSS3
    -   **Styling:** A modern CSS framework (e.g., Tailwind CSS) to ensure responsive and visually appealing designs.
-   **Theming:** Users can choose from at least five distinct, professionally designed themes and layouts to match their personal brand.

## 4. Information Processing Tiers

The application will offer three distinct tiers for processing the source documents and populating the website content.

### 4.1. Tier 1: Static & In-App Guided Mode
-   **Functionality:** The application extracts raw text and data from the documents. The user is then guided through a series of templates and questionnaires to manually select, edit, and place the information onto the website.
-   **Technology:** May incorporate a small, embedded LLM (e.g., via ONNX runtime) that can run on standard CPU/GPU hardware to assist with basic information extraction and suggestions without requiring an internet connection or powerful hardware.

### 4.2. Tier 2: Cloud LLM API Integration
-   **Functionality:** Users can provide an API key for a major LLM provider (e.g., Anthropic, Gemini, OpenAI). The application will use the powerful cloud-based LLM to intelligently parse the source documents, synthesize the information, and automatically generate Markdown files for each section of the website (e.g., "About Me," "Projects," "Work Experience"). This will significantly reduce the need for manual data entry.
-   **User Experience:** A highly automated, "do-it-for-me" experience.

### 4.3. Tier 3: Local LLM Integration
-   **Functionality:** Power users can connect the application to a local LLM running via services like Ollama or LM Studio. The application will leverage the local model to perform the same document processing and content generation tasks as the cloud-based tier.
-   **Variability:** The quality and speed of the automation will be dependent on the capability of the user's local model and hardware. This offers a balance between the automation of Tier 2 and the privacy/offline capabilities of Tier 1.

## 5. Initial Project Scope

The initial release will be a complete product including all specified features.
-   [ ] Functional desktop application for both macOS and Windows.
-   [ ] Full implementation of all three information processing tiers:
    -   Tier 1: Static & In-App Guided Mode
    -   Tier 2: Cloud LLM API Integration
    -   Tier 3: Local LLM Integration
-   [ ] Support for all specified file types (`.md`, `.docx`, `.xlsx`, `.pdf`, `.pptx`).
-   [ ] All 5 planned website themes.

## 6. Error Handling and User Feedback

To ensure a robust and user-friendly experience, the application must handle errors gracefully and provide clear feedback to the user.

-   **File Ingestion Errors:**
    -   **Unsupported File Type:** If a user drops a file with an unsupported extension, the application will ignore the file and display a transient notification: "File type not supported: [filename]".
    -   **Corrupted/Unreadable File:** If a file cannot be parsed (e.g., a corrupted `.pdf`), the application will show a persistent error message in the file list next to the file's name: "Failed to parse [filename]". The user should be able to remove the file.

-   **API & Network Errors:**
    -   **Invalid API Key:** When testing or using a Cloud AI, if the API key is invalid or expired, the application will display a clear error message in the Settings screen or near the processing tier selection: "API Key for [Provider] is invalid."
    -   **Network Failure:** If the application cannot reach a cloud API or a local LLM server, it will display a non-modal error message: "Network connection failed. Please check your internet connection or local server."
    -   **API Rate Limits:** If an API call is rejected due to rate limiting, the application should inform the user: "API rate limit exceeded. Please wait and try again."

-   **Data Validation Errors:**
    -   **Malformed LLM Response:** If the response from an LLM does not conform to the required JSON schema, the application will not proceed. It will show an error to the user: "AI response was malformed. Trying again may resolve the issue." The system may attempt one automatic retry before showing the error.
