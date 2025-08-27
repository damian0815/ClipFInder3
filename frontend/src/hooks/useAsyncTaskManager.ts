import { useCallback, useRef } from 'react';
import { useProgressWebSocketContext } from '@/contexts/ProgressWebSocketContext';
import { v4 as uuidv4 } from 'uuid';

export interface TaskData<T> {
    isLoading: boolean;
    error: string | null;
    data: T | null;
    progress: number | null;
    taskId: string;
}

export interface TaskResult<T> {
    data: T;
    error: string | null;
}

export interface AsyncTaskManager {
    runTask: <T>(taskFn: (taskId: string, taskData: TaskData<T>) => Promise<T>) => Promise<TaskResult<T>>;
}

/**
 * Hook for managing multiple async tasks with isolated state per task
 */
export function useAsyncTaskManager(): AsyncTaskManager {
    const progressWebSocket = useProgressWebSocketContext();
    const taskDataRef = useRef<Map<string, TaskData<any>>>(new Map());

    const runTask = useCallback(async <T>(
        taskFn: (taskId: string, taskData: TaskData<T>) => Promise<T>
    ): Promise<TaskResult<T>> => {
        const taskId = uuidv4();
        
        // Initialize task data
        const initialTaskData: TaskData<T> = {
            isLoading: true,
            error: null,
            data: null,
            progress: null,
            taskId
        };
        
        taskDataRef.current.set(taskId, initialTaskData);

        try {
            // Create a reactive task data object that updates based on WebSocket progress
            const getTaskData = (): TaskData<T> => {
                const current = taskDataRef.current.get(taskId) || initialTaskData;
                const wsTask = progressWebSocket.activeTasks.get(taskId);

                if (wsTask) {
                    const newData = {
                        ...current,
                        progress: wsTask.progress ?? current.progress,
                        isLoading: wsTask.status === 'in_progress' || wsTask.status === 'pending',
                        error: wsTask.status === 'failed' ? (wsTask.message || 'Task failed') : null,
                        data: wsTask.status === 'completed' ? (wsTask.data || current.data) : current.data
                    };
                    console.log('getTaskData returning', newData, 'from wstask', wsTask);
                    return newData;
                }
                
                return current;
            };

            // Create a proxy that always returns fresh task data
            const taskDataProxy = new Proxy(initialTaskData, {
                get(_target, prop) {
                    const currentData = getTaskData();
                    taskDataRef.current.set(taskId, currentData);
                    //console.log('taskDataProxy.get returning', currentData, 'from proxy');
                    return currentData[prop as keyof TaskData<T>];
                }
            });

            // Execute the task function
            const result = await taskFn(taskId, taskDataProxy);

            // Final task data check
            const finalTaskData = getTaskData();
            
            return {
                data: result,
                error: finalTaskData.error
            };

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Task failed';
            return {
                data: null as any, // This will be overridden by the caller's error handling
                error: errorMessage
            };
        } finally {
            // Clean up task data after a delay to allow for final state updates
            setTimeout(() => {
                taskDataRef.current.delete(taskId);
            }, 1000);
        }
    }, []); // Remove activeTasks dependency to fix closure issue

    return {
        runTask
    };
}
