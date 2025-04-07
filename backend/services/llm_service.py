import os
from pathlib import Path
# from dotenv import load_dotenv, dotenv_values # Handled in config.py now

# Import config after env vars are potentially loaded by config.py
try:
    from config import CONFIG
except ImportError:
    print("ERROR: Could not import CONFIG from config.py. Ensure config.py exists in the backend root.")
    CONFIG = {'llm_providers': {'providers': [], 'default_provider': None, 'default_model': None}}  # Fallback


# --- LLM Client Initialization (Dynamic) ---
_llm_clients = {}


def _initialize_client(provider_config):
    """
    Initializes and returns the appropriate LLM client based on config.
    Returns the client instance on success, or raises an exception on failure.
    Caches the client instance or the failure exception.
    """
    provider_id = provider_config['id']
    api_key = provider_config.get('api_key')
    base_url = provider_config.get('base_url')

    # Return cached client/exception if already attempted
    if provider_id in _llm_clients:
        cached_result = _llm_clients[provider_id]
        if isinstance(cached_result, Exception):
            raise cached_result # Re-raise cached exception
        return cached_result # Return cached client or None

    client = None
    try:
        if provider_id == 'openai' or provider_config.get('is_openai_compatible', False) or base_url:
            from openai import OpenAI
            print(f"Initializing OpenAI client for provider '{provider_id}' (Base URL: {base_url or 'Default'})")
            client = OpenAI(api_key=api_key, base_url=base_url)
        elif provider_id == 'anthropic':
            from anthropic import Anthropic
            print(f"Initializing Anthropic client for provider '{provider_id}'")
            if not api_key: raise ValueError("API key not found in config for Anthropic.")
            client = Anthropic(api_key=api_key)
        elif provider_id == 'google':
            import google.generativeai as genai
            print(f"Initializing Google GenAI client for provider '{provider_id}'")
            if not api_key: raise ValueError("API key not found in config for Google GenAI.")
            genai.configure(api_key=api_key)
            client = genai
        else:
            print(f"WARNING: Provider '{provider_id}' not explicitly supported for client initialization.")
            if base_url:
                from openai import OpenAI
                print(f"Attempting OpenAI compatible initialization for '{provider_id}' with base_url: {base_url}")
                client = OpenAI(api_key=api_key, base_url=base_url)

        _llm_clients[provider_id] = client # Cache client (could be None if no specific init matched but no error)
        return client
    except ImportError as e:
        print(f"ERROR: Failed to import library for provider '{provider_id}'. Please install required dependencies. {e}")
        _llm_clients[provider_id] = e # Cache the exception
        raise e # Re-raise
    except Exception as e:
        print(f"ERROR: Failed to initialize client for provider '{provider_id}': {e}")
        _llm_clients[provider_id] = e # Cache the exception
        raise e # Re-raise


# --- Service Functions ---

MAX_COMBINED_CHARS = 15000


def check_provider_config(provider_config):
    """
    Checks if the required API key is present, attempts to initialize the client,
    and performs a lightweight API call to validate the client/key.
    Returns (bool: ok, error_object: {message, details} | None)
    """
    provider_id = provider_config['id']
    api_key_present = bool(provider_config.get('api_key'))
    is_local_provider = provider_id in ['lmstudio', 'ollama']
    error_details = None # Initialize error details

    # 1. Check if key is required but missing (after substitution)
    if not is_local_provider and not api_key_present:
        message = f"API key for provider '{provider_id}' is required but missing or not found in environment/`.env`."
        print(f"Check failed for {provider_id}: {message}")
        return False, {"message": message, "details": None}

    # 2. Attempt to initialize client
    try:
        client = _initialize_client(provider_config)
        if not client:
             raise Exception("Client initialization returned None without raising an error.")
    except Exception as e:
        # Initialization failed
        error_details = {"error_type": type(e).__name__, "message": str(e)}
        return False, {"message": f"Failed to initialize client for provider '{provider_id}'.", "details": error_details}

    # 3. Perform Live API Check (if applicable and client initialized)
    try:
        if provider_id == 'openai' or provider_config.get('is_openai_compatible', False) or provider_config.get('base_url'):
            print(f"Attempting API validation call for {provider_id} (OpenAI compatible)...")
            client.models.list()
        elif provider_id == 'anthropic':
            print(f"Attempting API validation call for {provider_id} (Anthropic)...")
            client.messages.create(
                 model=provider_config['models'][0]['id'], # Use first configured model
                 messages=[{"role": "user", "content": "Hi"}],
                 max_tokens=1
            )
        elif provider_id == 'google':
            print(f"Attempting API validation call for {provider_id} (Google)...")
            models = client.list_models()
            if not models: raise Exception("Listing models returned empty result.")
        else:
            print(f"Skipping live API validation for unknown provider '{provider_id}'.")

        print(f"API validation successful for {provider_id}.")
        return True, None # OK, no error object

    except Exception as e:
        # Handle errors during the validation API call (likely auth error)
        error_msg = f"API key validation failed for provider '{provider_id}'."
        print(f"Check failed for {provider_id}: {e}")
        # Simplify common error message
        if "invalid_api_key" in str(e).lower() or "incorrect API key" in str(e).lower() or \
           getattr(e, 'code', None) == 'invalid_api_key' or "authentication_error" in str(type(e)).lower() or \
           (hasattr(e, 'status_code') and e.status_code == 401):
             error_msg = f"Invalid or inactive API key for provider '{provider_id}'."
        elif "connection error" in str(e).lower() or (hasattr(e, 'status_code') and e.status_code >= 500):
             error_msg = f"Connection error during validation for provider '{provider_id}'. Check network or base URL."
        else:
             error_msg = f"API validation call failed for provider '{provider_id}'." # More generic

        return False, {"message": error_msg, "details": {"error_type": type(e).__name__, "message": str(e)}}


def get_llm_completion(provider_config, model_id, prompt_messages, **kwargs):
    """Gets completion from the specified LLM provider and model."""
    provider_id = provider_config['id']
    client = _initialize_client(provider_config) # Get potentially cached client/exception

    if isinstance(client, Exception): # Check if initialization failed previously
         raise client # Re-raise the initialization error
    if not client:
        raise ValueError(f"Could not initialize client for provider '{provider_id}'. Check configuration and dependencies.")

    try:
        print(f"Attempting completion with {provider_id}/{model_id}")
        if provider_id == 'openai' or provider_config.get('is_openai_compatible', False) or provider_config.get('base_url'):
            from openai import OpenAI
            if not isinstance(client, OpenAI): raise TypeError(f"Client for {provider_id} is not an OpenAI compatible instance.")
            response = client.chat.completions.create(model=model_id, messages=prompt_messages, **kwargs)
            return response.choices[0].message.content.strip()

        elif provider_id == 'anthropic':
            from anthropic import Anthropic
            if not isinstance(client, Anthropic): raise TypeError(f"Client for {provider_id} is not an Anthropic compatible instance.")

            # --- Corrected Anthropic Message Formatting ---
            system_prompt = None
            messages_anthropic = []
            for msg in prompt_messages:
                if msg['role'] == 'system':
                    system_prompt = msg['content'] # Extract system prompt
                elif msg['role'] in ['user', 'assistant']:
                    messages_anthropic.append(msg) # Keep user/assistant messages

            # Construct arguments for the API call
            api_kwargs = {
                "model": model_id,
                "messages": messages_anthropic,
                "max_tokens": kwargs.get('max_tokens', 1024),
                **{k: v for k, v in kwargs.items() if k not in ['max_tokens', 'model', 'messages']} # Add other kwargs safely
            }
            # Only include the system parameter if system_prompt is not None
            if system_prompt:
                api_kwargs['system'] = system_prompt

            # Call API with constructed arguments
            response = client.messages.create(**api_kwargs)
            # --- End Correction ---

            if response.content and len(response.content) > 0:
                return response.content[0].text.strip()
            else:
                return ""

        elif provider_id == 'google':
            import google.generativeai as genai
            if client is not genai: raise TypeError(f"Client for {provider_id} is not a Google GenAI compatible instance.")
            model = client.GenerativeModel(model_id)
            # Google's API might prefer a simpler text prompt structure
            text_prompt = "\n".join([msg['content'] for msg in prompt_messages if msg['role'] == 'user'])
            response = model.generate_content(text_prompt)
            return response.text.strip()

        else:
            raise ValueError(f"LLM provider '{provider_id}' is not supported yet.")

    except Exception as e:
        print(f"Error getting completion from {provider_id} / {model_id}: {e}")
        raise e # Re-raise the exception so the caller knows something went wrong
