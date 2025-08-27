import { useProgressWebSocketContext } from '@/contexts/ProgressWebSocketContext';
import { ProgressMessage } from '@/types/progress';
import {useEffect} from "react";

interface ProgressBarProps {
    task: ProgressMessage;
    onDismiss?: (taskId: string) => void;
}

function ProgressBar({ task, onDismiss }: ProgressBarProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'in_progress':
                return 'bg-blue-500';
            case 'completed':
                return 'bg-green-500';
            case 'failed':
                return 'bg-red-500';
            case 'pending':
                return 'bg-gray-400';
            default:
                return 'bg-gray-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'in_progress':
                return '⏳';
            case 'completed':
                return '✅';
            case 'failed':
                return '❌';
            case 'pending':
                return '⏸️';
            default:
                return '❓';
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 mb-2 last:mb-0">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <span className="text-lg">{getStatusIcon(task.status)}</span>
                    <div>
                        <div className="font-medium text-sm text-gray-900">{task.message}</div>
                        <div className="text-xs text-gray-500">
                            Task: {task.task_id} • Step {task.current_step_number}/{task.total_steps}
                        </div>
                    </div>
                </div>
                {onDismiss && (
                    <button
                        onClick={() => onDismiss(task.task_id)}
                        className="text-gray-400 hover:text-gray-600 text-sm"
                    >
                        ✕
                    </button>
                )}
            </div>
            
            <div className="mb-1">
                <div className="text-xs text-gray-600 mb-1">{task.current_step}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(task.status)}`}
                        style={{ width: `${Math.min(100, Math.max(0, task.progress))}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{Math.round(task.progress)}%</span>
                    <span>{new Date(task.timestamp * 1000).toLocaleTimeString()}</span>
                </div>
            </div>
        </div>
    );
}

interface ProgressStatusBarProps {
    className?: string;
    maxVisible?: number;
}

export function ProgressStatusBar({ className = '', maxVisible = 5 }: ProgressStatusBarProps) {
    const { activeTasks, connectionStatus, clearActiveTasks } = useProgressWebSocketContext();

    /*if (activeTasks.length === 0 && connectionStatus === 'connected') {
        return null; // Don't show anything when no active tasks
    }*/
    useEffect(() => {
        console.log("ProgressStatusBar activeTasks changed:", activeTasks);
    }, [activeTasks]);

    const visibleTasks = [...activeTasks.values()].slice(-maxVisible); // Show most recent tasks

    return (
        <div className={`fixed top-4 right-4 w-96 z-50 ${className}`}>
            {/* Connection status indicator */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <div
                        className={`w-2 h-2 rounded-full ${
                            connectionStatus === 'connected'
                                ? 'bg-green-400'
                                : connectionStatus === 'connecting'
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                        }`}
                    ></div>
                    <span className="text-xs text-gray-600">
                        Progress: {connectionStatus}
                    </span>
                </div>
                {activeTasks.size > 0 && (
                    <button
                        onClick={clearActiveTasks}
                        className="text-xs text-gray-500 hover:text-gray-700"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Progress bars */}
            <div className="space-y-2">
                {visibleTasks.map((task) => (
                    <ProgressBar
                        key={task.task_id}
                        task={task}
                        onDismiss={clearActiveTasks}
                    />
                ))}
            </div>

            {/* Show count if there are more tasks than visible */}
            {activeTasks.size > maxVisible && (
                <div className="text-center text-xs text-gray-500 mt-2">
                    ... and {activeTasks.size - maxVisible} more tasks
                </div>
            )}
        </div>
    );
}

export default ProgressStatusBar;
