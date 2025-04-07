# GitHub Content AIssistant

A web application that helps select and analyze files from a specified GitHub repository using a selected Large Language Model (LLM) based on user prompts. It is useful for repositories containing documents files. Features a Python/Flask backend and a Next.js frontend.

## Prerequisites

* Python (>=3.12 recommended)
* `uv` (Python package manager) - Installation: `pip install uv` or see [official uv documentation](https://github.com/astral-sh/uv)
* Node.js and npm (LTS version recommended)

## Setup & Installation

1. **Clone the repository (if you haven't already):**

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2. **Backend Setup:**
    * Navigate to the backend directory:

        ```bash
        cd backend
        ```

    * Create the virtual environment and install dependencies using the lock file:

        ```bash
        uv sync
        ```

    * Navigate back to the project root:

        ```bash
        cd ..
        ```

3. **Frontend Setup:**
    * Navigate to the frontend directory:

        ```bash
        cd frontend
        ```

    * Install dependencies:

        ```bash
        npm install
        ```

    * Navigate back to the project root:

        ```bash
        cd ..
        ```

## Configuration

1. **Backend Configuration:**

    * Review and modify `backend/config.yaml` as needed. This file defines default GitHub repository settings and configures available LLM providers (including which one is the default).

2. **Environment Variables:**
    * Copy the example environment file:

        ```bash
        cp .env.example .env
        ```

    * Edit the `.env` file in the project root directory and add your required API keys and tokens:
        * `GITHUB_TOKEN`: Your GitHub Personal Access Token (required for accessing private repositories or avoiding rate limits on public ones).
        * API keys for the LLM providers you enabled in `config.yaml` (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`).

## Running the Application

You need to run both the backend and frontend servers simultaneously.

1. **Run the Backend Server:**

    * Open a terminal in the project root directory.
    * Navigate to the backend directory:

        ```bash
        cd backend
        ```

    * Start the Flask server using `uv`:

        ```bash
        uv run main.py
        ```

    * The backend server will typically run on `http://localhost:5001`.

2. **Run the Frontend Server:**
    * Open a *separate* terminal in the project root directory.
    * Navigate to the frontend directory:

        ```bash
        cd frontend
        ```

    * Start the Next.js development server:

        ```bash
        npm run dev
        ```

    * The frontend server will typically run on `http://localhost:3000`.

3. **Access the Application:**

    * Open your web browser and navigate to `http://localhost:3000`.

## License

This project is licensed under the MIT License. See the LICENSE file for details (if one exists) or refer to the [MIT License text](https://opensource.org/licenses/MIT).

## Acknowledgements

This application was developed with assistance from:

* [Cline](https://cline.bot/)
* [Google Gemini 2.5 Pro](https://ai.google.dev/gemini-api/docs/models#gemini-2.5-pro-preview-03-25)
