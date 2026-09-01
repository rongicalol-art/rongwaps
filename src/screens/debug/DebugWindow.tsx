import React, { useEffect, useState } from 'react';
import { fetchAllMnemonicsDebug, clearAllMnemonics } from '../../services/aiService';
import { debugLogger, DebugLog } from '../../utils/debugLogger';

const icons = import.meta.glob('/src/assets/icons/*.svg', { query: '?raw', import: 'default', eager: true });

export const DebugWindow = () => {
  const [activeTab, setActiveTab] = useState<'icons' | 'mnemonics' | 'logs'>('logs');
  const [mnemonics, setMnemonics] = useState<Awaited<ReturnType<typeof fetchAllMnemonicsDebug>>>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearAllMnemonicsFromDb = async () => {
    setLoading(true);
    setShowConfirmDelete(false);
    setErrorMessage(null);
    try {
      await clearAllMnemonics();
      setMnemonics([]);
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : '';
      if (message.includes('permissions')) {
        setErrorMessage("Permission denied. You must be signed in to clear the global database.");
      } else {
        setErrorMessage(message || 'An error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load Firestore mnemonics
  useEffect(() => {
    if (activeTab === 'mnemonics') {
      setLoading(true);
      fetchAllMnemonicsDebug().then((data) => {
        setMnemonics(data);
        setLoading(false);
      });
    }
  }, [activeTab]);

  // Subscribe to real-time development and error logs from the applet
  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((incomingLogs) => {
      setLogs(incomingLogs);
    });
    return () => unsubscribe();
  }, []);

  const getCategoryClass = (category: DebugLog['category']) => {
    switch (category) {
      case 'AI': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Firestore': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Supabase': return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Auth': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Cache': return 'bg-sky-100 text-sky-800 border-sky-300';
      default: return 'bg-ui-canvas text-ui-ink border-ui-divider';
    }
  };

  const getLevelBorderClass = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return 'border-rose-300 bg-rose-50/50';
      case 'warn': return 'border-amber-300 bg-amber-50/50';
      default: return 'border-ui-divider bg-ui-surface';
    }
  };

  const clearLogStream = () => {
    debugLogger.clear();
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col font-sans bg-ui-canvas">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-ui-ink">Debug Control Panel</h1>
          <p className="text-sm text-ui-muted">Monitor AI processes, cache statuses, database updates, and system integrity.</p>
        </div>
        
        <div className="flex gap-2">
          <a 
            href="https://supabase.com/dashboard/projects" 
            target="_blank" rel="noreferrer"
            className="px-4 py-2 font-black text-xs md:text-sm uppercase tracking-wider rounded-control border-b-[length:var(--depth-sm)] border-black active:border-b-0 active:translate-y-[length:var(--depth-sm)] bg-ui-ink-strong text-white hover:brightness-110 transition-all select-none"
          >
            Open Supabase DB
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-ui-divider pb-4">
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wide rounded-control border-b-[length:var(--depth-sm)] active:border-b-0 active:translate-y-[length:var(--depth-sm)] transition-all select-none ${
            activeTab === 'logs' 
              ? 'bg-feedback-success border-feedback-success-edge text-white' 
              : 'bg-ui-surface border-ui-divider text-ui-ink hover:bg-ui-hover'
          }`}
        >
          Active Log Stream & Errors
        </button>
        <button 
          onClick={() => setActiveTab('mnemonics')}
          className={`px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wide rounded-control border-b-[length:var(--depth-sm)] active:border-b-0 active:translate-y-[length:var(--depth-sm)] transition-all select-none ${
            activeTab === 'mnemonics' 
              ? 'bg-feedback-success border-feedback-success-edge text-white' 
              : 'bg-ui-surface border-ui-divider text-ui-ink hover:bg-ui-hover'
          }`}
        >
          Mnemonic Firestore Cache ({mnemonics.length})
        </button>
        <button 
          onClick={() => setActiveTab('icons')}
          className={`px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wide rounded-control border-b-[length:var(--depth-sm)] active:border-b-0 active:translate-y-[length:var(--depth-sm)] transition-all select-none ${
            activeTab === 'icons' 
              ? 'bg-feedback-success border-feedback-success-edge text-white' 
              : 'bg-ui-surface border-ui-divider text-ui-ink hover:bg-ui-hover'
          }`}
        >
          UI Icons List
        </button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'logs' && (
          <div className="h-full flex flex-col gap-3 min-h-0">
            <div className="flex justify-between items-center bg-ui-canvas p-3 rounded-control border border-ui-divider">
              <span className="text-xs font-bold text-ui-ink">
                REAL-TIME ACTIVITY FEED ({logs.length} events logged)
              </span>
              <button 
                onClick={clearLogStream}
                className="px-3 py-1 bg-ui-surface border border-ui-divider hover:bg-ui-hover text-xs font-bold text-feedback-danger rounded-sm active:translate-y-[1px]"
              >
                Clear Log List
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pb-24 space-y-3">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-ui-surface border-2 border-dashed border-ui-divider rounded-feature text-center">
                  <p className="font-bold text-ui-ink">No active logs captured yet.</p>
                  <p className="text-xs text-ui-muted mt-1 max-w-sm">Interact with flashcards or trigger AI story generation to watch background API processes stream live right here.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-4 rounded-control border-b-[length:var(--depth-sm)] transition-all leading-normal flex flex-col gap-2 ${getLevelBorderClass(log.level)}`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-sm border ${getCategoryClass(log.category)}`}>
                          {log.category}
                        </span>
                        <span className="text-xs font-mono text-ui-muted">
                          [{log.timestamp}]
                        </span>
                        {log.level !== 'info' && (
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-sm ${log.level === 'error' ? 'bg-feedback-danger-surface text-feedback-danger' : 'bg-feedback-warning/15 text-feedback-warning-edge'}`}>
                            {log.level}
                          </span>
                        )}
                      </div>
                      
                      {log.details && (
                        <button 
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="text-xs font-black text-feedback-success hover:underline"
                        >
                          {expandedLogId === log.id ? 'Hide Trace ▲' : 'Inspect Payload ▼'}
                        </button>
                      )}
                    </div>

                    <p className={`text-[14px] font-bold ${log.level === 'error' ? 'text-feedback-danger' : log.level === 'warn' ? 'text-feedback-warning-edge' : 'text-ui-ink'}`}>
                      {log.message}
                    </p>

                    {log.details && expandedLogId === log.id && (
                      <div className="mt-2 bg-ui-ink-strong p-3 rounded-control overflow-x-auto text-[11px] font-mono text-emerald-400 border border-emerald-500 max-h-64 whitespace-pre">
                        {JSON.stringify(log.details, null, 2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'mnemonics' && (
          <div className="h-full overflow-y-auto pb-24 space-y-4">
            <div className="text-sm text-ui-muted bg-feedback-warning/10 p-4 border border-feedback-warning-edge/30 rounded-control">
              <strong>Mnemonics Cache:</strong> Memory hooks generated by the AI are globally cached in Supabase (table: <code>mnemonics</code>). Dictionary entries (pinyin, meanings, character breakdowns) are also cached in Supabase.
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-ui-surface p-4 rounded-feature border-b-[length:var(--depth-md)] border-ui-divider gap-4">
              <div>
                <h4 className="font-extrabold text-ui-ink text-sm">GLOBAL DATABASE CONTROLS</h4>
                <p className="text-xs text-ui-muted">{mnemonics.length} items currently in the active Firestore database cache.</p>
              </div>
              {!showConfirmDelete ? (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-4 py-2 bg-feedback-danger border-b-[length:var(--depth-md)] border-feedback-danger-edge active:border-b-0 active:translate-y-[length:var(--depth-md)] text-white text-xs font-black uppercase rounded-control transition-all hover:brightness-110 select-none"
                >
                  Clear All Mnemonics
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={clearAllMnemonicsFromDb}
                    className="px-3 py-2 bg-feedback-success border-b-[length:var(--depth-md)] border-feedback-success-edge active:border-b-0 active:translate-y-[length:var(--depth-md)] text-white text-xs font-black uppercase rounded-control transition-all hover:brightness-110 select-none"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-3 py-2 bg-ui-surface border-b-[length:var(--depth-md)] border-ui-divider active:border-b-0 active:translate-y-[length:var(--depth-md)] text-ui-ink text-xs font-black uppercase rounded-control transition-all hover:bg-ui-hover select-none"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            
            {errorMessage && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-200">
                {errorMessage}
              </div>
            )}

            {loading ? (
              <p className="text-ui-muted text-sm animate-pulse">Loading mnemonics from Supabase...</p>
            ) : mnemonics.length > 0 ? (
              mnemonics.map((m) => (
                <div key={m.character} className="border-b-[length:var(--depth-md)] border-ui-divider p-5 rounded-feature flex flex-col bg-ui-surface transition-all">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-ui-divider">
                    <span className="font-extrabold text-ui-ink text-2xl">{m.character}</span>
                    <span className="text-xs text-ui-muted">
                      {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : 'Cached Global Memory'}
                    </span>
                  </div>
                  <p className="text-ui-ink font-bold whitespace-pre-wrap text-[15px] bg-ui-canvas p-3 rounded-control border-b-[length:var(--depth-sm)] border-ui-divider leading-relaxed">
                    {m.mnemonic}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-ui-muted bg-ui-surface border-2 border-dashed border-ui-divider rounded-feature font-bold">
                No mnemonics found in the global Firestore cache.
              </div>
            )}
          </div>
        )}

        {activeTab === 'icons' && (
          <div className="h-full overflow-y-auto pb-24">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {Object.entries(icons).map(([path, content]) => (
                <div key={path} className="border-b-[length:var(--depth-md)] border-ui-divider p-4 rounded-feature flex flex-col items-center bg-ui-surface">
                  <div className="w-12 h-12 bg-ui-canvas flex items-center justify-center mb-2 rounded-control text-ui-ink">
                    <div dangerouslySetInnerHTML={{ __html: content as string }} />
                  </div>
                  <p className="text-[11px] font-black text-ui-muted text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={path.split('/').pop()}>
                    {path.split('/').pop()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
