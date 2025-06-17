import React from 'react';

const ResultsDisplay = ({ analysisResults, progress, isLoadingAnalysis }) => {
  const hasResults = Array.isArray(analysisResults) && analysisResults.length > 0;
  const isFinished = !isLoadingAnalysis && (hasResults || progress.percentage === 100);

  if (!hasResults && !isLoadingAnalysis && !isFinished) {
    return null;
  }

  // Check if the first result indicates a combined mode final result
  const isCombinedFinal = analysisResults.length === 1 && analysisResults[0].hasOwnProperty('combined_response');

  const formatError = (error) => {
    if (typeof error === 'string' && error.includes('insufficient_quota')) {
      return 'Error: Insufficient quota. Please check your API plan and billing details.';
    }
    return `Error: ${error}`;
  };

  return (
    <div className="mt-8 border-t pt-6">
      {(isLoadingAnalysis || isFinished) && (
        <div className="mb-4">
          <div className="flex justify-between mb-1">
            <span className="text-base font-medium text-blue-700">{progress.message}</span>
            <span className="text-sm font-medium text-blue-700">{progress.total > 0 ? `${progress.current}/${progress.total}` : ''}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress.percentage}%` }}></div>
          </div>
          <div className="text-sm mt-2">
            <span className="text-green-600 font-semibold">Success: {progress.successCount}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-red-600 font-semibold">Errors: {progress.errorCount}</span>
          </div>
        </div>
      )}

      {hasResults && (
        <>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Processing Results:</h3>
          {/* Render Combined Mode Final Result */}
          {isCombinedFinal && (
            <div className="p-4 border border-gray-200 rounded-md bg-gray-50">
              <p className="font-medium text-gray-900">Combined Context Response:</p>
              {/* Display message from the combined result object if available */}
              {analysisResults[0].message && <p className="text-sm text-gray-600 mb-2">{analysisResults[0].message}</p>}
              {analysisResults[0].error ? (
                <p className="mt-1 text-sm text-red-600">Error: {analysisResults[0].error}</p>
              ) : (
                <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white p-2 rounded border border-gray-100">{analysisResults[0].combined_response || 'No response provided.'}</pre>
              )}
            </div>
          )}

          {/* Render Iterative Mode Partial Results */}
          {!isCombinedFinal && (
            <ul className="space-y-4">
              {analysisResults.map((result, index) => (
                // Assuming each item has at least 'path', and either 'response' or 'error'
                <li key={result.path || index} className="p-4 border border-gray-200 rounded-md bg-gray-50">
                  <p className="font-medium text-gray-900">{result.path || `Result ${index + 1}`}</p>
                  {result.error ? (
                    <p className="mt-1 text-sm text-red-600">{formatError(result.error)}</p>
                  ) : (
                    <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white p-2 rounded border border-gray-100">{result.response || 'Processing...'}</pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default ResultsDisplay;
