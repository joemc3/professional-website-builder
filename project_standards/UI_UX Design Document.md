---
tags:
  - ui-ux
  - design
  - specification
---
# UI/UX Design Document - Vitae

## 1. Introduction

This document outlines the user interface (UI) design, user experience (UX) flow, and key interactive components for Vitae. It serves as a bridge between the abstract specifications and the final, user-facing application.

## 2. Core Design Principles

-   **Simplicity & Clarity:** The interface will be clean, modern, and uncluttered. Every screen will have a clear purpose, avoiding overwhelming the user with too many options at once.
-   **Guided Journey:** The application will guide the user through a logical, step-by-step process: Add Documents -> Edit Content -> Select Theme -> Generate.
-   **Immediate Feedback:** The UI will provide instant and clear feedback for user actions, such as confirming when a file has been successfully added, showing a loading state during processing, and celebrating the final website generation.

## 3. High-Level User Flow

The application experience is broken down into five primary stages:

1.  **Onboarding & File Ingestion:** The user launches the app and adds their professional documents.
2.  **Processing Method Selection:** The user chooses how the application should process the documents (Manually, via Cloud AI, or via Local AI).
3.  **Content Curation & Review:** Depending on the chosen tier, the user either populates the data manually or reviews and approves the data automatically populated by an AI.
4.  **Theming & Preview:** The user selects a visual theme and sees a live preview of their website.
5.  **Generation & Export:** The user initiates the build process and is given access to the final website files.

## 4. Key Screens & Components

A global `Settings` icon will be present in the main application window to allow access to the Settings screen at any time.

### Handling Non-Ideal States (Loading, Errors)

To provide a complete user experience, the UI must account for states beyond the "happy path."

-   **Global Loading State:** For long-running operations like AI processing or website generation, a modal overlay with a spinner should be displayed to prevent further user interaction.

    **Mockup: Modal Spinner**
    ```
    +------------------------------------------------------------------+
    | Vitae                                                       [X]|
    +------------------------------------------------------------------+
    |                                                                  |
    |                        Processing...                             |
    |                                                                  |
    |                      +--------------+                            |
    |                      |      /       |                            |
    |                      |     | O |    |                            |
    |                      |      \       |                            |
    |                      +--------------+                            |
    |                                                                  |
    |          Please wait while the AI processes your documents.      |
    |                                                                  |
    +------------------------------------------------------------------+
    ```

-   **Inline Error Messages:** For errors related to a specific item, like a file that cannot be parsed, the error should be displayed next to the item itself.

    **Mockup: File Ingestion with Error**
    ```
    +------------------------------------------------------+
    | Added Files:                                         |
    | - resume.pdf                                         |
    | - projects.docx                                      |
    | - corrupted.pdf  [!] Failed to parse file. [Remove]  |
    |                                                      |
    +------------------------------------------------------+
    ```

-   **Transient Notifications (Toasts):** For non-critical errors or warnings (like an unsupported file type), a short-lived notification should appear at the bottom or top of the screen and then fade away.

    **Mockup: Toast Notification**
    ```
    +--------------------------------------------------------------------------------+
    | ... (Main App Window) ...                                                      |
    |                                                                                |
    +--------------------------------------------------------------------------------+
    | [!] Unsupported file type: 'archive.zip' was ignored.                          |
    +--------------------------------------------------------------------------------+
    ```

### Screen 1: Welcome & Processing Method Selection

-   **Purpose:** To allow for easy document aggregation and to select the desired content processing method.
-   **Layout:** A two-panel layout.
    -   **Left Panel (File Ingestion):** A large drag-and-drop zone and an "Add Files" button. Below the drop zone, a list of added files is displayed.
    -   **Right Panel (Processing Tier Selection):** This panel becomes active after at least one file is added. It contains three prominent, selectable options:
        1.  **Manual Mode:** "Take control and fill out your portfolio from the extracted text yourself."
        2.  **Cloud AI Mode:** "Let our AI automatically build your portfolio. Requires a configured API key." (This option is disabled if no API key is set in Settings).
        3.  **Local AI Mode:** "Use your own local AI to build your portfolio. Requires a configured local server endpoint." (This option is disabled if the endpoint is not set in Settings).
-   **Call to Action:** A single button at the bottom, "Process Documents". The application will proceed to the next step using the selected tier.

#### Mockup
```
+--------------------------------------------------------------------------------+
| Vitae                                                                   [⚙️] |
+------------------------------------------------------+-------------------------+
|                                                      |                         |
|   +----------------------------------------------+   | Choose a method:        |
|   |                                              |   |                         |
|   |      Drag and drop files here or...          |   |  (*) Manual Mode        |
|   |                                              |   |      Fill it out        |
|   |           [ Add Files ]                      |   |      yourself.          |
|   |                                              |   |                         |
|   +----------------------------------------------+   |  ( ) Cloud AI Mode      |
|                                                      |      Automated via      |
|   Added Files:                                       |      API. (disabled)    |
|   - resume.pdf                                       |                         |
|   - projects.docx                                    |  ( ) Local AI Mode      |
|                                                      |      Use your own local |
|                                                      |      LLM. (disabled)    |
|                                                      |                         |
+------------------------------------------------------+-------------------------+
|                                                 [ Process Documents ]          |
+--------------------------------------------------------------------------------+
```

### Screen 2: Settings

-   **Purpose:** To configure API keys for Tier 2 and the endpoint for Tier 3. Accessed via a global settings icon.
-   **Layout:** A modal window with two tabs.
    -   **Tab 1: Cloud AI:** Input fields for API keys from supported providers (OpenAI, Anthropic, Gemini). A "Test" button next to each key to verify it.
    -   **Tab 2: Local AI:** A single input field for the user to enter the URL of their local LLM server endpoint (e.g., `http://localhost:11434/api/generate`). A "Test" button to verify the connection.
-   **Call to Action:** A "Save" button.

#### Mockup
```
+------------------------------------------------------------------+
| Settings                                                      [X]|
+------------------------------------------------------------------+
|                                                                  |
|  [ Cloud AI ]  [ Local AI ]                                      |
| +----------------------------------------------------------------+
| |                                                                |
| | Anthropic API Key: [********************] [ Test ]              |
| |                                                                |
| | Gemini API Key:    [********************] [ Test ]              |
| |                                                                |
| | OpenAI API Key:    [********************] [ Test ]              |
| |                                                                |
| +----------------------------------------------------------------+
|                                                                  |
|                                                       [ Save ]   |
+------------------------------------------------------------------+
```

### Screen 3: Main Editor (Content Curation & Review)

-   **Purpose:** To serve as the primary workspace for finalizing the website's content. The user's role on this screen depends on the tier selected previously.
-   **Layout:** A two-panel layout.
    -   **Left Panel (Navigation):** A vertical list of tabs for `Profile`, `Contact`, `Work Experience`, etc.
    -   **Right Panel (Form Editor):** Displays the form for the selected section.
-   **Tier-Dependent Experience:**
    -   **In Manual Mode (Tier 1):** The forms are mostly empty. The user must manually type or copy-paste information from their documents into the fields. A third panel showing the raw extracted text may be provided as a reference.
    -   **In AI Mode (Tiers 2 & 3):** The forms are pre-populated with the data generated by the AI. The user's role shifts to reviewing the content, making corrections, and approving the AI's work. The raw text reference panel is not needed.
-   **Call to Action:** A "Next: Choose Theme" button.

#### Mockup
```
+--------------------------------------------------------------------------------+
| Main Editor                                                             [⚙️] |
+--------------------------------+-----------------------------------------------+
|                                |                                               |
|  [ Profile ]                   |  Full Name:                                   |
|  [ Contact ]                   | [ Jane Doe                                  ] |
|  [ Work Experience ]           |                                               |
|  [ Projects ]                  |  Title:                                       |
|  [ Education ]                 | [ Full-Stack Developer & AI Enthusiast      ] |
|  [ Skills ]                    |                                               |
|                                |  Summary:                                     |
|                                | [ Innovative developer with 5+ years of...  ] |
|                                | [ ...experience building responsive web...  ] |
|                                | [                                           ] |
|                                |                                               |
|                                |                                               |
+--------------------------------+-----------------------------------------------+
| [ Back ]                                            [ Next: Choose Theme ]     |
+--------------------------------------------------------------------------------+
```

### Screen 4: Theme Selection & Live Preview

-   **Purpose:** To allow the user to choose the visual style for their website and see the result in real-time.
-   **Layout:** A two-panel layout.
    -   **Left Panel (Theme Picker):** A scrollable grid of the 5 available theme thumbnails.
    -   **Right Panel (Live Preview):** A large, interactive preview of the website, rendering the user's content with the selected theme.
-   **Call to Action:** A large, green "Generate Website" button.

#### Mockup
```
+--------------------------------------------------------------------------------+
| Theme Selection                                                         [⚙️] |
+--------------------------------+-----------------------------------------------+
|                                |                                               |
|  Choose a theme:               | +-------------------------------------------+ |
|                                | | Jane Doe                                  | |
|  +-----------+  +-----------+  | | Full-Stack Developer                      | |
|  |  Theme 1  |  |  Theme 2  |  | +-----------------------------------------+ |
|  |  (Onyx)   |  | (Quartz)  |  | |                                         | |
|  +-----------+  +-----------+  | | About Me                                  | |
|                                | |   Innovative developer with 5+ years...   | |
|  +-----------+  +-----------+  | |                                         | |
|  | *Theme 3* |  |  Theme 4  |  | | Projects                                  | |
|  | *(Serene)*|  |  (Jade)   |  | |   - Portfolio Builder                   | |
|  +-----------+  +-----------+  | |                                         | |
|                                | +-------------------------------------------+ |
+--------------------------------+-----------------------------------------------+
| [ Back ]                                              [ Generate Website ]     |
+--------------------------------------------------------------------------------+
```

### Screen 5: Generation & Success

-   **Purpose:** To provide feedback on the generation process and give the user access to their new website.
-   **Initial State (Modal):** A modal overlay appears, showing a progress indicator and text like "Generating your website..."
-   **Success State:** A success screen appears with a celebratory message.
    -   **Calls to Action:** Two primary buttons:
        1.  **"Open Website Folder"**
        2.  **"Preview in Browser"**
    -   **Secondary Action:** A "Back to Editor" button.

#### Mockup
```
+------------------------------------------------------------------+
|                                                                  |
|                        [ Success! ]                              |
|                                                                  |
|              Your website has been generated.                    |
|                                                                  |
|                                                                  |
|      [ Open Website Folder ]    [ Preview in Browser ]           |
|                                                                  |
|                                                                  |
|   [ Back to Editor ]                                             |
+------------------------------------------------------------------+
```
