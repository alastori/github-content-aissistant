import React from 'react';

const FileListView = ({
  availableFiles, // Changed from filteredFiles
  selectedFiles,  // Added
  selectedScope,
  handleScopeToggle,
  isLoadingFiles,
  error,
  searchTerm,
  fileFilters,
  childrenAvailableCol, // Prop for content above available list (filters)
  // childrenSelectedCol, // No longer needed as button is rendered inline
  // Add handlers for inline buttons
  handleSelectAllFiltered,
  handleClearScope
}) => {

  // Removed internal calculation of availableFiles and selectedFiles

  // Removed DEBUG LOG

  // Renders one list column (Available or Selected)
  const renderListColumn = (files, listType, children) => (
    // Add left border and padding only to the selected column
    <div className={`flex flex-col ${listType === 'selected' ? 'border-l border-gray-200 pl-4' : ''}`}> {/* Column container */}
      {/* Title Row with inline buttons - Moved to top */}
      <div className="flex justify-between items-center mb-2 px-1">
        <h4 className="text-sm font-semibold text-gray-700">
          {listType === 'available' ? `Available (${availableFiles.length})` : `Selected (${selectedFiles.length})`}
        </h4>
        {listType === 'available' && (
          <button
            onClick={handleSelectAllFiltered}
            title="Add all available files shown to selection"
            className="px-2 py-0.5 border border-gray-300 rounded text-xs hover:bg-gray-100 disabled:opacity-50"
            disabled={isLoadingFiles || availableFiles.length === 0}
          >
            Select All
          </button>
        )}
        {listType === 'selected' && (
          <button
            onClick={handleClearScope}
            title="Remove all files from selection"
            className="px-2 py-0.5 border border-gray-300 rounded text-xs hover:bg-gray-100 disabled:opacity-50"
            disabled={isLoadingFiles || selectedScope.length === 0}
          >
            Clear
          </button>
        )}
      </div>

      {/* Render children passed for ABOVE this column (e.g., filters for available) - Moved below title */}
      {listType === 'available' && childrenAvailableCol}
      {/* Removed placeholder div */}

      {/* Apply height, overflow, and flex-grow to this div */}
      <div className="border border-gray-300 rounded-md h-60 overflow-y-auto p-2 bg-white mb-2 flex-grow">
        {files.length > 0 ? (
          files.map(file => (
            <div
              key={file.path}
              onClick={() => handleScopeToggle(file.path)}
              className="text-sm text-gray-800 truncate cursor-pointer hover:bg-indigo-50 rounded px-1 py-0.5"
              title={file.path}
            >
              {file.path}
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 italic px-1 pt-1"> {/* Added padding top */}
            {listType === 'available'
              ? (searchTerm ? 'No files match filter' : (availableFiles.length === 0 && selectedFiles.length > 0 ? 'All matching files selected' : 'No files found')) // Adjusted logic
              : 'No files selected'}
          </p>
        )}
      </div>
      {/* Removed rendering of children prop below the list */}
    </div>
  );

  // Loading and Error states take precedence
  if (isLoadingFiles) {
    return <div className="h-60 flex items-center justify-center text-gray-500 text-sm p-4">Loading files...</div>;
  }
  if (error) {
    return <div className="h-60 flex items-center justify-center text-red-600 text-sm p-4">{error}</div>;
  }

  // Handle case where initial file list is empty even without search/filter errors
  // Check both lists now
  if (availableFiles.length === 0 && selectedFiles.length === 0 && !searchTerm && !error) {
     return (
        <div className="h-60 flex items-center justify-center text-gray-500 text-sm p-4 text-center">
          No files found matching the extensions ({fileFilters?.join(', ') || 'none'}) in the specified repository/branch. {/* Added optional chaining */}
        </div>
     )
  }

  return (
    // Use a grid for the two columns, keep gap, remove items-end
    <div className="grid grid-cols-2 gap-4">
      {/* Available Files Column */}
      {renderListColumn(availableFiles, 'available', null)}

      {/* Selected Files Column */}
      {renderListColumn(selectedFiles, 'selected', null)}
    </div>
  );
};

export default FileListView;
