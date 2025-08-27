import React, { createContext, useContext, ReactNode } from 'react';
import { useProgressWebSocket } from '@/hooks/useProgressWebSocket';
import { ProgressMessage } from '@/types/progress';

interface ProgressWebSocketContextType {
    messages: ProgressMessage[];
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    activeTasks: Map<string, ProgressMessage>;
    connect: () => void;
    disconnect: () => void;
    clearMessages: () => void;
    clearActiveTasks: () => void;
}

const ProgressWebSocketContext = createContext<ProgressWebSocketContextType | null>(null);

interface ProgressWebSocketProviderProps {
    children: ReactNode;
}

export function ProgressWebSocketProvider({ children }: ProgressWebSocketProviderProps) {
    const webSocketData = useProgressWebSocket();

    return (
        <ProgressWebSocketContext.Provider value={webSocketData}>
            {children}
        </ProgressWebSocketContext.Provider>
    );
}

export function useProgressWebSocketContext(): ProgressWebSocketContextType {
    const context = useContext(ProgressWebSocketContext);
    if (!context) {
        throw new Error('useProgressWebSocketContext must be used within a ProgressWebSocketProvider');
    }
    return context;
}
