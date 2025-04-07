import { useState, useEffect, useCallback } from 'react';
import { minimatch } from 'minimatch';

// Define the backend API base URL (Consider moving to a shared config/constants file)
const API_BASE_URL = 'http://localhost:5001';

export function useFileManagement(owner, repo, branch, defaultFileFilters, isReadyToLoad) {
  // File Tree and Selection State
  const [fileTree, setFileTree] = useState([]); // The raw list from the API
  const [selectedScope, setSelectedScope] = useState([]); // Array of selected paths

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [isCaseSensitive, setIsCaseSensitive] = useState(false);
  const [filterMode, setFilterMode] = useState('startsWith'); // 'startsWith' or 'contains'
  const [fileFilters, setFileFilters] = useState(defaultFileFilters); // Initialize with defaults

  // Loading and Error State
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [error, setError] = useState(null);

  // Update fileFilters if the default changes after initial load
  useEffect(() => {
    setFileFilters(defaultFileFilters);
  }, [defaultFileFilters]);

  // --- File Tree Fetch ---
  useEffect(() => {
    // Define conditions for fetching: config loaded, provider OK, repo details present
    const shouldFetchFiles = isReadyToLoad && owner && repo && branch;

    if (!shouldFetchFiles) {
      // Clear file tree if conditions aren't met
      setFileTree([]);
      setSelectedScope([]); // Also clear scope when repo changes
      setError(null);
      return; // Exit effect if not ready to fetch
    }

    // Debounced fetch function
    const fetchFiles = async () => {
      console.log("Attempting to fetch files...");
      setIsLoadingFiles(true); setError(null); setFileTree([]); setSelectedScope([]); // Reset state
      try {
        const extensionsParam = fileFilters.map(ext => ext.startsWith('.') ? ext.substring(1) : ext).join(',');
        const url = `${API_BASE_URL}/api/files?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(branch)}&extensions=${encodeURIComponent(extensionsParam)}`;
        console.log("Fetching files with URL:", url);
        const response = await fetch(url);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error fetching files' }));
          throw new Error(`HTTP error! status: ${response.status} - ${errorData.error}`);
        }
        const data = await response.json();
        setFileTree(data.files || []);
      } catch (e) {
        console.error("Error fetching file tree:", e); setError(`Failed to fetch file tree: ${e.message}`); setFileTree([]);
      } finally { setIsLoadingFiles(false); }
    };

    const timerId = setTimeout(fetchFiles, 300);
    return () => clearTimeout(timerId);

  }, [isReadyToLoad, owner, repo, branch, fileFilters]); // Depend on readiness and config details

  // --- File List Calculations (Available vs Selected) ---

  // Calculate Selected Files (only based on selectedScope, ignores searchTerm)
  const selectedFiles = fileTree.filter(file => selectedScope.includes(file.path));

  // Calculate Available Files (start with fileTree, remove selected, then apply searchTerm)
  const availableFiles = fileTree
    .filter(file => !selectedScope.includes(file.path)) // Exclude already selected files
    .filter(file => { // Apply search term filter
      const term = searchTerm.trim();
      if (!term) return true; // No search term means file matches this filter

      // Ignore wildcard logic for now as per previous request
      // const hasWildcard = term.includes('*') || term.includes('?');
      // if (hasWildcard) { ... }

      const pathLower = file.path.toLowerCase();
      const termLower = term.toLowerCase();
      const comparisonPath = isCaseSensitive ? file.path : pathLower;
      const comparisonTerm = isCaseSensitive ? term : termLower;

      // Apply filter based on mode
      if (filterMode === 'contains') {
        return comparisonPath.includes(comparisonTerm);
      } else { // Default to 'startsWith'
        return comparisonPath.startsWith(comparisonTerm);
      }
    });


  // --- Scope Selection Handlers ---
  const handleScopeToggle = useCallback((filePath) => {
    setSelectedScope(prev => prev.includes(filePath) ? prev.filter(p => p !== filePath) : [...prev, filePath]);
  }, []);

  const handleSelectAllFiltered = useCallback(() => {
    // Operate on the currently *available* files after filtering
    const availablePathsToSelect = availableFiles.map(f => f.path);
    setSelectedScope(prev => [...new Set([...prev, ...availablePathsToSelect])]);
  }, [availableFiles, selectedScope]); // Depend on availableFiles now

  const handleClearScope = useCallback(() => {
    setSelectedScope([]);
  }, []);

  return {
    // File State
    fileTree, // Raw tree (might be useful for debugging or future features)
    availableFiles, // Files available for selection (filtered by search)
    selectedFiles,  // Files currently selected (unaffected by search)
    selectedScope,  // Array of selected paths

    // Filter State & Setters
    searchTerm, setSearchTerm,
    isCaseSensitive, setIsCaseSensitive,
    filterMode, setFilterMode, // Add filter mode state and setter
    fileFilters, setFileFilters,

    // Loading & Error State
    isLoadingFiles,
    error, // File fetching error

    // Scope Handlers
    handleScopeToggle,
    handleSelectAllFiltered,
    handleClearScope,
  };
}
