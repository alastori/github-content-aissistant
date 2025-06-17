import { useState, useEffect } from 'react'; // Keep core hooks
// Import the new custom hooks
import { useApiStatus } from './useApiStatus';
import { useAppConfig } from './useAppConfig';
import { useFileManagement } from './useFileManagement';
import { useAnalysisExecution } from './useAnalysisExecution';

export function useAnalysisManager() {
  // 1. API Status Hook
  const apiStatus = useApiStatus();

  // 2. App Config Hook (depends on apiStatus)
  const {
    owner, setOwner,
    repo, setRepo,
    branch, setBranch,
    defaultFileFilters,
    allProviders,
    availableProviders,
    models,
    selectedProviderId, setSelectedProviderId,
    selectedModelId, setSelectedModelId,
    defaultProviderStatus,
    configError, // Expose config error if needed
  } = useAppConfig(apiStatus);

  // 3. File Management Hook (depends on App Config state)
  const {
    fileTree,
    availableFiles, // Changed from filteredFiles
    selectedFiles,  // Added
    selectedScope,
    isLoadingFiles,
    error: fileError, // Rename to avoid conflict with configError
    searchTerm, setSearchTerm,
    isCaseSensitive, setIsCaseSensitive,
    filterMode, setFilterMode, // Add filter mode
    fileFilters, setFileFilters,
    handleScopeToggle,
    handleSelectAllFiltered,
    handleClearScope,
  } = useFileManagement(
    owner,
    repo,
    branch,
    defaultFileFilters,
     !defaultProviderStatus.isLoading && defaultProviderStatus.ok // isReadyToLoad flag
   );

   // --- Manage state not covered by sub-hooks ---
   // Declare these *before* they are used in useAnalysisExecution
   const [userPrompt, setUserPrompt] = useState('');
   const [analysisMode, setAnalysisMode] = useState('iterative');

   // 4. Analysis Execution Hook (depends on various states)
   const {
     isLoadingAnalysis,
    analysisResults,
    analysisError,
    progress,
    handleAnalyze,
    handleCancel,
   } = useAnalysisExecution(
     owner, repo, branch, selectedScope,
     userPrompt, // Pass the actual state variable
     analysisMode, // Pass the actual state variable
     selectedProviderId, selectedModelId, allProviders, apiStatus.provider_statuses
   );

   // --- Combine and return all necessary state and handlers ---
  return {
    // From useApiStatus (passed directly or via useAppConfig)
    apiStatus, // Needed for StatusDisplay

    // From useAppConfig
    owner, setOwner,
    repo, setRepo,
    branch, setBranch,
    availableProviders,
    models,
    selectedProviderId, setSelectedProviderId,
    selectedModelId, setSelectedModelId,
    defaultProviderStatus, // Needed for StatusDisplay and conditional rendering
    configError, // Optional: for displaying config load errors

    // From useFileManagement
    // fileTree, // Raw tree might not be needed by page.js directly
    availableFiles, // Changed from filteredFiles
    selectedFiles,  // Added
    selectedScope, // Needed for FileList -> FileListView and handleAnalyze
    isLoadingFiles, // Needed for RepoConfig, FileList -> FileListView
    error: fileError, // Pass file fetching error
    searchTerm, setSearchTerm, // Needed for FileList -> FileFilterControls
    isCaseSensitive, setIsCaseSensitive, // Needed for FileList -> FileFilterControls
    filterMode, setFilterMode, // Pass filter mode state and setter
    fileFilters, setFileFilters, // Needed for FileList -> FileFilterControls
    handleScopeToggle, // Needed for FileList -> FileListView
    handleSelectAllFiltered, // Needed for FileList -> FileFilterControls
    handleClearScope, // Needed for FileList -> FileListView

    // From useAnalysisExecution
    isLoadingAnalysis, // Needed for buttons and progress
    analysisResults, // Needed for ResultsDisplay
    analysisError, // Needed for error display
    progress, // Needed for ProgressDisplay
    handleAnalyze, // Needed for Process button
    handleCancel, // Needed for Cancel button

    // State managed directly here
    userPrompt, setUserPrompt, // Needed for AnalysisForm
    analysisMode, setAnalysisMode, // Needed for AnalysisForm / page.js
  };
}
