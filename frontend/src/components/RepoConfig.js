import React, { useState } from 'react';

// Removed handleLoadFiles, kept isLoadingFiles for potential visual feedback
const RepoConfig = ({ owner, setOwner, repo, setRepo, branch, setBranch, isLoadingFiles }) => {
  const [showInputs, setShowInputs] = useState(false); // State for progressive disclosure

  return (
    <div className="mb-6 border-b pb-6">
      {/* Display Current Repo + Change Button */}
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">
          Repository: <span className="font-normal text-gray-600">{owner}/{repo} ({branch})</span>
        </h3>
        <button
          onClick={() => setShowInputs(!showInputs)}
          className="text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none underline"
        >
          ({showInputs ? 'Hide Options' : 'Change'})
        </button>
      </div>

      {/* Conditionally Render Inputs */}
      {showInputs && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 p-4 border border-gray-200 rounded-md bg-gray-50">
          <div>
            <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-1">Owner:</label>
          <input
            type="text"
            id="owner"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="e.g., pingcap"
        />
      </div>
      <div>
        <label htmlFor="repo" className="block text-sm font-medium text-gray-700 mb-1">Repository:</label>
        <input
          type="text"
          id="repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="e.g., docs"
        />
      </div>
      <div>
        <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-1">Branch:</label>
        <input
          type="text"
          id="branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="e.g., master"
        />
          </div> {/* Close Branch Input Div */}
        </div> /* Close Grid Div */
      )}
      {/* Optional: Show loading indicator if inputs are hidden but files are loading */}
      {!showInputs && isLoadingFiles && (
        <div className="text-sm text-gray-500 animate-pulse">Loading files for {owner}/{repo}...</div>
      )}
    </div>
  );
};

export default RepoConfig;
