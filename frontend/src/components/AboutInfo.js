'use client'; // Required for hooks like useState, useEffect

import React, { useState, useEffect } from 'react';
import packageJson from '../../package.json'; // Import package.json directly

const AboutInfo = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [backendVersion, setBackendVersion] = useState('Loading...');
  const [error, setError] = useState(null);

  const frontendVersion = packageJson.version;
  const repoUrl = 'https://github.com/alastori/github-content-aissistant';

  useEffect(() => {
    if (isExpanded) {
      setError(null); // Clear previous errors on expand
      setBackendVersion('Loading...'); // Reset on expand
      fetch('/api/version') // Assuming backend runs on the same origin or is proxied
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          setBackendVersion(data.backend_version || 'N/A');
        })
        .catch(err => {
          console.error("Failed to fetch backend version:", err);
          setError('Could not load backend version.');
          setBackendVersion('Error');
        });
    }
  }, [isExpanded]); // Re-fetch only when isExpanded changes to true

  return (
    <div className="mt-4 text-sm text-gray-500">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer hover:text-gray-700 focus:outline-none"
        aria-expanded={isExpanded}
        aria-controls="about-details"
      >
        About {isExpanded ? '[-]' : '[+]'}
      </button>
      {isExpanded && (
        <div id="about-details" className="mt-2 pl-4 border-l border-gray-300">
          <p>Frontend Version: {frontendVersion}</p>
          <p>Backend Version: {error || backendVersion}</p>
          <p>
            Repository: <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{repoUrl}</a>
          </p>
        </div>
      )}
    </div>
  );
};

export default AboutInfo;
