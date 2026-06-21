import React, { useEffect, useState } from 'react';
import { fetchAllMnemonicsDebug, clearAllMnemonics } from '../../services/aiService';
import { debugLogger, DebugLog } from '../../utils/debugLogger';

const icons = import.meta.glob('/src/assets/icons/*.svg', { query: '?raw', import: 'default', eager: true });

export const DebugWindow = () => {
  const [activeTab, setActiveTab] = useState<'icons' | 'mnemonics' | 'logs'>('logs');
  const [mnemonics, setMnemonics] = useState<any[]>([]);
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
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('permissions')) {
        setErrorMessage("Permission denied. You must be signed in to clear the global database.");
      } else {
        setErrorMessage(err.message || 'An error occurred.');
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
      default: return 'bg-[#F7F7F7] text-[#4B4B4B] border-[#E5E5E5]';
    }
  };

  const getLevelBorderClass = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return 'border-rose-300 bg-rose-50/50';
      case 'warn': return 'border-amber-300 bg-amber-50/50';
      default: return 'border-[#E5E5E5] bg-white';
    }
  };

  const clearLogStream = () => {
    debugLogger.clear();
  };

  return (
    <div className="p-6 md:p-8 h-full flex flex-col font-sans bg-[#F7F7F7]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#4B4B4B]">Debug Control Panel</h1>
          <p className="text-sm text-[#AFB6BB]">Monitor AI processes, cache statuses, database updates, and system integrity.</p>
        </div>
        
        <div className="flex gap-2">
          <a 
            href="https://supabase.com/dashboard/projects" 
            target="_blank" rel="noreferrer"
            className="px-4 py-2 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl border-b-[4px] active:border-b-0 active:translate-y-[4px] bg-[#1C1C1C] border-black text-white hover:brightness-110 transition-all select-none"
          >
            Open Supabase DB
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-[#E5E5E5] pb-4">
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wide rounded-xl border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all select-none ${
            activeTab === 'logs' 
              ? 'bg-[#58CC02] border-[#46A302] text-white' 
              : 'bg-white border-[#E5E5E5] text-[#4B4B4B] hover:bg-[#F7F7F7]'
          }`}
        >
          Active Log Stream & Errors
        </button>
        <button 
          onClick={() => setActiveTab('mnemonics')}
          className={`px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wide rounded-xl border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all select-none ${
            activeTab === 'mnemonics' 
              ? 'bg-[#58CC02] border-[#46A302] text-white' 
              : 'bg-white border-[#E5E5E5] text-[#4B4B4B] hover:bg-[#F7F7F7]'
          }`}
        >
          Mnemonic Firestore Cache ({mnemonics.length})
        </button>
        <button 
          onClick={() => setActiveTab('icons')}
          className={`px-4 py-2 text-xs md:text-sm font-black uppercase tracking-wide rounded-xl border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all select-none ${
            activeTab === 'icons' 
              ? 'bg-[#58CC02] border-[#46A302] text-white' 
              : 'bg-white border-[#E5E5E5] text-[#4B4B4B] hover:bg-[#F7F7F7]'
          }`}
        >
          UI Icons List
        </button>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'logs' && (
          <div className="h-full flex flex-col gap-3 min-h-0">
            <div className="flex justify-between items-center bg-[#F1F2F4] p-3 rounded-xl border border-[#D5D5D5]">
              <span className="text-xs font-bold text-[#4B4B4B]">
                REAL-TIME ACTIVITY FEED ({logs.length} events logged)
              </span>
              <button 
                onClick={clearLogStream}
                className="px-3 py-1 bg-white border border-[#E5E5E5] hover:bg-[#F7F7F7] text-xs font-bold text-rose-500 rounded-lg active:translate-y-[1px]"
              >
                Clear Log List
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pb-24 space-y-3">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 bg-white border-2 border-dashed border-[#E5E5E5] rounded-2xl text-center">
                  <p className="font-bold text-[#4D4D4D]">No active logs captured yet.</p>
                  <p className="text-xs text-[#AFB6BB] mt-1 max-w-sm">Interact with flashcards or trigger AI story generation to watch background API processes stream live right here.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`p-4 rounded-xl border-[2px] transition-all leading-normal flex flex-col gap-2 ${getLevelBorderClass(log.level)}`}
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${getCategoryClass(log.category)}`}>
                          {log.category}
                        </span>
                        <span className="text-xs font-mono text-[#AFB6BB]">
                          [{log.timestamp}]
                        </span>
                        {log.level !== 'info' && (
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${log.level === 'error' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {log.level}
                          </span>
                        )}
                      </div>
                      
                      {log.details && (
                        <button 
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="text-xs font-black text-[#58CC02] hover:underline"
                        >
                          {expandedLogId === log.id ? 'Hide Trace ▲' : 'Inspect Payload ▼'}
                        </button>
                      )}
                    </div>

                    <p className={`text-[14px] font-bold ${log.level === 'error' ? 'text-rose-800' : log.level === 'warn' ? 'text-amber-800' : 'text-[#4B4B4B]'}`}>
                      {log.message}
                    </p>

                    {log.details && expandedLogId === log.id && (
                      <div className="mt-2 bg-[#1C1C1C] p-3 rounded-lg overflow-x-auto text-[11px] font-mono text-emerald-400 border border-emerald-500 max-h-64 whitespace-pre">
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
            <div className="text-sm text-[#AFB6BB] bg-amber-50 p-4 border border-amber-200 rounded-xl">
              <strong>Mnemonics Cache:</strong> Memory hooks generated by the AI are globally cached in Supabase (table: <code>mnemonics</code>). Dictionary entries (pinyin, meanings, character breakdowns) are also cached in Supabase.
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border-2 border-[#E5E5E5] gap-4">
              <div>
                <h4 className="font-extrabold text-[#4B4B4B] text-sm">GLOBAL DATABASE CONTROLS</h4>
                <p className="text-xs text-[#AFB6BB]">{mnemonics.length} items currently in the active Firestore database cache.</p>
              </div>
              {!showConfirmDelete ? (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="px-4 py-2 bg-[#FF4B4B] border-b-[4px] border-[#C82333] active:border-b-0 active:translate-y-[4px] text-white text-xs font-black uppercase rounded-xl transition-all hover:brightness-110 select-none"
                >
                  Clear All Mnemonics
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={clearAllMnemonicsFromDb}
                    className="px-3 py-2 bg-[#58CC02] border-b-[4px] border-[#46A302] text-white text-xs font-black uppercase rounded-xl transition-all hover:brightness-110 select-none"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-3 py-2 bg-white border-2 border-[#E5E5E5] border-b-[4px] active:border-b-[2px] active:translate-y-[2px] text-[#4B4B4B] text-xs font-black uppercase rounded-xl transition-all hover:bg-[#F7F7F7] select-none"
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
              <p className="text-[#AFB6BB] text-sm animate-pulse">Loading mnemonics from Supabase...</p>
            ) : mnemonics.length > 0 ? (
              mnemonics.map((m) => (
                <div key={m.character} className="border-2 border-[#E5E5E5] p-5 rounded-2xl flex flex-col bg-white shadow-sm hover:border-[#AFB6BB] transition-all">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#F1F1F1]">
                    <span className="font-extrabold text-[#4B4B4B] text-2xl">{m.character}</span>
                    <span className="text-xs text-[#AFB6BB]">
                      {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString() : 'Cached Global Memory'}
                    </span>
                  </div>
                  <p className="text-[#4B4B4B] font-bold whitespace-pre-wrap text-[15px] bg-[#F7F7F7] p-3 rounded-xl border border-[#E5E5E5] leading-relaxed">
                    {m.mnemonic}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-[#AFB6BB] bg-white border-2 border-dashed border-[#E5E5E5] rounded-2xl font-bold">
                No mnemonics found in the global Firestore cache.
              </div>
            )}
          </div>
        )}

        {activeTab === 'icons' && (
          <div className="h-full overflow-y-auto pb-24">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {Object.entries(icons).map(([path, content]) => (
                <div key={path} className="border-2 border-[#E5E5E5] p-4 rounded-2xl flex flex-col items-center bg-white shadow-sm">
                  <div className="w-12 h-12 bg-[#F7F7F7] flex items-center justify-center mb-2 rounded-xl text-[#4B4B4B]">
                    <div dangerouslySetInnerHTML={{ __html: content as string }} />
                  </div>
                  <p className="text-[11px] font-black text-[#858585] text-center max-w-full overflow-hidden text-ellipsis whitespace-nowrap" title={path.split('/').pop()}>
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
