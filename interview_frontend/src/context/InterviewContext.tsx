import React, { createContext, useContext, useState } from 'react';
import type { ResumeData } from '../types/resume';

interface QA {
  question: string;
  answer: string;
}

interface InterviewContextType {
  resumeData: ResumeData | null;
  setResumeData: (data: ResumeData | null) => void;
  qaHistory: QA[];
  setQaHistory: (history: QA[]) => void;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [qaHistory, setQaHistory] = useState<QA[]>([]);

  return (
    <InterviewContext.Provider value={{ resumeData, setResumeData, qaHistory, setQaHistory }}>
      {children}
    </InterviewContext.Provider>
  );
};

export const useInterview = () => {
  const context = useContext(InterviewContext);
  if (!context) throw new Error('useInterview must be used within InterviewProvider');
  return context;
};
