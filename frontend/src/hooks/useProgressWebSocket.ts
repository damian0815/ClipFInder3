import { useEffect, useRef, useState, useCallback } from 'react';
import { ProgressMessage } from '@/types/progress';

const WEBSOCKET_URL = 'ws://localhost:8000/ws/progress';
const RECONNECT_INTERVAL = 3000; // 3 seconds

type UseProgressWebSocketData = {
    messages: ProgressMessage[];
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    activeTasks: Map<string, ProgressMessage>;
    connect: () => void;
    disconnect: () => void;
    clearMessages: () => void;
    clearActiveTasks: () => void;
}

// Global singleton WebSocket connection state
let globalWs: WebSocket | null = null;
let globalConnectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
let globalMessages: ProgressMessage[] = [];
let globalActiveTasks: Map<string, ProgressMessage> = new Map();
let globalListeners: Set<() => void> = new Set();
let reconnectTimeout: number | undefined;
let reconnectAttempts = 0;

function notifyListeners() {
    globalListeners.forEach(listener => listener());
}

function globalConnect() {
    if (globalWs?.readyState === WebSocket.CONNECTING || globalWs?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connecting/connected, skipping');
        return;
    }

    try {
        globalConnectionStatus = 'connecting';
        notifyListeners();

        globalWs = new WebSocket(WEBSOCKET_URL);

        globalWs.onopen = () => {
            console.log('Progress WebSocket connected');
            globalConnectionStatus = 'connected';
            reconnectAttempts = 0;
            notifyListeners();
        };

        globalWs.onmessage = (event) => {
            try {
                const message: ProgressMessage = JSON.parse(event.data);
                console.log('Progress update:', message);

                globalMessages = [...globalMessages.slice(-99), message]; // Keep last 100 messages

                if (message.status === 'completed' || message.status === 'failed') {
                    // Remove completed/failed tasks after a delay
                    setTimeout(() => {
                        globalActiveTasks.delete(message.task_id);
                        notifyListeners();
                    }, 3000);
                }

                globalActiveTasks.set(message.task_id, message);
                notifyListeners();
            } catch (error) {
                console.error('Error parsing progress message:', error);
            }
        };

        globalWs.onclose = (event) => {
            console.log('Progress WebSocket disconnected:', event.code, event.reason);
            globalConnectionStatus = 'disconnected';
            globalWs = null;
            notifyListeners();

            if (!event.wasClean) {
                reconnectAttempts++;
                console.log(`Reconnecting... (attempt ${reconnectAttempts})`);

                reconnectTimeout = setTimeout(() => {
                    globalConnect();
                }, RECONNECT_INTERVAL);
            }
        };

        globalWs.onerror = (error) => {
            console.error('Progress WebSocket error:', error);
            globalConnectionStatus = 'error';
            notifyListeners();
        };

    } catch (error) {
        console.error('Error connecting to progress WebSocket:', error);
        globalConnectionStatus = 'error';
        notifyListeners();
    }
}

function globalDisconnect() {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = undefined;
    }

    if (globalWs) {
        globalWs.close(1000, 'Component unmounting');
        globalWs = null;
    }

    globalConnectionStatus = 'disconnected';
    notifyListeners();
}

function manualReconnect() {
    // Reset reconnection attempts for manual reconnection
    reconnectAttempts = 0;
    
    // Clear any existing timeout
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = undefined;
    }
    
    // Force disconnect first, then reconnect
    if (globalWs) {
        globalWs.close(1000, 'Manual reconnect');
        globalWs = null;
    }
    
    globalConnect();
}

export function useProgressWebSocket(): UseProgressWebSocketData {
    const [, forceUpdate] = useState({});
    const listenerRef = useRef<() => void>();

    // Force component re-render when global state changes
    const triggerUpdate = useCallback(() => {
        forceUpdate({});
    }, []);

    useEffect(() => {
        // Register this component as a listener
        listenerRef.current = triggerUpdate;
        globalListeners.add(triggerUpdate);

        // Connect if not already connected
        if (globalConnectionStatus === 'disconnected') {
            globalConnect();
        }

        // Cleanup on unmount
        return () => {
            if (listenerRef.current) {
                globalListeners.delete(listenerRef.current);
            }

            // Only disconnect if this is the last listener
            if (globalListeners.size === 0) {
                console.log('Last WebSocket listener unmounted, disconnecting');
                globalDisconnect();
            }
        };
    }, [triggerUpdate]);

    const clearMessages = useCallback(() => {
        globalMessages = [];
        notifyListeners();
    }, []);

    const clearActiveTasks = useCallback(() => {
        globalActiveTasks = new Map();
        notifyListeners();
    }, []);

    return {
        messages: globalMessages,
        connectionStatus: globalConnectionStatus,
        activeTasks: globalActiveTasks,
        connect: manualReconnect, // Use manual reconnect for user-initiated connections
        disconnect: globalDisconnect,
        clearMessages,
        clearActiveTasks,
    };
}
