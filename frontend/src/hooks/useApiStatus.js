import { useState, useEffect } from 'react';

// Define the backend API base URL (Consider moving to a shared config/constants file)
const API_BASE_URL = 'http://localhost:5001';

export function useApiStatus() {
  const [apiStatus, setApiStatus] = useState({
    github_ok: null,
    github_error: null,
    provider_statuses: {}, // Store status for all providers { [provider_id]: { ok: bool, error: obj } }
    loading: true, // Loading status for the initial /api/status call
    error: null // General error fetching status
  });

  useEffect(() => {
    let isMounted = true; // Flag to prevent state update on unmounted component

    const fetchStatus = async () => {
      // Reset status before fetching, keep loading true until fetch completes or errors
      setApiStatus({
        github_ok: null,
        github_error: null,
        provider_statuses: {},
        loading: true,
        error: null
      });
      try {
        const response = await fetch(`${API_BASE_URL}/api/status`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown status error' }));
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.error}`);
        }
        const data = await response.json();

        if (isMounted) {
          setApiStatus({
            github_ok: data.github_ok,
            github_error: data.github_error,
            provider_statuses: data.provider_statuses || {},
            loading: false, // Set loading false only on success
            error: null
          });
        }
      } catch (e) {
        console.error("Error fetching API status:", e);
        if (isMounted) {
          setApiStatus({
            github_ok: null,
            github_error: null,
            provider_statuses: {},
            loading: false, // Set loading false even on error
            error: `Failed to fetch API status: ${e.message}`
          });
        }
      }
    };

    fetchStatus();

    // Cleanup function to set isMounted to false when the component unmounts
    return () => {
      isMounted = false;
    };
  }, []); // Run only once on mount

  return apiStatus;
}
