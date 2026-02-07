# Yu Do - Plan less. Finish more.

A focused to-do workspace to capture, organize, and complete what matters. Built with Flask, SQLite, and a professional, responsive UI.

## 🚀 Feature Overview

### 1. Core Features (MVP)
*   **User Authentication**: Secure Sign up, Log in, and Log out with password hashing and session management.
*   **Create Notes**: Rich text content creation with titles.
*   **Edit Notes**: Inline editing with real-time UI updates.
*   **Delete Notes**: Soft delete (Recycle Bin) with restore capability and permanent deletion.
*   **Search**: Instant keyword search filtering by title and body.

### 2. Organization & Productivity
*   **Pin Notes**: Toggle important notes to keep them at the top of your workspace.
*   **Sorting**: Automatic sorting by Pinned status and Creation date.
*   **Tags / Labels**: *(Planned)* Organize notes with custom tags.

### 3. Media Support
*   **Image Attachments**: Upload multiple images per note.
*   **Safe Rendering**: Aspect ratios preserved, no cropping or stretching.
*   **Media Management**: Remove individual attachments easily.
*   **Modal View**: Full-size media preview in a split-view modal.

### 4. Note Lifecycle & Safety
*   **Recycle Bin**: dedicated view for deleted notes.
*   **Immutability**: Deleted notes are read-only until restored.
*   **Auto-Purge**: Automatically removes deleted notes after 30 days (Backend logic).

### 5. UI / UX Enhancements
*   **Responsive Design**: Fully adaptive layout for Desktop, Tablet, and Mobile.
*   **Split-View Modal**: Optimized reading experience with vertically stacking layout on mobile.
*   **Visual Polish**: Layered depth design, professional typography, and smooth transitions.
*   **Empty States**: Friendly prompts when the workspace is empty.

### 6. Performance & Reliability
*   **Database**: SQLite backed for reliability.
*   **Optimized Queries**: Efficient data fetching with per-user isolation.
*   **Optimistic UI**: Fast interactions with immediate feedback.

### 7. Security & Privacy
*   **Data Isolation**: Notes are strictly scoped to the logged-in user.
*   **Route Guards**: All workspace interaction protected by login requirements.
*   **Secure Storage**: Industry-standard password hashing.

---

## 🛠 Tech Stack
*   **Backend**: Python, Flask, SQLAlchemy
*   **Frontend**: HTML5, CSS3 (Custom Design System), JavaScript (Vanilla)
*   **Database**: SQLite
*   **Icons**: Lucide Icons

## 🏃‍♂️ Getting Started

1.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
2.  **Run the Application**:
    ```bash
    python app.py
    ```
3.  **Open in Browser**:
    Navigate to `http://127.0.0.1:5000`

---
*Made by Satyam Singh*
