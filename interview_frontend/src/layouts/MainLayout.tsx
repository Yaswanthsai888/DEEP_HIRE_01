import React from 'react';
import AnimatedBackground from '../components/AnimatedBackground';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AnimatedBackground>
    <header className="bg-white/10 backdrop-blur-sm shadow-lg py-4 px-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-white tracking-tight">TalentTrack AI Interview</h1>
      <span className="text-sm text-gray-200">Powered by Ollama & RAG</span>
    </header>
    <main className="flex-1 flex flex-col items-center justify-center px-2">
      {children}
    </main>
    <footer className="text-center text-xs text-gray-300 py-2">
      &copy; {new Date().getFullYear()} TalentTrack. All rights reserved.
    </footer>
  </AnimatedBackground>
);

export default MainLayout;