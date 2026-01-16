import React from 'react';
import { LiveJobsFeed } from './components/LiveJobsFeed';

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              QuantumHire AI
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">Tier-Based Job Feed</span>
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
              LIVE
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <LiveJobsFeed />
      </main>
    </div>
  );
}

export default App;
