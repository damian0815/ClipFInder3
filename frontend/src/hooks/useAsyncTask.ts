import { useState, useEffect, useCallback } from 'react';
import { useProgressWebSocket } from './useProgressWebSocket';
import { v4 as uuidv4 } from 'uuid';

export interface AsyncTaskOptions {
    timeout?: number;
    onProgress?: (progress: number, message: string) => void;
}

export interface AsyncTaskResult<T> {
    runTask: (taskFn: (taskId: string) => Promise<T>) => Promise<T>;
    isLoading: boolean;
    error: string | null;
    data: T | null;
    progress: number | null;
    taskId: string | null;
    reset: () => void;
}

/**
 * Generic hook for managing async background tasks with WebSocket progress updates
 */
export function useAsyncTask<T>(options: AsyncTaskOptions = {}): AsyncTaskResult<T> {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<T | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    const { activeTasks } = useProgressWebSocket();

    // Listen for task completion
    useEffect(() => {
        if (!currentTaskId) return;

        const task = activeTasks.get(currentTaskId);
        if (!task) return;

        console.log(`Task ${currentTaskId} status:`, task.status, task.message);

        // Update progress if available
        if (task.progress !== undefined) {
            setProgress(task.progress);
            options.onProgress?.(task.progress, task.message);
        }

        if (task.status === 'completed') {
            setData(task.data || null);
            setIsLoading(false);
            setCurrentTaskId(null);
            setProgress(null);
        } else if (task.status === 'failed') {
            setError(task.message || 'Task failed');
            setIsLoading(false);
            setCurrentTaskId(null);
            setProgress(null);
        }
    }, [activeTasks, currentTaskId, options]);

    const runTask = useCallback(async (taskFn: (taskId: string) => Promise<any>) => {
        try {
            setIsLoading(true);
            setError(null);
            setData(null);
            setProgress(null);

            // Generate client-side task ID to avoid race conditions
            const taskId = uuidv4();
            setCurrentTaskId(taskId);

            // Execute the task function with the generated task ID
            return await taskFn(taskId);

        } catch (err) {
            console.error('Task run error:', err);
            setError(err instanceof Error ? err.message : 'Failed to run task');
            setIsLoading(false);
            setCurrentTaskId(null);
            setProgress(null);
        }
    }, []);

    const reset = useCallback(() => {
        setIsLoading(false);
        setError(null);
        setData(null);
        setProgress(null);
        setCurrentTaskId(null);
    }, []);

    return {
        runTask: runTask,
        isLoading,
        error,
        data,
        progress,
        taskId: currentTaskId,
        reset
    };
}
