import { useState } from 'react';

interface TestProgressProps {
    className?: string;
}

export function TestProgress({ className = '' }: TestProgressProps) {
    const [isRunning, setIsRunning] = useState(false);

    const simulateProgress = async () => {
        setIsRunning(true);
        
        // This would normally be done by your backend
        // For testing, you can manually send messages via browser console:
        /*
        
        To test the progress bar, open browser console and run:
        
        const ws = new WebSocket('ws://localhost:8000/ws/progress');
        ws.onopen = () => {
            // Simulate a progress task
            const messages = [
                {task_id: "test_task_1", status: "in_progress", progress: 0, message: "Starting process...", current_step: "Initialization", current_step_number: 1, total_steps: 5, timestamp: Date.now() / 1000},
                {task_id: "test_task_1", status: "in_progress", progress: 25, message: "Processing data...", current_step: "Data loading", current_step_number: 2, total_steps: 5, timestamp: Date.now() / 1000},
                {task_id: "test_task_1", status: "in_progress", progress: 50, message: "Analyzing images...", current_step: "Image processing", current_step_number: 3, total_steps: 5, timestamp: Date.now() / 1000},
                {task_id: "test_task_1", status: "in_progress", progress: 75, message: "Generating embeddings...", current_step: "Embedding generation", current_step_number: 4, total_steps: 5, timestamp: Date.now() / 1000},
                {task_id: "test_task_1", status: "completed", progress: 100, message: "Process completed!", current_step: "Finished", current_step_number: 5, total_steps: 5, timestamp: Date.now() / 1000}
            ];
            
            messages.forEach((msg, index) => {
                setTimeout(() => ws.send(JSON.stringify(msg)), index * 2000);
            });
        };
        
        */
        
        console.log('To test progress bar, run the WebSocket commands shown in the source code comments');
        setIsRunning(false);
    };

    return (
        <div className={`test-progress ${className}`}>
            <button
                onClick={simulateProgress}
                disabled={isRunning}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-400"
            >
                {isRunning ? 'Running...' : 'Test Progress Bar'}
            </button>
            <p className="text-xs text-gray-500 mt-1">
                Check browser console for WebSocket test instructions
            </p>
        </div>
    );
}

export default TestProgress;
