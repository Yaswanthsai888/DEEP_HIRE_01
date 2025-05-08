import axios from 'axios';
import type { Resume, APIError } from '../types/interview';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadResume = async (file: File): Promise<Resume> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<Resume>('/upload-resume', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw handleAPIError(error);
  }
};

export const startInterview = async (resume: Resume): Promise<string> => {
  try {
    const response = await api.post<{ message: string }>('/start-interview', resume);
    return response.data.message;
  } catch (error) {
    throw handleAPIError(error);
  }
};

export const submitAnswer = async (answer: string): Promise<string> => {
  try {
    const response = await api.post<{ next_question: string }>('/submit-answer', { answer });
    return response.data.next_question;
  } catch (error) {
    throw handleAPIError(error);
  }
};

const handleAPIError = (error: unknown): APIError => {
  if (axios.isAxiosError(error)) {
    return {
      message: error.response?.data?.message || 'An error occurred',
      status: error.response?.status || 500,
    };
  }
  return {
    message: 'An unexpected error occurred',
    status: 500,
  };
};