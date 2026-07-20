import { Link } from 'wouter';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { getScanHistory, clearHistory, removeFromHistory } from '@/utils/storage';
import { useState } from 'react';
import TriageBadge from '@/components/TriageBadge';
import { format } from 'date-fns';

export default function HistoryScreen() {
  const [history, setHistory] = useState(getScanHistory());

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all scan history? This cannot be undone.')) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this scan?')) {
      removeFromHistory(id);
      setHistory(getScanHistory());
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background max-w-md mx-auto flex flex-col relative pb-10">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">Scan History</h1>
        </div>
        {history.length > 0 && (
          <button onClick={handleClearAll} className="text-xs font-semibold text-destructive uppercase tracking-wider p-2">
            Clear All
          </button>
        )}
      </header>

      <div className="p-4 flex-1">
        {history.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
              <HistoryIcon />
            </div>
            <h2 className="text-lg font-bold mb-2">No History Yet</h2>
            <p className="text-sm text-muted-foreground mb-6">Completed scans will appear here.</p>
            <Link href="/scan" className="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold shadow-sm">
              Start a Scan
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <Link 
                key={item.id} 
                href={`/history/${item.id}`}
                className="block bg-card border rounded-xl p-4 shadow-sm active:scale-[0.98] transition-transform relative group"
              >
                <div className="flex gap-4">
                  {item.thumbnailDataUrl ? (
                    <div className="w-16 h-16 bg-black rounded-lg overflow-hidden shrink-0 border">
                      <img src={item.thumbnailDataUrl} alt="" className="w-full h-full object-cover opacity-80" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-secondary rounded-lg shrink-0 border flex items-center justify-center text-xs text-muted-foreground">
                      No Image
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-sm truncate pr-2">
                          {item.peptideName || 'Unnamed Vial'}
                        </h3>
                        <TriageBadge result={item.triageResult} size="sm" className="shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.vendor || 'No vendor'}
                      </p>
                    </div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center mt-2">
                      <span>{format(new Date(item.createdAt), 'MMM d, yyyy • HH:mm')}</span>
                      <span>{item.overallConfidence}% Conf</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={(e) => handleDelete(item.id, e)}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground p-1.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  );
}
