import React, { useEffect, useRef, useState } from 'react';
import { useInterview } from '../../context/InterviewContext';
import { useNavigate } from 'react-router-dom';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';
import FaceTracking from '../../components/FaceTracking';

const API_URL = 'http://localhost:8000';

const InterviewInterface: React.FC = () => {
  const { resumeData, qaHistory, setQaHistory } = useInterview();
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [isFaceVisible, setIsFaceVisible] = useState(true);
  const [showFaceWarning, setShowFaceWarning] = useState(false);
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const faceWarningTimeoutRef = useRef<number | undefined>(undefined);

  const decodeQuestion = (encodedQuestion: string | null): string => {
    if (!encodedQuestion) {
      console.log('No encoded question received');
      return '';
    }
    try {
      return atob(encodedQuestion);
    } catch (error) {
      console.error('Error decoding question:', error);
      return encodedQuestion; // Return original if not base64 encoded
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFaceDetection = (isVisible: boolean) => {
    setIsFaceVisible(isVisible);
    
    if (!isVisible) {
      // Clear any existing timeout
      if (faceWarningTimeoutRef.current) {
        clearTimeout(faceWarningTimeoutRef.current);
      }
      
      // Set a timeout to show warning if face remains invisible
      faceWarningTimeoutRef.current = setTimeout(() => {
        setShowFaceWarning(true);
      }, 3000);
    } else {
      // Clear warning when face is visible again
      setShowFaceWarning(false);
      if (faceWarningTimeoutRef.current) {
        clearTimeout(faceWarningTimeoutRef.current);
      }
    }
  };

  useEffect(() => {
    if (!resumeData) {
      navigate('/');
      return;
    }
    const startInterview = async () => {
      setLoading(true);
      try {
        console.log('Starting interview with data:', resumeData);
        const res = await fetch(`${API_URL}/start-interview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resumeData),
        });
        
        if (!res.ok) {
          throw new Error(`Failed to start interview: ${res.status}`);
        }
        
        // Try to get question from both encoded and raw headers
        const encodedQuestion = res.headers.get('question-text');
        const questionText = decodeQuestion(encodedQuestion);
        console.log('Received question:', questionText);
        
        if (!questionText) {
          throw new Error('No question received');
        }
        
        // Get audio blob from response
        const audioBlob = await res.blob();
        console.log('Received audio blob:', audioBlob);
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setCurrentQuestion(questionText);
        setCurrentAudio(audioUrl);
      } catch (error) {
        console.error('Error starting interview:', error);
      } finally {
        setLoading(false);
      }
    };
    if (qaHistory.length === 0) startInterview();
  }, [resumeData, qaHistory.length, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [qaHistory, currentQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!userAnswer.trim() && !recordedAudio) || loading) return;
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume_data', JSON.stringify(resumeData));
      formData.append('history', JSON.stringify([...qaHistory, { question: currentQuestion, answer: userAnswer }]));
      
      // Add either recorded audio or create a blob from text
      if (recordedAudio) {
        formData.append('answer_audio', recordedAudio);
      } else {
        // Create a simple audio blob from text if no recording
        const textBlob = new Blob([userAnswer], { type: 'text/plain' });
        formData.append('answer_audio', textBlob);
      }

      const res = await fetch(`${API_URL}/next-question`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) throw new Error('Failed to get next question');
      
      // Update history before getting next question
      const newHistory = [...qaHistory, { question: currentQuestion, answer: userAnswer }];
      setQaHistory(newHistory);
      
      const encodedQuestion = res.headers.get('question-text');
      const questionText = decodeQuestion(encodedQuestion);
      if (!questionText) throw new Error('No question received');
      
      // Get audio blob from response
      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      setCurrentQuestion(questionText);
      setCurrentAudio(audioUrl);
      setUserAnswer('');
      setRecordedAudio(null);
    } catch (error) {
      console.error('Error getting next question:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!resumeData) return null;

  return (
    <div className="min-h-screen max-h-screen p-4 flex gap-4">
      {/* Left side - Fixed video feed */}
      <div className="w-[400px] flex flex-col gap-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg p-4 flex-shrink-0">
          <FaceTracking onFaceDetected={handleFaceDetection} />
          {showFaceWarning && (
            <div className="mt-2 p-2 bg-red-500/20 backdrop-blur-sm text-white rounded animate-fade-in">
              Please stay visible in the camera frame during the interview.
            </div>
          )}
        </div>

        {/* Current question audio player */}
        {currentAudio && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg p-4">
            <h3 className="text-white font-medium mb-2">Current Question Audio</h3>
            <audio
              ref={audioRef}
              src={currentAudio}
              controls
              className="w-full"
              onEnded={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = 0;
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Right side - Scrollable Q&A interface */}
      <div className="flex-1 flex flex-col bg-white/10 backdrop-blur-md rounded-lg shadow-lg">
        {/* Chat history */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-4">
            {qaHistory.map((qa, index) => (
              <div key={index} className="space-y-2">
                <div className="bg-blue-500/10 backdrop-blur-sm p-4 rounded">
                  <p className="font-medium text-white">{qa.question}</p>
                </div>
                <div className="bg-gray-500/10 backdrop-blur-sm p-4 rounded ml-8">
                  <p className="text-gray-200">{qa.answer}</p>
                </div>
              </div>
            ))}
            {currentQuestion && (
              <div className="bg-blue-500/10 backdrop-blur-sm p-4 rounded animate-fade-in">
                <p className="font-medium text-white">{currentQuestion}</p>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input form - Fixed at bottom */}
        <div className="border-t border-gray-600/50 p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="flex-1 p-2 border rounded bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading || isRecording || !isFaceVisible}
              />
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2 rounded ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } transition ${!isFaceVisible ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loading || !isFaceVisible}
                title={isRecording ? "Stop Recording" : "Start Recording"}
              >
                {isRecording ? (
                  <StopIcon className="h-5 w-5 text-white" />
                ) : (
                  <MicrophoneIcon className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
            
            {recordedAudio && (
              <div className="bg-gray-500/10 backdrop-blur-sm p-2 rounded">
                <audio src={URL.createObjectURL(recordedAudio)} controls className="w-full" />
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || (!userAnswer.trim() && !recordedAudio) || !isFaceVisible}
              className={`w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition ${
                (loading || !isFaceVisible) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Processing...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InterviewInterface;
