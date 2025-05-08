import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ResumeData } from '../types/resume'; // Import the types we defined
import { useNavigate } from 'react-router-dom';
import { useInterview } from '../context/InterviewContext';

const API_URL = 'http://localhost:8000'; // Your backend API URL

const ResumeUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setResumeData: setInterviewResumeData, setQaHistory } = useInterview();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setError(null); // Clear previous errors
        setResumeData(null); // Clear previous data
      } else {
        setSelectedFile(null);
        setError('Please select a PDF file.');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResumeData(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${API_URL}/upload-resume`, {
        method: 'POST',
        body: formData,
        // Headers are not strictly needed for FormData with fetch,
        // but Content-Type will be set automatically to multipart/form-data
      });

      if (!response.ok) {
        // Try to parse error message from backend
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
        } catch {
            // Ignore if response is not JSON
        }
        throw new Error(errorDetail);
      }

      const data: ResumeData = await response.json();
      setResumeData(data);

    } catch (err: unknown) {
      console.error('Upload failed:', err);
      if (err instanceof Error) {
        setError(`Failed to upload or parse resume: ${err.message}`);
      } else {
        setError('Failed to upload or parse resume: An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-2 text-blue-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-3xl">upload_file</span>
          Upload Resume
        </h2>
        <p className="text-gray-500 mb-6">Upload your PDF resume to begin the AI interview process.</p>
        <div className="flex items-center space-x-4 mb-4">
          <label htmlFor="resume-upload" className="sr-only">
            Upload your resume (PDF)
          </label>
          <input
            id="resume-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            title="Upload your resume (PDF)"
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Upload & Parse'}
          </button>
        </div>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {resumeData && (
          <div className="mt-6">
            <h3 className="text-xl font-semibold mb-2 border-b pb-2">Parsed Resume Information</h3>

            {/* Contact Info */}
            <div className="mb-4">
              <h4 className="text-lg font-medium mb-2 text-gray-700">📧 Contact Information</h4>
              <p>Email: {resumeData.contact_info.email || 'N/A'}</p>
              <p>Phone: {resumeData.contact_info.phone || 'N/A'}</p>
            </div>

            {/* Technical Skills */}
            {resumeData.structured_profile?.technical_skills && resumeData.structured_profile.technical_skills.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2 text-gray-700">🛠️ Technical Skills</h4>
                <ul className="list-disc list-inside grid grid-cols-2 md:grid-cols-3 gap-x-4">
                  {resumeData.structured_profile.technical_skills.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Projects */}
            {resumeData.structured_profile?.projects && resumeData.structured_profile.projects.length > 0 && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2 text-gray-700">🔹 Projects</h4>
                {resumeData.structured_profile.projects.map((project, index) => (
                  <div key={index} className="mb-2 pb-2 border-b last:border-b-0">
                    <p><strong>{index + 1}.</strong> {project}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Education */}
            {resumeData.structured_profile?.education_overview && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2 text-gray-700">🎓 Education</h4>
                {/* Displaying as pre-wrap to preserve formatting if any */}
                <p className="whitespace-pre-wrap">{resumeData.structured_profile.education_overview}</p>
              </div>
            )}

            {/* Experience Overview */}
            {resumeData.structured_profile?.experience_overview && (
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2 text-gray-700">💼 Experience Overview</h4>
                <p className="whitespace-pre-wrap">{resumeData.structured_profile.experience_overview}</p>
              </div>
            )}

            {/* Start Interview Button */}
            <div className="mt-6 flex justify-end">
              <button
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                onClick={() => {
                  setInterviewResumeData(resumeData);
                  setQaHistory([]); // Reset Q&A history
                  navigate('/interview');
                }}
              >
                Start Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeUpload;