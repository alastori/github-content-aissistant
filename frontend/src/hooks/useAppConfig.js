import { useState, useEffect } from 'react';

// Define the backend API base URL (Consider moving to a shared config/constants file)
const API_BASE_URL = 'http://localhost:5001';

export function useAppConfig(apiStatus) { // Takes apiStatus as input
  // State for Repo config (populated by defaults)
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('');
  const [defaultFileFilters, setDefaultFileFilters] = useState(['.md']); // Store default filters

  // State for LLM Providers/Models
  const [allProviders, setAllProviders] = useState([]); // Full list from config
  const [availableProviders, setAvailableProviders] = useState([]); // Filtered list based on status check
  const [models, setModels] = useState([]); // Models for the currently selected provider
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');

  // State for default provider status determination
  const [defaultProviderStatus, setDefaultProviderStatus] = useState({
    id: null,
    ok: null,
    error: null,
    isLoading: true // Start as loading until config is fetched and processed
  });

  // State for general config loading errors
  const [configError, setConfigError] = useState(null);

  // Fetch Config Defaults & Determine Default Provider Status
  useEffect(() => {
    // Only run if API status is loaded and config hasn't been processed yet
    if (!apiStatus.loading && defaultProviderStatus.isLoading) {
      const fetchConfig = async () => {
        let fetchedConfigData = null;
        try {
          console.log("Fetching config defaults and providers...");
          setDefaultProviderStatus(prev => ({ ...prev, isLoading: true, ok: null, error: null, id: null })); // Reset status
          setConfigError(null); // Clear previous config errors

          const response = await fetch(`${API_BASE_URL}/api/config/defaults`);
          if (!response.ok) { throw new Error(`HTTP error fetching config! status: ${response.status}`); }
          fetchedConfigData = await response.json();
          console.log("Received config data:", fetchedConfigData);

          // Set GitHub Defaults & Default File Filters
          if (fetchedConfigData.github) {
            setOwner(fetchedConfigData.github.owner || 'pingcap');
            setRepo(fetchedConfigData.github.repo || 'docs');
            setBranch(fetchedConfigData.github.branch || 'master');
            setDefaultFileFilters(fetchedConfigData.github.file_extensions || ['.md']);
          } else {
            setOwner('pingcap'); setRepo('docs'); setBranch('master'); // Hardcoded fallback
            setDefaultFileFilters(['.md']);
          }

          // --- LLM Provider Logic ---
          if (!fetchedConfigData.llm_providers || !fetchedConfigData.llm_providers.providers) {
            throw new Error("LLM provider configuration ('llm_providers') missing or invalid in response from /api/config/defaults");
          }

          const allEnabledProvidersFromConfig = fetchedConfigData.llm_providers.providers;
          setAllProviders(allEnabledProvidersFromConfig);

          const configDefaultProviderId = fetchedConfigData.llm_providers.default_provider;
          const configDefaultModelId = fetchedConfigData.llm_providers.default_model;

          if (!configDefaultProviderId) {
            setDefaultProviderStatus({ id: null, ok: false, isLoading: false, error: { type: 'config', message: "No 'default_provider' specified in backend configuration (config.yaml)." } });
            setAvailableProviders([]); setSelectedProviderId(''); setModels([]); setSelectedModelId('');
            return;
          }

          const configuredDefaultProvider = allEnabledProvidersFromConfig.find(p => p.id === configDefaultProviderId);
          if (!configuredDefaultProvider) {
            setDefaultProviderStatus({ id: configDefaultProviderId, ok: false, isLoading: false, error: { type: 'config', message: `Configured default provider ('${configDefaultProviderId}') is not enabled or defined.` } });
            setAvailableProviders([]); setSelectedProviderId(''); setModels([]); setSelectedModelId('');
            return;
          }

          const defaultStatusResult = apiStatus.provider_statuses[configDefaultProviderId];
          if (!defaultStatusResult || !defaultStatusResult.ok) {
            let errorType = 'api_error';
            const errorMessage = defaultStatusResult?.error?.message || `Status check failed for default provider '${configDefaultProviderId}'.`;
            if (errorMessage.toLowerCase().includes('api key') && errorMessage.toLowerCase().includes('missing')) {
              errorType = 'missing_key';
            }
            setDefaultProviderStatus({ id: configDefaultProviderId, ok: false, isLoading: false, error: { type: errorType, message: errorMessage, details: defaultStatusResult?.error?.details } });
            const available = allEnabledProvidersFromConfig.filter(p => apiStatus.provider_statuses[p.id]?.ok === true);
            setAvailableProviders(available);
            setSelectedProviderId(''); setModels([]); setSelectedModelId('');
            return;
          }

          // --- Default Provider is OK ---
          setDefaultProviderStatus({ id: configDefaultProviderId, ok: true, isLoading: false, error: null });
          const available = allEnabledProvidersFromConfig.filter(p => apiStatus.provider_statuses[p.id]?.ok === true);
          setAvailableProviders(available);
          setSelectedProviderId(configDefaultProviderId);

          if (configuredDefaultProvider.models) {
            setModels(configuredDefaultProvider.models);
            const foundDefaultModel = configuredDefaultProvider.models.find(m => m.id === configDefaultModelId);
            setSelectedModelId(foundDefaultModel ? configDefaultModelId : (configuredDefaultProvider.models[0]?.id || ''));
          } else {
            setModels([]); setSelectedModelId('');
          }

        } catch (e) {
          console.error("Error processing config and determining default provider:", e);
          let errorMessage = `Failed to process configuration: ${e.message}.`;
          if (e instanceof TypeError && e.message === 'Failed to fetch') {
            errorMessage = 'Network error: Could not connect to the backend to fetch configuration. Please ensure the server is running and accessible.';
          }
          setConfigError(errorMessage);
          setDefaultProviderStatus({ id: null, ok: false, isLoading: false, error: { type: 'config', message: errorMessage } });
          // Set fallbacks even on error
          setOwner('pingcap'); setRepo('docs'); setBranch('master');
          setDefaultFileFilters(['.md']);
          setAllProviders([]); setAvailableProviders([]); setModels([]); setSelectedProviderId(''); setSelectedModelId('');
        }
      };
      fetchConfig();
    }
    // Depend on apiStatus loading flag and the internal loading flag
  }, [apiStatus.loading, apiStatus.provider_statuses, defaultProviderStatus.isLoading]); // Added apiStatus.provider_statuses dependency

  // Update Models when Provider Changes
  useEffect(() => {
    const selectedProvider = allProviders.find(p => p.id === selectedProviderId);
    if (selectedProvider && selectedProvider.models) {
      setModels(selectedProvider.models);
      const currentModelIsValid = selectedProvider.models.some(m => m.id === selectedModelId);
      if (!currentModelIsValid || !selectedModelId) { // Also reset if selectedModelId is somehow empty
        setSelectedModelId(selectedProvider.models[0]?.id || '');
      }
    } else {
      setModels([]);
      setSelectedModelId('');
    }
  }, [selectedProviderId, allProviders]); // Removed selectedModelId dependency

  return {
    // Repo Config State & Setters
    owner, setOwner,
    repo, setRepo,
    branch, setBranch,
    defaultFileFilters, // Return the default filters read from config

    // LLM State & Setters
    allProviders, // Might be needed for analysis submission
    availableProviders,
    models,
    selectedProviderId, setSelectedProviderId,
    selectedModelId, setSelectedModelId,

    // Status & Error State
    defaultProviderStatus,
    configError,
  };
}
