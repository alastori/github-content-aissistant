from flask import Blueprint, request, jsonify, current_app # Import current_app
import uuid
import os
import re

# Import necessary components using absolute paths from backend root
try:
    # Assuming 'backend' is the root package for execution context
    from config import CONFIG
    from services import github_service, llm_service
    from background_tasks import run_analysis_task, cancelled_tasks
    # DO NOT import socketio from main here to avoid circular import
except ImportError as e:
    print(f"CRITICAL Error importing modules in routes.py: {e}. Ensure all modules exist and backend is run correctly.")
    # Define fallbacks or raise error to prevent app start
    CONFIG = {'github_defaults': {}, 'llm_providers': {'providers': []}}
    # Define dummy functions or raise to prevent routes from being defined incorrectly
    def check_github_token(): return False, {"message": "Import failed"}
    def check_provider_config(cfg): return False, {"message": "Import failed"}
    github_service = type('obj', (object,), {'check_github_token': check_github_token})
    llm_service = type('obj', (object,), {'check_provider_config': check_provider_config})
    cancelled_tasks = {}
    def run_analysis_task(*args, **kwargs): pass


# Create a Blueprint
api_bp = Blueprint('api_bp', __name__, url_prefix='/api')


@api_bp.route('/files', methods=['GET'])
def get_files():
    """Endpoint to get the file tree for a specified repo and branch."""
    owner = request.args.get('owner', CONFIG['github_defaults']['owner'])
    repo = request.args.get('repo', CONFIG['github_defaults']['repo'])
    branch = request.args.get('branch', CONFIG['github_defaults']['branch'])
    tree = github_service.fetch_repo_tree(owner, repo, branch)
    if tree is None:
        return jsonify({'error': f'Could not fetch file tree for {owner}/{repo} branch: {branch}'}), 500

    # Get requested extensions from query param, default to config
    extensions_str = request.args.get('extensions')
    if extensions_str:
        # Split by comma, strip whitespace, remove empty strings, ensure dot prefix
        allowed_extensions = [f".{ext.strip().lstrip('.')}" for ext in extensions_str.split(',') if ext.strip()]
    else:
        # Use default from config
        allowed_extensions = CONFIG['github_defaults'].get('file_extensions', ['.md']) # Default to .md if missing

    # Filter files based on the allowed extensions
    filtered_files = [
        {'path': item['path'], 'type': item['type']}
        for item in tree
        if item.get('type') == 'blob' and any(item.get('path', '').endswith(ext) for ext in allowed_extensions)
    ]
    return jsonify({'owner': owner, 'repo': repo, 'branch': branch, 'files': filtered_files})


@api_bp.route('/status', methods=['GET'])
def check_status():
    """Checks the validity of configured GitHub token and ALL configured LLM providers."""
    github_ok, github_error_obj = github_service.check_github_token()

    provider_statuses = {}
    llm_providers_config = CONFIG.get('llm_providers', {}).get('providers', [])

    if not llm_providers_config:
         print("Warning: No LLM providers found in configuration for status check.")
    else:
        # Iterate only over enabled providers for status check
        for provider_config in llm_providers_config:
            if not provider_config.get('enabled', True):
                # print(f"Skipping status check for disabled provider: {provider_config.get('id', 'N/A')}") # Reduce noise
                continue

            provider_id = provider_config.get('id')
            if not provider_id:
                print("Warning: Found enabled provider config without an ID during status check.")
                continue
            # Check each provider
            provider_ok, provider_error_obj = llm_service.check_provider_config(provider_config)
            provider_statuses[provider_id] = {
                'ok': provider_ok,
                'error': provider_error_obj
            }

    return jsonify({
        'github_ok': github_ok,
        'github_error': github_error_obj,
        'provider_statuses': provider_statuses
    })


@api_bp.route('/config/defaults', methods=['GET'])
def get_config_defaults():
    """Returns default configuration values needed by the frontend."""
    # Filter providers to only include enabled ones before sending to frontend
    all_providers_config = CONFIG.get('llm_providers', {})
    enabled_providers = [
        # Return only id, name, and models for frontend
        {k: v for k, v in p.items() if k in ['id', 'name', 'models']}
        for p in all_providers_config.get('providers', []) if p.get('enabled', True)
    ]

    # Ensure github_defaults exists before trying to access file_extensions
    github_defaults_config = CONFIG.get('github_defaults', {})
    defaults = {
        'github': github_defaults_config, # Send the whole github_defaults section
        'llm_providers': {
            'providers': enabled_providers,
            'default_provider': all_providers_config.get('default_provider'),
            'default_model': all_providers_config.get('default_model')
        }
        # file_extensions is now included within the 'github' key
    }
    return jsonify(defaults)


@api_bp.route('/process', methods=['POST'])
def process_docs_start():
    """
    Endpoint to START the documentation processing task in the background.
    Returns a task ID to the client.
    """
    # Access socketio instance via application context
    socketio_instance = current_app.extensions.get('socketio')
    if not socketio_instance:
         return jsonify({'error': 'SocketIO not available in app context.'}), 500

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid JSON payload'}), 400

    # Extract parameters, using config for defaults
    owner = data.get('owner', CONFIG['github_defaults']['owner'])
    repo = data.get('repo', CONFIG['github_defaults']['repo'])
    branch = data.get('branch', CONFIG['github_defaults']['branch'])
    scope = data.get('scope')
    user_prompt = data.get('user_prompt')
    analysis_mode = data.get('analysis_mode', 'iterative')
    provider_id = data.get('provider_id')
    model_id = data.get('model_id')

    # --- Input Validation ---
    if not user_prompt: return jsonify({'error': 'Missing "user_prompt" in request'}), 400
    if not scope or not isinstance(scope, list) or len(scope) == 0: return jsonify({'error': 'Missing or empty "scope" (list of file paths) in request'}), 400
    if analysis_mode not in ['iterative', 'combined']: return jsonify({'error': f'Invalid "analysis_mode": {analysis_mode}. Must be "iterative" or "combined".'}), 400
    if not provider_id: return jsonify({'error': 'Missing "provider_id" in request'}), 400
    if not model_id: return jsonify({'error': 'Missing "model_id" in request'}), 400

    # Find the provider config from loaded CONFIG
    # Important: Use the main CONFIG here, not just enabled_providers sent to frontend
    provider_config = next((p for p in CONFIG['llm_providers']['providers'] if p['id'] == provider_id), None)
    if not provider_config: return jsonify({'error': f'Configuration for provider_id "{provider_id}" not found.'}), 400
    if not provider_config.get('enabled', True): return jsonify({'error': f'Provider "{provider_id}" is disabled in configuration.'}), 400

    # Check if the selected model is valid for the provider
    if not any(m['id'] == model_id for m in provider_config.get('models', [])):
        return jsonify({'error': f'Model "{model_id}" not found for provider "{provider_id}".'}), 400

    # Check API key status for the *selected* provider before starting task
    provider_ok, provider_error_obj = llm_service.check_provider_config(provider_config)
    if not provider_ok:
        error_message = provider_error_obj.get('message', 'Provider configuration check failed.')
        return jsonify({'error': error_message}), 503

    # --- Start Background Task ---
    task_id = str(uuid.uuid4())
    print(f"Received request to start task {task_id} for mode '{analysis_mode}' using {provider_id}/{model_id}")
    if task_id in cancelled_tasks: del cancelled_tasks[task_id]

    # Use the socketio instance obtained from app context
    socketio_instance.start_background_task(
        target=run_analysis_task,
        socketio=socketio_instance, # Pass the instance obtained from context
        task_id=task_id,
        analysis_mode=analysis_mode,
        scope=scope,
        user_prompt=user_prompt,
        owner=owner,
        repo=repo,
        branch=branch,
        provider_config=provider_config, # Pass full config for selected provider
        model_id=model_id
    )
    return jsonify({'message': 'Analysis task started', 'task_id': task_id}), 202


@api_bp.route('/version', methods=['GET'])
def get_version():
    """Returns the backend version from pyproject.toml."""
    version = "Unknown"
    try:
        # Construct the path relative to the current file's directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        pyproject_path = os.path.join(current_dir, 'pyproject.toml')

        with open(pyproject_path, 'r') as f:
            content = f.read()
            # Use regex to find the version line in the [project] section
            match = re.search(r'^version\s*=\s*"(.*?)"', content, re.MULTILINE)
            if match:
                version = match.group(1)
            else:
                 print("Warning: Could not find version string in pyproject.toml")

    except FileNotFoundError:
        print(f"Error: pyproject.toml not found at expected path: {pyproject_path}")
    except Exception as e:
        print(f"Error reading or parsing pyproject.toml: {e}")

    return jsonify({'backend_version': version})
