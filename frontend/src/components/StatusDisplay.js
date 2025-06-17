import React, { useState } from 'react'; // Import useState

// Define the backend API base URL (Consider moving to a config file later)
const API_BASE_URL = 'http://localhost:5001';

// Updated props: receive apiStatus (for GitHub) and defaultProviderStatus
const StatusDisplay = ({ apiStatus, defaultProviderStatus }) => {
  // State for showing details for *each* provider with an error
  const [showDetails, setShowDetails] = useState({}); // e.g., { 'github': false, 'openai': false }
  const [dismissedBanners, setDismissedBanners] = useState({});

  const toggleDetails = (providerId) => {
    setShowDetails(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const dismissBanner = (bannerId) => {
    setDismissedBanners(prev => ({ ...prev, [bannerId]: true }));
  };

  // --- Loading States ---
  // Show initial loading if either API status or default provider determination is loading
  if (apiStatus.loading || defaultProviderStatus.isLoading) {
    return (
      <div className="w-full max-w-5xl p-4 mb-6 text-center bg-gray-100 border border-gray-200 rounded-lg shadow-sm">
        <p className="text-gray-600 animate-pulse">Checking API configurations...</p>
      </div>
    );
  }

  // Show general error if API status fetch failed
  if (apiStatus.error) {
     return (
      <div className="w-full max-w-5xl p-4 mb-6 text-center bg-red-100 border border-red-300 rounded-lg shadow-sm text-red-800">
        <h3 className="font-semibold mb-2">Error Checking Configuration Status</h3>
        <p>{apiStatus.error}</p>
        <p className="mt-2 text-sm">Please ensure the backend server is running and accessible at {API_BASE_URL}.</p>
      </div>
    );
  }

  // --- Render Logic ---
  const defaultProviderId = defaultProviderStatus.id; // Get ID from the status object
  const defaultProviderOk = defaultProviderStatus.ok;
  const defaultProviderError = defaultProviderStatus.error; // { message, details, type }

  // Find other enabled providers with errors (using apiStatus.provider_statuses)
  const otherProviderErrors = Object.entries(apiStatus.provider_statuses || {})
    .filter(([id, providerStatus]) => id !== defaultProviderId && !providerStatus.ok)
    .map(([id, providerStatus]) => ({ id, ...providerStatus.error })); // Include ID with error info

  // --- Helper to render error details ---
  const renderErrorDetails = (errorObj, providerIdForToggle) => {
    if (!errorObj?.details) return null;
    return (
      <div>
        <button onClick={() => toggleDetails(providerIdForToggle)} className="text-sm text-inherit hover:opacity-80 underline focus:outline-none mt-2">
          {showDetails[providerIdForToggle] ? 'Hide Details' : 'Show Details'}
        </button>
        {showDetails[providerIdForToggle] && (
          <pre className="mt-2 p-2 text-xs bg-opacity-50 bg-black/10 border border-black/20 rounded overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(errorObj.details, null, 2)}
          </pre>
        )}
        {errorObj.details?.env_override_warning && (
           <p className="mt-2 text-xs font-semibold">{errorObj.details.env_override_warning}</p>
        )}
      </div>
    );
  };

  // --- Helper to render specific error messages ---
  const renderDefaultProviderErrorContent = () => {
    if (!defaultProviderError) return null; // Should not happen if !defaultProviderOk, but safety check

    const providerName = defaultProviderId ? `'${defaultProviderId}'` : 'default provider';

    switch (defaultProviderError.type) {
      case 'config':
        return (
          <>
            <h3 className="font-bold text-lg mb-2">LLM Configuration Error</h3>
            <p className="mb-3">{defaultProviderError.message}</p>
            <p className="text-sm mb-3">
              Please check your backend <code className="bg-red-200 px-1 rounded">config.yaml</code> file to ensure a valid default provider is specified and enabled.
            </p>
            {renderErrorDetails(defaultProviderError, defaultProviderId || 'config_error')}
          </>
        );
      case 'missing_key':
        return (
          <>
            <h3 className="font-bold text-lg mb-2">Missing API Key for {providerName}</h3>
            <p className="mb-3">{defaultProviderError.message}</p>
            <p className="text-sm mb-3">
              Please add the required API key to your <code className="bg-red-200 px-1 rounded">.env</code> file (or directly in <code className="bg-red-200 px-1 rounded">config.yaml</code> if not using environment variables). Restart the backend server after changes.
            </p>
            {renderErrorDetails(defaultProviderError, defaultProviderId)}
          </>
        );
      case 'api_error':
      default: // Treat unknown types like API errors
        return (
          <>
            <h3 className="font-bold text-lg mb-2">API Access Error for {providerName}</h3>
            <p className="mb-3">{defaultProviderError.message}</p>
            <p className="text-sm mb-3">
              Please verify the API key is correct and active. Check network connectivity to the provider's API endpoint (if applicable) and review backend server logs for more details.
            </p>
            {renderErrorDetails(defaultProviderError, defaultProviderId)}
          </>
        );
    }
  };


  return (
    <div className="w-full max-w-5xl mb-6 space-y-3">
      {/* GitHub Status (uses apiStatus) */}
      {!dismissedBanners['github'] && (
        <div className={`relative p-4 border-l-4 rounded-r-lg shadow-sm ${apiStatus.github_ok ? 'bg-green-100 border-green-500 text-green-900' : 'bg-yellow-100 border-yellow-500 text-yellow-900'}`}>
          <button onClick={() => dismissBanner('github')} className="absolute top-2 right-2 text-inherit hover:opacity-70">&times;</button>
          <h4 className="font-semibold text-sm">GitHub Configuration</h4>
          {apiStatus.github_ok ? (
            <p className="text-sm">✓ Token seems OK.</p>
          ) : (
            <>
              <p className="text-sm mb-1">{apiStatus.github_error?.message || 'Could not verify token.'} (Optional for public repos)</p>
              {renderErrorDetails(apiStatus.github_error, 'github')}
            </>
          )}
        </div>
      )}

      {/* Default LLM Provider Status (Blocking Error - uses defaultProviderStatus) */}
      {!defaultProviderOk && !dismissedBanners['defaultProviderError'] && (
         <div className="relative p-6 bg-red-100 border-l-4 border-red-500 rounded-r-lg shadow-md text-red-900">
           <button onClick={() => dismissBanner('defaultProviderError')} className="absolute top-2 right-2 text-inherit hover:opacity-70">&times;</button>
           {renderDefaultProviderErrorContent()}
         </div>
      )}

       {/* Other Enabled Provider Warnings (Non-Blocking - uses apiStatus) */}
       {defaultProviderOk && otherProviderErrors.length > 0 && (
          otherProviderErrors.map(errorInfo => (
            !dismissedBanners[errorInfo.id] && (
             <div key={errorInfo.id} className="relative p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded-r-lg shadow-sm text-yellow-900">
               <button onClick={() => dismissBanner(errorInfo.id)} className="absolute top-2 right-2 text-inherit hover:opacity-70">&times;</button>
               <h4 className="font-semibold text-sm">Configuration Warning: {errorInfo.id}</h4>
               <p className="text-sm mb-1">{errorInfo.message || `Could not verify provider '${errorInfo.id}'.`}</p>
               {renderErrorDetails(errorInfo, errorInfo.id)}
             </div>
            )
          ))
       )}

       {/* Success Message for Default Provider (Show if it's OK - uses defaultProviderStatus) */}
       {defaultProviderOk && !dismissedBanners['defaultProviderSuccess'] && (
          <div className={`relative p-3 border-l-4 rounded-r-lg shadow-sm ${defaultProviderError?.details?.env_override_warning ? 'bg-yellow-100 border-yellow-500 text-yellow-900' : 'bg-green-100 border-green-500 text-green-900'}`}>
             <button onClick={() => dismissBanner('defaultProviderSuccess')} className="absolute top-2 right-2 text-inherit hover:opacity-70">&times;</button>
             <p className="font-medium text-sm">✓ Default LLM Provider ({defaultProviderId || 'N/A'}) configuration seems OK.</p>
             {/* Show override warning if present for the default provider */}
             {defaultProviderError?.details?.env_override_warning && <p className="mt-1 text-xs font-semibold">Default LLM Key Warning: {defaultProviderError.details.env_override_warning}</p>}
             {/* Also show GitHub override warning here if GitHub itself was OK (uses apiStatus) */}
             {apiStatus.github_ok && apiStatus.github_error?.details?.env_override_warning && <p className="mt-1 text-xs font-semibold">GitHub Token Warning: {apiStatus.github_error.details.env_override_warning}</p>}
          </div>
       )}
    </div>
  );
};

export default StatusDisplay;
