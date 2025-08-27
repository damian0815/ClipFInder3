export interface ProgressMessage {
  task_id: string;
  status: 'in_progress' | 'completed' | 'failed' | 'pending';
  progress: number;
  message: string;
  current_step: string;
  current_step_number: number;
  total_steps: number;
  timestamp: number;
  data?: any;
}

export interface ProgressState {
  [taskId: string]: ProgressMessage;
}
