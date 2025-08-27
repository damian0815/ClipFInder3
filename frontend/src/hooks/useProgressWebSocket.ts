import { useEffect, useRef, useState } from 'react';
import { ProgressMessage } from '@/types/progress';

const WEBSOCKET_URL = 'ws://localhost:8000/ws/progress';
const RECONNECT_INTERVAL = 3000; // 3 seconds
const MAX_RECONNECT_ATTEMPTS = 10;

type UseProgressWebSocketData = {
    messages: ProgressMessage[];
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    activeTasks: Map<string, ProgressMessage>;
    connect: () => void;
    disconnect: () => void;
    clearMessages: () => void;
    clearActiveTasks: () => void;
}

export function useProgressWebSocket(): UseProgressWebSocketData {
    const [messages, setMessages] = useState<ProgressMessage[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
    const [activeTasks, setActiveTasks] = useState<Map<string, ProgressMessage>>(new Map());
    
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttempts = useRef(0);
    const reconnectTimeoutRef = useRef<number>();

    const connect = () => {
        try {
            setConnectionStatus('connecting');
            wsRef.current = new WebSocket(WEBSOCKET_URL);

            wsRef.current.onopen = () => {
                //console.log('Progress WebSocket connected');
                setConnectionStatus('connected');
                reconnectAttempts.current = 0;
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const message: ProgressMessage = JSON.parse(event.data);
                    //console.log('Progress update:', message);
                    
                    setMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
                    
                    setActiveTasks(prev => {
                        const newTasks = new Map(prev);
                        
                        if (message.status === 'completed' || message.status === 'failed') {
                            // Remove completed/failed tasks after a delay
                            setTimeout(() => {
                                setActiveTasks(current => {
                                    const updated = new Map(current);
                                    updated.delete(message.task_id);
                                    return updated;
                                });
                            }, 3000);
                        }
                        
                        newTasks.set(message.task_id, message);
                        return newTasks;
                    });
                } catch (error) {
                    console.error('Error parsing progress message:', error);
                }
            };

            wsRef.current.onclose = (event) => {
                //console.log('Progress WebSocket disconnected:', event.code, event.reason);
                setConnectionStatus('disconnected');
                
                if (!event.wasClean && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts.current++;
                    console.log(`Reconnecting... (${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, RECONNECT_INTERVAL);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('Progress WebSocket error:', error);
                setConnectionStatus('error');
            };

        } catch (error) {
            console.error('Error connecting to progress WebSocket:', error);
            setConnectionStatus('error');
        }
    };

    const disconnect = () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        
        if (wsRef.current) {
            wsRef.current.close(1000, 'Component unmounting');
        }
    };

    useEffect(() => {
        connect();
        
        return () => {
            disconnect();
        };
    }, []);

    const clearMessages = () => {
        setMessages([]);
    };

    const clearActiveTasks = () => {
        setActiveTasks(new Map());
    };

    return {
        messages,
        connectionStatus,
        activeTasks,
        connect,
        disconnect,
        clearMessages,
        clearActiveTasks
    };
}
