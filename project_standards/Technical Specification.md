---
tags:
  - technical-specification
  - architecture
  - system-design
---
# Technical Specification - Vitae

## 1. Introduction

This document outlines the proposed technical architecture, technology stack, and data flow for the Vitae desktop application, focusing on the MVP+ scope.

## 2. Desktop Application Framework

-   **Choice:** **Tauri**
-   **Rationale:**
    -   **Performance & Size:** Tauri applications are significantly smaller and more resource-efficient than Electron-based apps because they leverage the operating system's native web renderer instead of bundling a full Chromium instance.
    -   **Security:** The backend is written in Rust, a memory-safe language, which provides a more secure foundation for handling files and system interactions compared to Node.js.
    -   **Backend Language:** Rust offers high performance, which will be beneficial for I/O-intensive tasks like file processing and will be a strong foundation for future local LLM integrations (Tier 3).

## 3. Application UI Frontend Framework

-   **Choice:** **React with TypeScript**
-   **Rationale:**
    -   **Rich Ecosystem:** React is a mature and widely-adopted framework with a vast library of components and tools.
    -   **Type Safety:** TypeScript will be used to ensure the application is robust, maintainable, and less prone to runtime errors.
    -   **Component-Based:** A component-based architecture is ideal for building the modular UI required for the file manager, theme selector, and content editor.

## 4. Generated Website Stack

-   **Choice:** **Next.js (Static Site Generation - SSG)**
-   **Rationale:**
    -   **High Performance:** Next.js excels at creating highly optimized, static HTML files that can be deployed to any hosting service with excellent performance.
    -   **SEO Friendly:** Static generation provides a superb foundation for Search Engine Optimization out-of-the-box.
    -   **Theming:** The Next.js `pages` and component structure is perfectly suited for creating distinct, reusable themes and layouts. Each theme can be a set of React components.

## 5. Styling

-   **Application UI:** **Tailwind CSS** will be used for styling the desktop application's UI. Its utility-first approach allows for rapid, consistent, and maintainable design implementation.
-   **Generated Websites:** Each website theme will be self-contained, using CSS Modules or a CSS-in-JS solution to prevent style conflicts and ensure portability.

## 6. Document Processing & Data Extraction

The Tauri Rust backend will be responsible for invoking and managing data extraction libraries for all supported file types.

-   **Markdown (`.md`):** A Rust crate like `comrak` will be used for robust and fast Markdown parsing.
-   **Microsoft Word (`.docx`):** A suitable Rust library will be used to extract text content.
-   **PDF (`.pdf`):** A Rust library like `pdf-extract` will be used to parse and extract text from PDF files.
-   **Excel (`.xlsx`) and PowerPoint (`.pptx`):** Appropriate Rust crates for parsing Office Open XML formats will be utilized to extract textual and relevant metadata.

## 7. High-Level Project Structure

A monorepo structure will be used to manage the different parts of the application.

```
/vitae/
├── src-tauri/              # Tauri Rust backend code
│   ├── src/
│   └── tauri.conf.json
├── src-ui/                 # React frontend for the application UI
│   ├── src/
│   └── package.json
├── src-generator/          # Next.js project for website themes and generation logic
│   ├── pages/
│   ├── components/
│   └── package.json
└── user-data/              # Created at runtime on the user's machine
    ├── source-files/       # Stores the user's dropped documents
    └── generated-site/     # Output directory for the final website
```

## 8. API and Service Integration

To support Tiers 2 and 3, the application must integrate with external and local AI services.

### 8.1. Tier 2: Cloud LLM API Integration
-   **HTTP Client:** The `reqwest` crate in Rust will be used to make secure HTTPS requests to the various cloud LLM APIs (OpenAI, Anthropic, Gemini).
-   **API Key Management:** API keys will be collected in the UI and securely stored in the operating system's native secret manager (e.g., macOS Keychain, Windows Credential Manager) using the `tauri-plugin-keychain` or a similar crate. Keys will never be stored in plaintext.
-   **Data Structuring:** The Rust backend will be responsible for creating the specific prompts for the LLMs. The prompt will instruct the LLM to analyze the aggregated text from the user's documents and return a JSON object that strictly adheres to the application's `Data Structure Specification`.

### 8.2. Tier 3: Local LLM Integration
-   **Communication:** The application will communicate with local LLM servers (Ollama, LM Studio, etc.) via their REST API endpoints. The `reqwest` crate will be used for this.
-   **Configuration:** The UI will feature a settings page where users can specify the local server's endpoint URL (e.g., `http://localhost:11434/api/generate`).
-   **Prompting:** Similar to Tier 2, the Rust backend will construct and send a prompt designed to elicit a JSON response matching the `Data Structure Specification`.

## 9. Data Flow

The application will support three distinct data flow paths, selectable by the user.

1.  **File Ingestion (Common First Step):**
    -   The user drops documents into the UI.
    -   The Tauri backend copies the files to `user-data/source-files/`.
    -   The backend parses all documents and aggregates the raw text content.

2.  **Processing Path Selection:** The UI will prompt the user to choose their desired processing method.

    -   **Path A: Tier 1 (Manual)**
        -   The aggregated text is sent to the React UI.
        -   The user manually populates the forms in the "Main Editor" view, using the aggregated text as a reference.

    -   **Path B: Tier 2 (Cloud LLM)**
        -   The backend retrieves the appropriate API key from the system's secret store.
        -   It sends the aggregated text and a structured prompt to the selected cloud LLM API.
        -   The LLM returns a JSON object. The backend validates this JSON against the `Data Structure Specification`.
        -   The validated JSON is used to pre-fill the "Main Editor" view. The user's role becomes one of a reviewer, making minor edits and approving the content.

    -   **Path C: Tier 3 (Local LLM)**
        -   This flow is identical to Tier 2, but the backend sends the request to the user-configured local LLM endpoint instead of a cloud API. The quality of the result depends on the local model's capability.

3.  **Final Steps (Common to all paths):**
    -   The user reviews the content in the editor and proceeds to the "Theme Selection" screen.
    -   The final, approved JSON data is passed to the `src-generator` (Next.js).
    -   Next.js builds the static website into the `user-data/generated-site/` directory.
    -   The user is notified and provided with links to the generated site.

## 10. Tauri API Contract

The React frontend will communicate with the Rust backend by invoking the following Tauri commands. All commands should return a `Result<T, E>` to handle potential errors gracefully in the frontend.

-   `ingest_files(files: Vec<String>) -> Result<(), String>`
    -   **Description:** Called when the user drops files. Copies files to the user data directory and triggers parsing.
    -   **Returns:** An empty `Ok` on success or an error message string on failure.

-   `get_aggregated_text() -> Result<String, String>`
    -   **Description:** Retrieves the raw text aggregated from all ingested documents for display in Tier 1 mode.
    -   **Returns:** A single string containing all text or an error if no text could be extracted.

-   `get_json_from_ai(tier: String, aggregated_text: String) -> Result<String, String>`
    -   **Description:** The core command for Tiers 2 and 3. Sends the aggregated text to the appropriate LLM (Cloud or Local) and requests a JSON object matching the data specification.
    -   **`tier`:** A string identifier, e.g., "anthropic", "openai", "local".
    -   **Returns:** A serialized JSON string on success, or an error message detailing the API failure, validation error, etc.

-   `generate_website(json_data: String, theme: String) -> Result<(), String>`
    -   **Description:** Initiates the final website generation process.
    -   **`json_data`:** The final, user-approved portfolio data as a serialized JSON string.
    -   **`theme`:** The identifier for the selected theme (e.g., "onyx").
    -   **Returns:** An empty `Ok` on success or an error message if the build process fails.

## 11. Data Exchange Mechanism

To ensure clean separation between the Tauri application and the website generator, the data exchange will be handled via the file system:

1.  When the `generate_website` command is invoked, the Rust backend will write the provided `json_data` string to a temporary file located at `user-data/session.json`.
2.  The Rust backend will then execute the Next.js build command as a child process (e.g., `npm run build --workspace=src-generator`).
3.  The Next.js application's `getStaticProps` function will be configured to read the `session.json` file from the known location to source the data for the static site generation.
4.  This approach avoids complex inter-process communication and allows the generator to be run independently for testing purposes, provided a valid `session.json` file exists.

## 12. Theme Architecture

Each theme within the `src-generator` project must adhere to a standard structure to be recognized by the application.

-   **Location:** Each theme will be a subdirectory inside `src-generator/themes/`. For example: `src-generator/themes/onyx/`.
-   **Required Files:**
    -   `theme.config.json`: A metadata file containing the theme's display name and a path to its thumbnail.
        ```json
        {
          "name": "Onyx",
          "thumbnail": "/themes/onyx/thumbnail.png"
        }
        ```
    -   `[...slug].js`: The main Next.js page template that generates the website pages based on the data from `session.json`.
    -   `styles.css`: A CSS module or global stylesheet for the theme.
    -   `thumbnail.png`: A `400x300` preview image of the theme's appearance, displayed in the theme selection screen.
-   **Selection:** The `theme` parameter in the `generate_website` command will determine which theme subdirectory is used for the build. The Next.js build process will be dynamically configured to use the specified theme's template and styles.
