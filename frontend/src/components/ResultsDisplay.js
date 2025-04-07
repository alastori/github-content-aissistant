import React from 'react';

const ResultsDisplay = ({ analysisResults }) => {
  // analysisResults is now expected to be an array of partial results
  // or potentially an array with a single item for combined mode final result.

  // Check if it's an array and has items
  const hasResults = Array.isArray(analysisResults) && analysisResults.length > 0;

  if (!hasResults) {
    // Optionally show a message if analysis ran but produced no results/errors yet
    // Or just return null if nothing should be shown until results arrive.
    // Let's return null for now to avoid showing the fallback message prematurely.
    return null;
  }

  // Check if the first result indicates a combined mode final result
  const isCombinedFinal = analysisResults.length === 1 && analysisResults[0].hasOwnProperty('combined_response');

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Processing Results:</h3>
      {/* Removed the overall message display, as messages come per item or via progress */}

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
                  <p className="mt-1 text-sm text-red-600">Error: {result.error}</p>
                ) : (
                  <pre className="mt-2 text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white p-2 rounded border border-gray-100">{result.response || 'Processing...'}</pre>
                )}
              </li>
            ))}
        </ul>
      )}
      {/* Removed the old fallback message */}
     </div>
  );
};

export default ResultsDisplay;
