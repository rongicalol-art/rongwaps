export interface DebugLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: 'AI' | 'Firestore' | 'Supabase' | 'Auth' | 'Cache';
  message: string;
  details?: any;
}

type LogListener = (logs: DebugLog[]) => void;

class DebugLogger {
  private logs: DebugLog[] = [];
  private listeners = new Set<LogListener>();
  private maxLogs = 200;

  private createLog(level: 'info' | 'warn' | 'error', category: DebugLog['category'], message: string, details?: any): DebugLog {
    return {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      level,
      category,
      message,
      details,
    };
  }

  private addLog(log: DebugLog) {
    this.logs.unshift(log); // newest first
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    
    // Print to actual developer console
    const colorStyle = log.level === 'error' ? 'color: #ef4444' : log.level === 'warn' ? 'color: #f59e0b' : 'color: #3b82f6';
    console.log(`%c[${log.category}]%c ${log.message}`, `${colorStyle}; font-weight: bold;`, '', log.details || '');
    
    this.listeners.forEach(listener => {
      try {
        listener([...this.logs]);
      } catch (e) {
        console.error("Error invoking log listener:", e);
      }
    });
  }

  info(category: DebugLog['category'], message: string, details?: any) {
    this.addLog(this.createLog('info', category, message, details));
  }

  warn(category: DebugLog['category'], message: string, details?: any) {
    this.addLog(this.createLog('warn', category, message, details));
  }

  error(category: DebugLog['category'], message: string, details?: any) {
    this.addLog(this.createLog('error', category, message, details));
  }

  getLogs(): DebugLog[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener([]));
  }

  subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener([...this.logs]);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const debugLogger = new DebugLogger();
