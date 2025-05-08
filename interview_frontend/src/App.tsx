import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { InterviewProvider } from './context/InterviewContext';
import ResumeUpload from './components/ResumeUpload';
import InterviewInterface from './features/interview/InterviewInterface';
import { preloadModel, checkBrowserSupport } from './utils/preload';
import MainLayout from './layouts/MainLayout';

const App: React.FC = () => {
  useEffect(() => {
    const { supported, reason } = checkBrowserSupport();
    if (!supported) {
      alert(reason);
      return;
    }
    preloadModel();
  }, []);

  return (
    <InterviewProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<ResumeUpload />} />
            <Route path="/interview" element={<InterviewInterface />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </MainLayout>
      </Router>
    </InterviewProvider>
  );
};

export default App;
