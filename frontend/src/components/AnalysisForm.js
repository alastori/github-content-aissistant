import React, { useState } from 'react';

const AnalysisForm = ({
  userPrompt, setUserPrompt,
  // analysisMode, setAnalysisMode, // Removed - Handled in page.js
  availableProviders, models, // Use availableProviders
  selectedProviderId, setSelectedProviderId,
  selectedModelId, setSelectedModelId
}) => {
  const [showLLMOptions, setShowLLMOptions] = useState(false); // State for progressive disclosure

  return (
    <div className="mb-6 border-b pb-6"> {/* Wrap in div and add border */}
      <h3 className="text-lg font-medium text-gray-800 mb-3">Define Analysis Task</h3>
      {/* User Prompt Input */}
      <div className="mb-4"> {/* Increased margin */}
        <label htmlFor="userPrompt" className="block text-sm font-medium text-gray-700 mb-1">
          Enter Your Prompt / Query:
        </label>
        <textarea
          id="userPrompt"
          rows="3"
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="e.g., 'Analyze the structure of these release notes...', 'Which files are impacted by adding function X?', 'Summarize these documents...'"
       />
        </div>

        {/* LLM Selection Section - Simplified */}
        {/* Removed "LLM Configuration" heading */}
        {/* Display Current LLM Selection + Change Button */}
       <div className="mb-4">
         <span className="text-sm text-gray-600 mr-2">
           LLM: <span className="font-medium text-gray-800">{availableProviders.find(p => p.id === selectedProviderId)?.name || 'N/A'} / {models.find(m => m.id === selectedModelId)?.name || 'N/A'}</span>
         </span>
         <button
           onClick={() => setShowLLMOptions(!showLLMOptions)}
           className="text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none underline" /* Added underline */
         >
           ({showLLMOptions ? 'Hide Options' : 'Change'}) {/* Removed arrows, added parentheses */}
         </button>
       </div>

       {/* LLM Provider and Model Selection Dropdowns - Conditionally Rendered */}
       {showLLMOptions && (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border border-gray-200 rounded-md bg-gray-50">
           <div>
             <label htmlFor="providerSelect" className="block text-xs font-medium text-gray-600 mb-1">
               LLM Provider:
             </label>
             <select
               id="providerSelect"
               value={selectedProviderId}
               onChange={(e) => setSelectedProviderId(e.target.value)}
               className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
               disabled={availableProviders.length === 0} // Disable if no providers are available/configured
             >
               {availableProviders.length === 0 && <option>No configured providers found...</option>}
               {availableProviders.map(provider => (
                 <option key={provider.id} value={provider.id}>
                   {provider.name} {/* Display user-friendly name */}
                 </option>
               ))}
             </select>
           </div>
           <div>
             <label htmlFor="modelSelect" className="block text-xs font-medium text-gray-600 mb-1">
               Model:
             </label>
             <select
               id="modelSelect"
               value={selectedModelId}
               onChange={(e) => setSelectedModelId(e.target.value)}
               className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sm"
               disabled={models.length === 0 || !selectedProviderId} // Also disable if no provider selected
             >
               {models.length === 0 && <option>{selectedProviderId ? 'No models available' : 'Select provider...'}</option>}
               {models.map(model => (
                 <option key={model.id} value={model.id}>
                   {model.name} {/* Display user-friendly name */}
                 </option>
               ))}
             </select>
           </div>
         </div>
       )}
     </div>
   );
 };

 export default AnalysisForm;
