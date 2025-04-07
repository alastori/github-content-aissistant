# This dictionary needs to be accessible by both the task runner and the cancel handler.
# It will be imported into main.py
cancelled_tasks = {}

# Import necessary services and libraries within the function or globally if preferred
# Note: socketio instance needs to be passed in or imported carefully to avoid circular dependencies
# Passing it in is generally safer.


def run_analysis_task(socketio, task_id, analysis_mode, scope, user_prompt, owner, repo, branch, provider_config, model_id):
    """The actual analysis logic run in a background thread via SocketIO."""
    # Import services here to avoid potential circular imports if services also import this
    from services import github_service
    from services import llm_service  # Renamed import

    print(f"Background task {task_id} starting for mode '{analysis_mode}' with provider '{provider_config['id']}' model '{model_id}'...")  # Log start with provider/model
    fetch_content_func = github_service.fetch_file_content
    final_status = 'error'  # Default status
    results = []  # Initialize results list for iterative mode

    try:
        if analysis_mode == 'iterative':
            total_files = len(scope)
            for i, file_path in enumerate(scope):
                # Check for cancellation before processing each file
                if cancelled_tasks.get(task_id):
                    print(f"Task {task_id} cancelled by user request.")
                    final_status = 'cancelled'
                    break  # Exit the loop

                # Emit progress update
                progress_data = {'current_file': file_path, 'current_index': i, 'total_files': total_files}
                print(f"Task {task_id} emitting progress: {progress_data}")  # Log progress emit
                socketio.emit('progress_update', progress_data, room=task_id)
                socketio.sleep(0.1)  # Small sleep to allow event emission

                # Process the file
                print(f"Task {task_id} fetching content for: {file_path}")  # Log content fetch
                content = fetch_content_func(owner, repo, file_path, branch)
                partial_result = {'path': file_path}
                if content is None:
                    partial_result['error'] = 'Could not fetch content.'
                # No need to check llm_service.client here, get_llm_completion handles initialization errors
                else:
                    try:
                        print(f"Task {task_id} preparing LLM call for: {file_path}")
                        # Use MAX_COMBINED_CHARS from llm_service
                        prompt_content = content[:llm_service.MAX_COMBINED_CHARS // total_files if total_files > 0 else llm_service.MAX_COMBINED_CHARS]
                        # Construct messages in OpenAI format (adapt in get_llm_completion if needed)
                        messages = [{"role": "user", "content": f"{user_prompt}\n\nAnalyze the following content from file '{file_path}':\n---\n{prompt_content}\n---"}]

                        # Call the generalized LLM service function
                        response_text = llm_service.get_llm_completion(
                            provider_config=provider_config,
                            model_id=model_id,
                            prompt_messages=messages
                            # Add other potential kwargs like temperature if needed
                        )
                        partial_result['response'] = response_text
                        print(f"Task {task_id} LLM call successful for: {file_path}")
                    except Exception as e:
                        print(f"Task {task_id} LLM call FAILED for {file_path}: {e}")
                        partial_result['error'] = f'LLM API error: {e}'  # Generic error

                # Emit partial result
                print(f"Task {task_id} emitting partial result for: {file_path}")  # Log partial result emit
                socketio.emit('partial_result', partial_result, room=task_id)
                results.append(partial_result)  # Optionally collect results

            if final_status != 'cancelled':
                final_status = 'completed'  # Mark as completed if loop finished naturally

        elif analysis_mode == 'combined':
            # Emit initial progress for combined mode
            print(f"Task {task_id} emitting combined progress: Fetching content...")  # Log combined progress
            socketio.emit('progress_update', {'message': 'Fetching and combining content...'}, room=task_id)
            socketio.sleep(0.1)

            # Check for cancellation before potentially long processing
            if cancelled_tasks.get(task_id):
                print(f"Task {task_id} cancelled before combined processing.")
                final_status = 'cancelled'
            else:
                # --- Combined Mode LLM Call ---
                print(f"Task {task_id} preparing combined LLM call...")
                # Combine content
                all_content_fetched = True
                temp_combined_content = ""
                for file_path in scope:
                    content = fetch_content_func(owner, repo, file_path, branch)
                    if content is None:
                        temp_combined_content += f"\n\n--- Error fetching content for {file_path} ---\n\n"
                        all_content_fetched = False
                    else:
                        temp_combined_content += f"\n\n--- Content from {file_path} ---\n{content}"

                if len(temp_combined_content) > llm_service.MAX_COMBINED_CHARS:
                    print(f"  Warning: Combined content exceeds {llm_service.MAX_COMBINED_CHARS} chars. Truncating.")
                    combined_content = temp_combined_content[:llm_service.MAX_COMBINED_CHARS]
                else:
                    combined_content = temp_combined_content

                try:
                    messages = [{"role": "user", "content": f"{user_prompt}\n\nAnalyze the combined content from the following files: {', '.join(scope)}\n---\n{combined_content}\n---"}]
                    combined_response = llm_service.get_llm_completion(
                        provider_config=provider_config,
                        model_id=model_id,
                        prompt_messages=messages
                    )
                    error_msg = None  # Clear error if successful
                    print(f"Task {task_id} combined LLM call successful.")
                except Exception as e:
                    print(f"Task {task_id} combined LLM call FAILED: {e}")
                    combined_response = None
                    error_msg = f'LLM API error: {e}'
                # --- End Combined Mode LLM Call ---

                # Check for cancellation again after processing
                if cancelled_tasks.get(task_id):
                    print(f"Task {task_id} cancelled during/after combined processing.")
                    final_status = 'cancelled'
                elif error_msg:
                    # Emit error for combined mode
                    socketio.emit('task_error', {'error': error_msg}, room=task_id)
                    final_status = 'error'
                else:
                    # Emit final result for combined mode
                    message = 'Combined processing complete.'
                    if not all_content_fetched:
                        message += ' Some file contents could not be fetched.'
                    final_result_data = {
                        'message': message,
                        'combined_response': combined_response
                    }
                    # For combined, we send the full result as 'final_result'
                    print(f"Task {task_id} emitting final combined result.")  # Log final result emit
                    socketio.emit('final_result', final_result_data, room=task_id)
                    final_status = 'completed'

    except Exception as e:
        print(f"Error in background task {task_id}: {e}")
        socketio.emit('task_error', {'error': f'Unexpected error during processing: {e}'}, room=task_id)
        final_status = 'error'
    finally:
        # Prepare final data for task_finished event
        final_data = {'task_id': task_id, 'status': final_status}
        if analysis_mode == 'iterative' and final_status == 'completed':
            # Include collected results for iterative mode on completion
            final_data['results'] = results
            print(f"Task {task_id} completed with {len(results)} results.")
        elif analysis_mode == 'combined' and final_status == 'completed':
            # For combined, the result was already sent via 'final_result'
            # We could potentially re-send it here if needed, but maybe not necessary
            pass

        # Emit task finished event regardless of outcome
        socketio.emit('task_finished', final_data, room=task_id)
        print(f"Background task {task_id} finished with status: {final_status}")
        # Clean up cancellation flag
        if task_id in cancelled_tasks:
            del cancelled_tasks[task_id]
