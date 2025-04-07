import React from 'react';
import FileFilterControls from './FileFilterControls'; // Import the filter controls
import FileListView from './FileListView'; // Import the list view
// Removed duplicate import

const FileList = ({
  isLoadingFiles,
  error,
  availableFiles, // Changed from filteredFiles
  selectedFiles,  // Added
  searchTerm,
  setSearchTerm,
  isCaseSensitive,
  setIsCaseSensitive,
  filterMode, // Add filter mode state
  setFilterMode, // Add filter mode setter
  selectedScope, // Array of selected file paths
  handleScopeToggle, // Function to add/remove a single file
  handleSelectAllFiltered, // Function to add/remove all filtered files
  handleClearScope, // Function to clear the entire scope
  fileFilters,
  setFileFilters
}) => {

  // Removed internal calculation of availableFiles

  // Prepare the filter controls element to be passed down
  const filterControlsElement = (
    <FileFilterControls
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      isCaseSensitive={isCaseSensitive}
      setIsCaseSensitive={setIsCaseSensitive}
      filterMode={filterMode} // Pass filter mode state
      setFilterMode={setFilterMode} // Pass filter mode setter
      fileFilters={fileFilters}
      setFileFilters={setFileFilters}
      isLoadingFiles={isLoadingFiles}
      // Pass props needed for Select All button within filters
      handleSelectAllFiltered={handleSelectAllFiltered}
      availableFiles={availableFiles}
      selectedScope={selectedScope} // Pass selectedScope too for accurate button state
    />
  );

  // Removed DEBUG LOG

  return (
    <div className="mb-6 border-b pb-6">
      <h3 className="text-lg font-medium text-gray-800 mb-2">Select File Scope</h3>

      {/* Removed Filter Controls from here */}

      {/* Render File List View (Dual List) */}
      {/* Pass availableFiles and selectedFiles directly */}
      {/* Pass filter controls as children for the available column */}
      <FileListView
        childrenAvailableCol={filterControlsElement} // Pass filters as prop
        availableFiles={availableFiles} // Pass down available files
        selectedFiles={selectedFiles}   // Pass down selected files
        selectedScope={selectedScope}
        handleScopeToggle={handleScopeToggle}
        isLoadingFiles={isLoadingFiles}
        error={error}
        searchTerm={searchTerm}
        fileFilters={fileFilters}
        // Pass handlers needed by FileListView for inline buttons
        handleSelectAllFiltered={handleSelectAllFiltered}
        handleClearScope={handleClearScope}
      />
    </div>
  );
};

export default FileList;
