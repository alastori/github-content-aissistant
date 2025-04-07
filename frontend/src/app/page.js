'use client'; // Required for useState, useEffect

import React from 'react'; // Import React

// Import Hook
import { useAnalysisManager } from '../hooks/useAnalysisManager';

// Import Components
import StatusDisplay from '../components/StatusDisplay';
import RepoConfig from '../components/RepoConfig';
import AnalysisForm from '../components/AnalysisForm';
import FileList from '../components/FileList';
import ResultsDisplay from '../components/ResultsDisplay';
import AboutInfo from '../components/AboutInfo'; // Import the new component

// Helper component for Progress Display (can be moved to components later if desired)
const ProgressDisplay = ({ progressMessage }) => {
  if (!progressMessage) return null;
  return (
    <div className="w-full max-w-5xl p-3 mb-4 text-center bg-blue-100 border border-blue-200 rounded-lg shadow-sm">
      <p className="text-blue-700 text-sm animate-pulse">{progressMessage}</p>
    </div>
  );
};


export default function Home() {
  // Use the custom hook to manage state and logic
  const {
    owner, setOwner,
    repo, setRepo,
    branch, setBranch,
    // fileTree, // No longer directly needed here if FileList uses filteredFiles
    userPrompt, setUserPrompt,
    analysisMode, setAnalysisMode,
    selectedScope,
    analysisResults,
    isLoadingFiles,
    isLoadingAnalysis,
    error, // General error from hook (e.g., file fetch)
    analysisError, // Analysis-specific error from hook
    searchTerm, setSearchTerm,
     isCaseSensitive, setIsCaseSensitive,
     filterMode, setFilterMode, // Destructure filter mode
     apiStatus,
     // LLM Selection State and Handlers
     availableProviders, // Use the filtered list for the UI
     models,
     selectedProviderId, setSelectedProviderId,
     selectedModelId, setSelectedModelId,
     // defaultProviderId, // Get the default provider ID from the hook - REMOVED, use defaultProviderStatus
     defaultProviderStatus, // Get the detailed status object
     // End LLM Selection
     progressMessage,
     availableFiles, // Changed from filteredFiles
     selectedFiles,  // Added
      handleScopeToggle,
      handleSelectAllFiltered,
      handleClearScope, // Add handleClearScope here
      handleAnalyze,
      handleCancel,
      // Destructure file filter state and setter
      fileFilters, setFileFilters,
      // REMOVED handleLoadFiles, filesRequested
    } = useAnalysisManager();

   // --- Render ---
   return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 sm:p-12 md:p-24 bg-gray-50">
       {/* Removed Header Div from here - Moved to layout.js */}

        {/* Pass the correct props to StatusDisplay */}
        <StatusDisplay apiStatus={apiStatus} defaultProviderStatus={defaultProviderStatus} />

        {/* Conditionally render the main application UI */}
        {/* Use defaultProviderStatus for the condition */}
        {!defaultProviderStatus.isLoading && defaultProviderStatus.ok && (
         <div className="w-full max-w-5xl bg-white p-6 rounded-lg shadow-md mb-8">
            {/* Section 1: Repo Config */}
            <RepoConfig
              owner={owner} setOwner={setOwner}
              repo={repo} setRepo={setRepo}
               branch={branch} setBranch={setBranch}
               // Pass down loading state (optional, for indicator)
               isLoadingFiles={isLoadingFiles}
               // REMOVED handleLoadFiles
             />

             {/* Render Sections 2, 3, 4+ based only on provider status */}
             <>
               {/* Section 2: Define Analysis Task (Prompt + LLM Config) */}
               <AnalysisForm
                  userPrompt={userPrompt} setUserPrompt={setUserPrompt}
                  // Pass necessary props for LLM config part
                  availableProviders={availableProviders}
                  models={models}
                  selectedProviderId={selectedProviderId} setSelectedProviderId={setSelectedProviderId}
                  selectedModelId={selectedModelId} setSelectedModelId={setSelectedModelId}
               />

                {/* Section 3: Select File Scope */}
                <FileList
                  isLoadingFiles={isLoadingFiles}
                  error={error} // Pass general file loading error
                  availableFiles={availableFiles} // Pass the available list
                  selectedFiles={selectedFiles}   // Pass the selected list
                  searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                 isCaseSensitive={isCaseSensitive} setIsCaseSensitive={setIsCaseSensitive}
                 filterMode={filterMode} setFilterMode={setFilterMode} // Pass filter mode props
                 selectedScope={selectedScope}
                 handleScopeToggle={handleScopeToggle}
                 handleSelectAllFiltered={handleSelectAllFiltered}
                 handleClearScope={handleClearScope} // Pass the clear scope handler
                 // Pass file filter props
                 fileFilters={fileFilters}
                 setFileFilters={setFileFilters}
               />

               {/* Section 4: Analysis Mode */}
               <div className="mb-6 border-b pb-6">
                 <h3 className="text-lg font-medium text-gray-800 mb-3">Analysis Mode</h3>
                 <div className="flex items-center space-x-4 pl-2">
                   {/* Combined Context */}
                   <div className="flex items-center">
                     <input
                       id="mode-combined"
                       name="analysisMode"
                       type="radio"
                       value="combined"
                       checked={analysisMode === 'combined'}
                       onChange={(e) => setAnalysisMode(e.target.value)}
                       className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                     />
                     <label htmlFor="mode-combined" className="ml-2 block text-sm text-gray-900">
                       Combined Context (Analyze selected files together)
                     </label>
                   </div>
                   {/* Iterative */}
                   <div className="flex items-center">
                     <input
                       id="mode-iterative"
                       name="analysisMode"
                       type="radio"
                       value="iterative"
                       checked={analysisMode === 'iterative'}
                       onChange={(e) => setAnalysisMode(e.target.value)}
                       className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                     />
                     <label htmlFor="mode-iterative" className="ml-2 block text-sm text-gray-900">
                       Iterative (Analyze each file separately)
                     </label>
                   </div>
                 </div>
               </div>

               {/* Section 5: Action Buttons & Progress */}
               <div className="mt-8 pt-6 border-t text-center space-x-4">
                 {!isLoadingAnalysis ? (
                   <button
                     onClick={handleAnalyze}
                     // Corrected disabled logic: check essential conditions
                     disabled={isLoadingFiles || selectedScope.length === 0 || !userPrompt.trim() || !selectedProviderId || !selectedModelId || !owner || !repo || !branch}
                     className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     Process Request
                   </button>
                 ) : (
                   <button
                     onClick={handleCancel}
                     className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                   >
                     Cancel Processing
                   </button>
                 )}
               </div>

               {/* Progress Display */}
               <ProgressDisplay progressMessage={progressMessage} />

               {/* Display Analysis Errors */}
               {analysisError && (
                  <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                     <p>Error: {analysisError}</p>
                  </div>
               )}

                {/* Results Display - now expects an array */}
                <ResultsDisplay analysisResults={analysisResults} />
              </>
            </div>
          )}

        {/* Add AboutInfo component at the bottom */}
        <AboutInfo />

        </main>
    );
 }
