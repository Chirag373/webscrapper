/**
 * Checks server connection by sending a ping request
 * @returns Promise that resolves to true if connection is successful
 */
export const checkServerConnection = async (): Promise<boolean> => {
    try {
        // Send a simple ping request to check if server is reachable
        const response = await fetch('/api/ping', { 
            method: 'HEAD',
            // Use a timestamp to prevent caching
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
            // Short timeout to quickly detect connection issues
            signal: AbortSignal.timeout(3000)
        });
        
        return response.ok;
    } catch (error) {
        console.warn('Server connection check failed:', error);
        return false;
    }
};

/**
 * Monitors heartbeat failures to detect server connectivity issues
 * @param callback Function to call when connection is lost
 * @param interval Interval in ms between checks
 * @param maxFailures Number of consecutive failures before connection is considered lost
 */
export const setupHeartbeatMonitor = (
    callback: () => void, 
    interval: number = 20000, 
    maxFailures: number = 3
): { start: () => void; stop: () => void } => {
    let heartbeatInterval: NodeJS.Timeout | null = null;
    let failedHeartbeats = 0;
    
    const checkConnection = async () => {
        const isConnected = await checkServerConnection();
        
        if (isConnected) {
            // Reset failed counter on success
            failedHeartbeats = 0;
        } else {
            failedHeartbeats++;
            console.warn(`Server heartbeat failed, attempt ${failedHeartbeats}`);
            
            // If we've had consecutive failures, treat as connection lost
            if (failedHeartbeats >= maxFailures) {
                console.error(`${maxFailures} consecutive heartbeat failures - treating as connection lost`);
                callback();
            }
        }
    };
    
    return {
        start: () => {
            // Stop any existing interval
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            
            // Reset counter and start checking
            failedHeartbeats = 0;
            heartbeatInterval = setInterval(checkConnection, interval);
        },
        stop: () => {
            if (heartbeatInterval) {
                clearInterval(heartbeatInterval);
                heartbeatInterval = null;
            }
        }
    };
};

/**
 * Monitors browser online/offline status
 * @param onOffline Function to call when browser goes offline
 * @param onOnline Function to call when browser comes back online
 */
export const setupNetworkMonitor = (
    onOffline: () => void,
    onOnline: () => void
): { start: () => void; stop: () => void } => {
    const handleOffline = () => {
        console.warn('Browser reports network offline');
        sessionStorage.setItem('connectionLostTimestamp', Date.now().toString());
        onOffline();
    };
    
    const handleOnline = () => {
        console.log('Browser reports network online');
        onOnline();
    };
    
    return {
        start: () => {
            window.addEventListener('offline', handleOffline);
            window.addEventListener('online', handleOnline);
        },
        stop: () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        }
    };
}; 