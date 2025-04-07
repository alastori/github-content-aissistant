import yaml
from pathlib import Path
import copy
import os
import re
from dotenv import load_dotenv

# Define a custom exception for configuration errors
class ConfigurationError(Exception):
    pass

# Define path to .env file
DOTENV_PATH = Path(__file__).resolve().parent.parent / '.env'
# Load .env file into environment BEFORE loading YAML
load_dotenv(dotenv_path=DOTENV_PATH)

# Regex to find ${VAR_NAME} placeholders
ENV_VAR_PATTERN = re.compile(r'\$\{(.+?)\}')

def substitute_env_vars(config_value):
    """Recursively substitutes ${VAR_NAME} placeholders in config values."""
    if isinstance(config_value, str):
        match = ENV_VAR_PATTERN.fullmatch(config_value)
        if match:
            var_name = match.group(1)
            # Get value from environment, return None if not found (validation happens later)
            env_value = os.environ.get(var_name)
            # No warning here, just return None if not found
            return env_value
        else:
            return config_value
    elif isinstance(config_value, dict):
        return {k: substitute_env_vars(v) for k, v in config_value.items()}
    elif isinstance(config_value, list):
        return [substitute_env_vars(item) for item in config_value]
    else:
        return config_value

def validate_config(config):
    """Checks for mandatory configuration keys and required API keys for enabled providers."""
    if not isinstance(config, dict):
         raise ConfigurationError("Loaded configuration is not a valid dictionary.")

    # --- Mandatory Top-Level Keys ---
    required_top_level = ['github_defaults', 'llm_providers']
    for key in required_top_level:
        if key not in config:
            raise ConfigurationError(f"Mandatory configuration section '{key}' missing in config.yaml.")

    # --- Mandatory GitHub Defaults ---
    if not isinstance(config['github_defaults'], dict):
         raise ConfigurationError("'github_defaults' section must be a dictionary.")
    required_github = ['owner', 'repo', 'branch'] # Token is optional but checked below if enabled
    for key in required_github:
         if key not in config['github_defaults'] or not config['github_defaults'][key]:
              raise ConfigurationError(f"Mandatory key 'github_defaults.{key}' missing or empty in config.yaml.")
    # Check GitHub token only if it was configured (not None after substitution)
    # The actual validation happens in the status check using the token
    # if config['github_defaults'].get('token') is None:
    #      print("Warning: GitHub token ('github_defaults.token') is not configured in config.yaml or .env. Private repos/rate limits may be affected.")


    # --- Mandatory LLM Providers Structure ---
    if not isinstance(config['llm_providers'], dict):
         raise ConfigurationError("'llm_providers' section must be a dictionary.")
    required_llm = ['default_provider', 'default_model', 'providers']
    for key in required_llm:
         if key not in config['llm_providers']:
              raise ConfigurationError(f"Mandatory key 'llm_providers.{key}' missing in config.yaml.")
    if not isinstance(config['llm_providers']['providers'], list) or not config['llm_providers']['providers']:
         raise ConfigurationError("'llm_providers.providers' must be a non-empty list in config.yaml.")

    # --- Validate Default Provider/Model Existence ---
    default_provider_id = config['llm_providers']['default_provider']
    default_model_id = config['llm_providers']['default_model']
    providers_list = config['llm_providers']['providers']

    default_provider_config = next((p for p in providers_list if p.get('id') == default_provider_id), None)
    if not default_provider_config:
        raise ConfigurationError(f"Default provider '{default_provider_id}' not found in the 'llm_providers.providers' list.")

    # Check if default provider is enabled
    if not default_provider_config.get('enabled', True):
         raise ConfigurationError(f"Default provider '{default_provider_id}' is disabled in config.yaml.")

    if not any(m.get('id') == default_model_id for m in default_provider_config.get('models', [])):
         raise ConfigurationError(f"Default model '{default_model_id}' not found within the default provider '{default_provider_id}' models list.")

    # --- Validate Individual Provider Structure & Required Keys for Enabled Providers ---
    for i, provider in enumerate(providers_list):
        is_enabled = provider.get('enabled', True) # Default to enabled if missing

        # Basic structure validation for all providers
        if not isinstance(provider, dict): raise ConfigurationError(f"Item {i} in 'providers' list is not a dictionary.")
        provider_id = provider.get('id')
        if not provider_id: raise ConfigurationError(f"Provider at index {i} is missing mandatory 'id'.")
        if not provider.get('name'): raise ConfigurationError(f"Provider '{provider_id}' is missing mandatory 'name'.")
        # api_key field should exist (even if null or substituted to None)
        if 'api_key' not in provider: raise ConfigurationError(f"Provider '{provider_id}' is missing 'api_key' field (use null or $VAR if not applicable).")
        if not isinstance(provider.get('models'), list) or not provider.get('models'):
             raise ConfigurationError(f"Provider '{provider_id}' must have a non-empty 'models' list.")
        for j, model in enumerate(provider['models']):
             if not isinstance(model, dict): raise ConfigurationError(f"Model at index {j} for provider '{provider_id}' is not a dictionary.")
             if not model.get('id'): raise ConfigurationError(f"Model at index {j} for provider '{provider_id}' is missing mandatory 'id'.")
             if not model.get('name'): raise ConfigurationError(f"Model '{model.get('id')}' for provider '{provider_id}' is missing mandatory 'name'.")

        # --- Check for missing API keys ONLY for ENABLED providers that require them ---
        is_local_provider = provider_id in ['lmstudio', 'ollama'] # Example IDs for local
        api_key_value = provider.get('api_key') # This is the value *after* substitution

        if is_enabled and not is_local_provider and not api_key_value:
             # Find the original placeholder name if possible (more complex, skip for now)
             # Just raise a general error indicating the key is missing for this enabled provider
             raise ConfigurationError(f"API key for enabled provider '{provider_id}' is missing in the environment or .env file.")

    print("Configuration validation passed.")


def load_config(path='config.yaml'):
    """Loads configuration strictly from YAML and validates mandatory fields."""
    config_path = Path(__file__).parent / path
    print(f"Attempting to load configuration from: {config_path}")

    if not config_path.is_file():
        raise ConfigurationError(f"Configuration file '{config_path}' not found.")

    try:
        with open(config_path, 'r') as f:
            user_config = yaml.safe_load(f)
            if not user_config:
                raise ConfigurationError(f"Configuration file '{config_path}' is empty or invalid.")
            print(f"Successfully loaded YAML from {config_path}")
    except yaml.YAMLError as e:
        raise ConfigurationError(f"Error parsing YAML file '{config_path}': {e}")
    except IOError as e:
        raise ConfigurationError(f"Error reading configuration file '{config_path}': {e}")
    except Exception as e:
        raise ConfigurationError(f"Unexpected error loading configuration from '{config_path}': {e}")

    # Perform environment variable substitution
    try:
        final_config = substitute_env_vars(user_config)
    except Exception as e:
         raise ConfigurationError(f"Error substituting environment variables in config: {e}")

    # Validate the final configuration
    validate_config(final_config)

    return final_config


# Load configuration when the module is imported
try:
    CONFIG = load_config()
except ConfigurationError as e:
    print(f"CRITICAL CONFIGURATION ERROR: {e}")
    raise SystemExit(f"CRITICAL CONFIGURATION ERROR: {e}")
