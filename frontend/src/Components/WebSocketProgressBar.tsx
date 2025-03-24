import { useState, useEffect, useRef } from 'react';
import {API_BASE_URL} from "@/Constants.tsx";

const WebSocketProgressBar = () => {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('');
  const [connected, setConnected] = useState(false);
  const ws = useRef<WebSocket>(undefined);
  const reconnectTimerRef = useRef<number>(undefined);

  const WEBSOCKET_RETRY_TIMEOUT_MS = 10000

  const connectWebSocket = () => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.warn('not connecting websocket because already connected and open')
      return
    }

    try {
      const newSocket = new WebSocket(`${API_BASE_URL}/ws`);

      newSocket.onopen = () => {
        setConnected(true);
        clearTimeout(reconnectTimerRef.current);
      };

      newSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log('socket message:', message)
        if (message.type === 'progress' && message.data) {
          setProgress(message.data.progress);
          setLabel(message.data.label || '');
        } else {
          console.log('unprocessed:', message)
        }
      };

      newSocket.onclose = () => {
        console.log("socket onclose", newSocket)
        setConnected(false);
        if (ws.current == newSocket) {
          console.log(" => clearing ws.current")
          ws.current = undefined;
        }
        // Schedule reconnect
        reconnectTimerRef.current = setTimeout(connectWebSocket, WEBSOCKET_RETRY_TIMEOUT_MS);
      };

      newSocket.onerror = (error) => {
        console.log("socket onerror")
        console.error('WebSocket error:', error);
        newSocket.close()
      };

      ws.current = newSocket
      console.log("socket set current", newSocket)
    } catch (error) {
      console.error('WebSocket connection error:', error);
      setConnected(false);
      // Schedule reconnect
      reconnectTimerRef.current = setTimeout(connectWebSocket, 3000);
    }
  };

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (ws.current) {
        console.log("closing current")
        ws.current.close();
      }
      clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  function getConnectionStateColor() {
    if (connected) {
      return "bg-green-500"
    } else {
      return "bg-red-500"
    }
  }

  return (
      <div className="fixed top-0 left-0 w-full z-50">
        <div className={`fixed top-0 left-0 w-1 h-1 ${getConnectionStateColor()}`} />
          <div className="relative h-1">
            <div
                className="absolute h-1 bg-blue-500 transition-all duration-300 ease-out"
                style={{width: `${progress * 100}%`}}
            />
          </div>
          {label && progress<1 && (
              <div className="text-xs text-center bg-gray-800 text-white py-1 truncate">
                {label} {progress}
              </div>
          )}

      </div>
  );
};

export default WebSocketProgressBar;