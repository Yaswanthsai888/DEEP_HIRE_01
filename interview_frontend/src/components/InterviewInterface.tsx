import React, { useState, useRef, useEffect } from 'react';
import { submitAnswer } from '../services/api';
import { PaperAirplaneIcon, MicrophoneIcon, StopIcon } from '@heroicons/react/24/solid';

interface Message {
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioUrl?: string;
}

interface InterviewInterfaceProps {
  initialQuestion: string;
  initialAudio?: Blob;
}

const InterviewInterface: React.FC<InterviewInterfaceProps> = ({ initialQuestion, initialAudio }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      text: initialQuestion, 
      isUser: false, 
      timestamp: new Date(),
      audioUrl: initialAudio ? URL.createObjectURL(initialAudio) : undefined
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Clean up audio URLs when component unmounts
    return () => {
      messages.forEach(msg => {
        if (msg.audioUrl) {
          URL.revokeObjectURL(msg.audioUrl);
        }
      });
    };
  }, []);

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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await handleAudioSubmit(audioBlob);
        
        // Stop all tracks of the stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioSubmit = async (audioBlob: Blob) => {
    const userMessage = { 
      text: "Audio Response", 
      isUser: true, 
      timestamp: new Date(),
      audioUrl: URL.createObjectURL(audioBlob)
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Create form data with audio blob
      const formData = new FormData();
      formData.append('answer_audio', audioBlob);

      const response = await fetch('/api/next-question', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to submit audio');

      const questionAudioBlob = await response.blob();
      const questionText = response.headers.get('question-text') || 'No question text available';

      setMessages(prev => [
        ...prev,
        { 
          text: questionText, 
          isUser: false, 
          timestamp: new Date(),
          audioUrl: URL.createObjectURL(questionAudioBlob)
        }
      ]);
    } catch (error) {
      console.error('Error submitting audio:', error);
      setMessages(prev => [
        ...prev,
        { 
          text: 'Sorry, there was an error processing your response.', 
          isUser: false, 
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { text: input, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const nextQuestion = await submitAnswer(input);
      setMessages(prev => [
        ...prev,
        { text: nextQuestion, isUser: false, timestamp: new Date() }
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { text: 'Sorry, there was an error processing your response.', isUser: false, timestamp: new Date() }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play();
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div>{message.text}</div>
              {message.audioUrl && (
                <button
                  onClick={() => playAudio(message.audioUrl!)}
                  className="mt-2 text-sm underline"
                >
                  Play Audio
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading || isRecording}
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className={`${
              isRecording ? 'bg-red-500' : 'bg-blue-500'
            } text-white rounded-lg px-4 py-2 hover:opacity-80 disabled:opacity-50`}
            title={isRecording ? "Stop recording" : "Start recording"}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? (
              <StopIcon className="h-5 w-5" />
            ) : (
              <MicrophoneIcon className="h-5 w-5" />
            )}
          </button>
          <button
            type="submit"
            disabled={isLoading || isRecording || !input.trim()}
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
            title="Send message"
            aria-label="Send message"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default InterviewInterface;