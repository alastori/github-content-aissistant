import React, { useState, useEffect } from 'react';

const FileFilterControls = ({
  searchTerm,
  setSearchTerm,
  isCaseSensitive,
  setIsCaseSensitive,
  filterMode, // Add filter mode state
  setFilterMode, // Add filter mode setter
  fileFilters,
   setFileFilters,
   isLoadingFiles,
   // Add props needed for Select All button
   handleSelectAllFiltered,
   availableFiles, // Need the list of *currently* available files
   selectedScope // Need to check if all available are selected
 }) => {
   const [localFiltersInput, setLocalFiltersInput] = useState('');
   const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

   // Determine if all currently *available* files are selected
   // Note: This logic might be slightly different from the parent's `allFilteredSelected`
   // if we only want to select/deselect based on the *available* list view.
   // Let's stick to selecting *all* filtered files for simplicity for now.
   // We might need to adjust handleSelectAllFiltered logic in the hook if needed.
   const allAvailableFilteredSelected = availableFiles.length > 0 && availableFiles.every(f => selectedScope.includes(f.path));

  useEffect(() => {
    setLocalFiltersInput(fileFilters.join(', '));
  }, [fileFilters]);

  const handleFilterInputChange = (event) => {
    setLocalFiltersInput(event.target.value);
  };

  const applyFilters = () => {
    const newFilters = localFiltersInput
      .split(',')
      .map(ext => ext.trim())
      .filter(ext => ext.length > 0)
      .map(ext => ext.startsWith('.') ? ext : `.${ext}`);
    if (JSON.stringify(newFilters) !== JSON.stringify(fileFilters)) {
      console.log("Applying new file filters:", newFilters);
      setFileFilters(newFilters);
    }
  };

  const handleFilterInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      applyFilters();
      event.target.blur();
    }
  };

  return (
    <div className="mb-4"> {/* Container for all filters */}
      {/* Display Current Filters + Change Button - MOVED UP */}
      <div className="mb-2">
        <span className="text-sm text-gray-600 mr-2">
          File Extensions: <span className="font-medium text-gray-800">{fileFilters.join(', ') || '(none)'}</span>
        </span>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none underline"
        >
          ({showAdvancedFilters ? 'Hide Options' : 'Change'})
        </button>
      </div>

      {/* File Extension Filter Input - Conditionally Rendered - MOVED UP */}
      {showAdvancedFilters && (
        <div className="mb-2 p-3 border border-gray-200 rounded-md bg-gray-50">
          <label htmlFor="file-extension-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Extensions (comma-separated):
          </label>
          <input
            type="text"
            id="file-extension-filter"
            placeholder=".md, .txt, .rst"
            className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            value={localFiltersInput}
            onChange={handleFilterInputChange}
            onBlur={applyFilters}
            onKeyDown={handleFilterInputKeyDown}
          />
        </div>
      )}

      {/* Search/Filter Input and Toggles */}
      <div className="flex items-center space-x-2 mb-1">
        <input
          type="text"
          placeholder="Filter files by path/name"
          className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {/* Stacked Filter Mode Toggle Buttons */}
        <div className="flex flex-col space-y-1"> {/* Removed justify-center */}
          <button
            onClick={() => setFilterMode('startsWith')}
            title="Match paths starting with the text"
            // Reduced font size, removed vertical padding
            className={`px-2 py-0 border text-[11px] rounded ${filterMode === 'startsWith' ? 'bg-indigo-100 border-indigo-300' : 'border-gray-300 hover:bg-gray-100'}`}
          >
            Starts With
          </button>
          <button
            onClick={() => setFilterMode('contains')}
            title="Match paths containing the text"
             // Reduced font size, removed vertical padding
            className={`px-2 py-0 border text-[11px] rounded ${filterMode === 'contains' ? 'bg-indigo-100 border-indigo-300' : 'border-gray-300 hover:bg-gray-100'}`}
          >
            Contains
          </button>
        </div>
        {/* Case Sensitive Toggle Button - Moved to end */}
        <button
          onClick={() => setIsCaseSensitive(!isCaseSensitive)}
          title="Toggle Case Sensitive"
          className={`p-2 border rounded ${isCaseSensitive ? 'bg-indigo-100 border-indigo-300' : 'border-gray-300 hover:bg-gray-100'}`}
        >
          Aa
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-2">
         Type to filter files. {filterMode === 'startsWith' ? 'Matches paths starting with your text.' : 'Matches paths containing your text.'}
       </p>

       {/* Removed Select All Button from here */}
     </div>
   );
};

export default FileFilterControls;
