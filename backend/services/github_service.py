# import os # Unused
import requests
import base64
# from pathlib import Path # Unused

# Import the loaded and substituted config
try:
    from config import CONFIG
except ImportError:
    print("ERROR: Could not import CONFIG from config.py in github_service.py.")
    CONFIG = {'github_defaults': {'token': None}} # Fallback

# Get token from the loaded config (which should have substituted env var)
# Use .get for safety in case keys are missing
GITHUB_CONFIG = CONFIG.get('github_defaults', {})
GITHUB_TOKEN = GITHUB_CONFIG.get('token')  # This now holds the actual token value or None
GITHUB_API_BASE = 'https://api.github.com'  # Keep this constant for now


def get_github_headers():
    """Returns headers for GitHub API requests using token from config."""
    headers = {'Accept': 'application/vnd.github.v3+json'}
    if GITHUB_TOKEN:
        headers['Authorization'] = f'token {GITHUB_TOKEN}'
    else:
        print("Warning: No GITHUB_TOKEN found in configuration. GitHub API requests might be rate-limited or fail for private repos.")
    return headers


def fetch_file_content(owner, repo, file_path, branch):
    """Fetches the content of a specific file from GitHub API."""
    api_url = f'{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{file_path}?ref={branch}'
    print(f"Fetching content: {api_url}")  # Debug print
    try:
        response = requests.get(api_url, headers=get_github_headers())
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        if data.get('encoding') == 'base64' and 'content' in data:
            decoded_bytes = base64.b64decode(data['content'])
            return decoded_bytes.decode('utf-8')
        elif 'content' in data:  # Handle potential non-base64 content if API provides it
            return data['content']
        else:
            print(f"Warning: Could not find 'content' or unsupported encoding for file '{owner}/{repo}/{file_path}' on branch '{branch}'. Response: {data}")
            return None  # Indicate failure clearly
    except requests.exceptions.HTTPError as http_err:
        print(f"HTTP error fetching GitHub content for file '{owner}/{repo}/{file_path}' on branch '{branch}': {http_err} - Response: {http_err.response.text}")
        return None
    except requests.exceptions.RequestException as req_err:
        print(f"Request error fetching GitHub content for file '{owner}/{repo}/{file_path}' on branch '{branch}': {req_err}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while fetching file content for '{owner}/{repo}/{file_path}' on branch '{branch}': {e}")
        return None


def fetch_repo_tree(owner, repo, branch):
    """Fetches the file tree for a specific branch from GitHub API."""
    # Validate branch name format (basic check)
    if not branch or not isinstance(branch, str) or '..' in branch or branch.startswith('-'):
        print(f"Warning: Invalid branch name format provided: '{branch}'")
        # Decide how to handle: return None, raise error, or default? Returning None for now.
        return None

    api_url = f'{GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1'
    print(f"Fetching tree: {api_url}")  # Debug print
    try:
        response = requests.get(api_url, headers=get_github_headers())
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        if 'tree' not in data:
            print(f"Warning: 'tree' key not found in response for '{owner}/{repo}' branch '{branch}'. Response: {data}")
            return None
        return data['tree']  # Return the list of tree objects
    except requests.exceptions.HTTPError as http_err:
        # Specifically check for 404 which likely means the branch/repo doesn't exist
        if http_err.response.status_code == 404:
            print(f"Error 404: Repository '{owner}/{repo}' or branch '{branch}' not found.")
        else:
            print(f"HTTP error fetching GitHub tree for '{owner}/{repo}' branch '{branch}': {http_err} - Response: {http_err.response.text}")
        return None
    except requests.exceptions.RequestException as req_err:
        print(f"Request error fetching GitHub tree for '{owner}/{repo}' branch '{branch}': {req_err}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred while fetching repo tree for '{owner}/{repo}' branch '{branch}': {e}")
        return None


def check_github_token():
    """Checks the validity of the configured GitHub token loaded from config."""
    if not GITHUB_TOKEN:
        # Check if it was missing because the placeholder wasn't in config.yaml
        # or if the env var itself was missing. config.py logs the latter.
        return False, {"message": "GITHUB_TOKEN not configured or not found in environment.", "details": None}

    user_url = f'{GITHUB_API_BASE}/user'
    headers = get_github_headers()
    # Mask token for logging/returning details - GITHUB_TOKEN holds the real value now
    masked_headers = {k: ('Authorization: token ***' if k.lower() == 'authorization' else v) for k, v in headers.items()}

    try:
        response = requests.get(user_url, headers=headers)
        response.raise_for_status()  # Raises HTTPError for 4xx/5xx
        print("GitHub token check successful.")
        return True, None  # Return True and no error object
    except requests.exceptions.HTTPError as e:
        error_details = {
            "request": f"GET {user_url}",
            "headers": masked_headers,
            "status_code": e.response.status_code,
            "response_body": e.response.text
        }
        if e.response.status_code == 401:
            error_msg = "Invalid GitHub Token (401 Unauthorized)."
        else:
            error_msg = f"GitHub API error ({e.response.status_code})."
        print(f"GitHub token check failed: {error_msg}")
        return False, {"message": error_msg, "details": error_details}
    except requests.exceptions.RequestException as e:
        error_msg = f"GitHub connection error: {e}"
        error_details = {"request": f"GET {user_url}", "error": str(e)}
        print(f"GitHub token check failed: {error_msg}")
        return False, {"message": error_msg, "details": error_details}
    except Exception as e:
        error_msg = f"Unexpected error during GitHub check: {e}"
        error_details = {"request": f"GET {user_url}", "error": str(e)}
        print(f"GitHub token check failed: {error_msg}")
        return False, {"message": error_msg, "details": error_details}
