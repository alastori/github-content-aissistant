import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';

// Define the backend API base URL (Consider moving to a shared config/constants file)
const API_BASE_URL = 'http://localhost:5001';

export function useAnalysisExecution(
    owner, repo, branch, selectedScope, userPrompt, analysisMode,
    selectedProviderId, selectedModelId, allProviders, providerStatuses
) {
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisError, setAnalysisError] = useState(null);
  const [progress, setProgress] = useState({ message: '', percentage: 0, current: 0, total: 0, successCount: 0, errorCount: 0 });
  const [currentTaskId, setCurrentTaskId] = useState(null);

  const socketRef = useRef(null);
  const disconnectExpectedRef = useRef(false);

  // --- Analysis Submission ---
  const handleAnalyze = useCallback(async () => {
    // Find the full config for the selected provider
    const providerConfig = allProviders.find(p => p.id === selectedProviderId);

    // Basic Validations (already performed in page.js, but good practice)
    if (!providerConfig) { setAnalysisError("Please select a valid provider."); return; }
    if (!selectedModelId) { setAnalysisError("Please select a model."); return; }
    if (!userPrompt.trim()) { setAnalysisError("Please enter a prompt/query."); return; }
    if (selectedScope.length === 0) { setAnalysisError("Please select at least one file for the scope."); return; }
    if (!owner.trim() || !repo.trim() || !branch.trim()) { setAnalysisError("Please ensure Owner, Repository, and Branch are set."); return; }

    // Check status for the *selected* provider before submitting
    if (!providerStatuses[selectedProviderId]?.ok) {
        setAnalysisError(`Selected provider '${providerConfig.name}' is not configured correctly. Check API key or backend logs.`);
        return;
    }

    // Reset state for new analysis
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    setAnalysisResults([]);
    setProgress({ message: 'Starting analysis...', percentage: 0, current: 0, total: 0, successCount: 0, errorCount: 0 });
    setCurrentTaskId(null);
    disconnectExpectedRef.current = false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            owner, repo, branch, scope: selectedScope, user_prompt: userPrompt, analysis_mode: analysisMode,
            provider_id: selectedProviderId,
            model_id: selectedModelId
        }),
      });
      const data = await response.json();
      if (!response.ok) { throw new Error(data.error || `Failed to start analysis: ${response.status}`); }
      if (data.task_id) {
        setCurrentTaskId(data.task_id); // Set task ID to trigger socket connection useEffect
      } else {
        throw new Error('Backend did not return a task ID.');
      }
    } catch (e) {
      console.error("Error starting analysis:", e);
      setAnalysisError(`Failed to start analysis: ${e.message}`);
      setIsLoadingAnalysis(false);
      setProgressMessage('');
    }
  // Add all dependencies needed for the submission logic
  }, [
      userPrompt, selectedScope, owner, repo, branch, analysisMode,
      allProviders, selectedProviderId, selectedModelId, providerStatuses
  ]);

  // --- Analysis Cancellation ---
  const handleCancel = useCallback(() => {
    if (socketRef.current && currentTaskId) {
      console.log(`Emitting cancel_task for ${currentTaskId}`);
      disconnectExpectedRef.current = true; // Expect disconnect after cancel
      socketRef.current.emit('cancel_task', { task_id: currentTaskId });
      setProgressMessage('Attempting to cancel...');
      // Don't immediately set isLoadingAnalysis false, wait for task_finished event
    } else {
       console.warn("Cannot cancel: No active socket or task ID.");
       // If somehow loading is true but no task ID, reset loading state
       if (isLoadingAnalysis && !currentTaskId) {
           setIsLoadingAnalysis(false);
           setProgressMessage('');
       }
    }
  }, [currentTaskId, isLoadingAnalysis]); // Depend on task ID and loading state

  // --- SocketIO Connection and Event Handling ---
  useEffect(() => {
    // Only connect if we have a task ID and are currently loading analysis
    if (currentTaskId && isLoadingAnalysis) {
      // Disconnect previous socket if any
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      disconnectExpectedRef.current = false; // Reset flag for new connection
      console.log(`Connecting SocketIO for task ${currentTaskId}...`);
      socketRef.current = io(API_BASE_URL); // Connect to backend
      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        socket.emit('join', { task_id: currentTaskId }); // Join room for this task
        setProgress(prev => ({ ...prev, message: 'Connected, waiting for progress...' }));
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        // Only treat as error if disconnect was unexpected
        if (!disconnectExpectedRef.current && isLoadingAnalysis) {
           console.warn('Unexpected disconnect while analysis was in progress.');
           setAnalysisError('Connection lost during analysis. Please check backend server.');
           // Reset state as task is likely interrupted
           setIsLoadingAnalysis(false);
           setCurrentTaskId(null);
           setProgressMessage('');
        }
        disconnectExpectedRef.current = false; // Reset flag after handling
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        setAnalysisError(`Failed to connect for progress updates: ${err.message}`);
        setIsLoadingAnalysis(false);
        setCurrentTaskId(null);
        setProgressMessage('');
      });

      // --- Task-Specific Event Handlers ---
      socket.on('progress_update', (data) => {
        if (data.message) {
          setProgress(prev => ({ ...prev, message: data.message }));
        } else if (data.current_file) {
          const percent = data.total_files > 0 ? Math.round(((data.current_index + 1) / data.total_files) * 100) : 0;
          setProgress(prev => ({
            ...prev,
            message: `Processing: ${data.current_file}`,
            percentage: percent,
            current: data.current_index + 1,
            total: data.total_files
          }));
        }
      });

      socket.on('partial_result', (data) => {
        setAnalysisResults(prev => [...prev, data]);
        if (data.error) {
          setProgress(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
        } else {
          setProgress(prev => ({ ...prev, successCount: prev.successCount + 1 }));
        }
      });

      socket.on('final_result', (data) => {
        // In combined mode, this might be the only result
        setAnalysisResults([data]); // Replace previous results
      });

      socket.on('task_error', (data) => {
        setAnalysisError(`Analysis task failed: ${data.error}`);
        // Keep loading false, set by task_finished
      });

      socket.on('task_finished', (data) => {
        if (data.task_id === currentTaskId) {
          console.log('Task finished event received:', data);
          setIsLoadingAnalysis(false);
          setCurrentTaskId(null); // Clear task ID
          // Use a timeout to ensure the final result has been processed
          setTimeout(() => {
            setAnalysisResults(prevResults => {
              const hasErrors = prevResults.some(r => r.error) || analysisError;
              let finalMessage = 'Analysis complete.';
              if (data.status === 'cancelled') {
                finalMessage = 'Analysis cancelled.';
              } else if (hasErrors) {
                finalMessage = 'Analysis complete with errors.';
              }
              setProgress(prev => ({ ...prev, message: finalMessage, percentage: 100 }));
              return prevResults;
            });
          }, 100);
          disconnectExpectedRef.current = true; // Expect disconnect after finish
          socket.disconnect();
        }
      });

      socket.on('task_cancelled_ack', (data) => {
         if (data.task_id === currentTaskId) {
             setProgressMessage('Cancellation request acknowledged...');
             // Still wait for task_finished event to fully stop loading state
         }
      });

      // Cleanup function for this effect
      return () => {
        if (socketRef.current) {
          console.log('Disconnecting socket on cleanup (hook unmount or task change)...');
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    } else if (!isLoadingAnalysis && socketRef.current) {
        // If analysis stops loading but socket still exists, disconnect it
        console.log('Analysis stopped, disconnecting socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
    }
  }, [currentTaskId, isLoadingAnalysis]); // Depend on task ID and loading state

  return {
    isLoadingAnalysis,
    analysisResults,
    analysisError,
    progress,
    handleAnalyze,
    handleCancel,
  };
}
