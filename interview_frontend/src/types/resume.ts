// Define the structure of the parsed resume data received from the API

export interface ContactInfo {
  email: string | null;
  phone: string | null;
}

export interface StructuredProfile {
  summary?: string;
  core_skills?: string[];
  technical_skills?: string[];
  soft_skills?: string[];
  key_achievements?: string[];
  experience_overview?: string;
  education_overview?: string;
  projects?: string[];
  error?: string; // In case LLM parsing fails
  raw_output?: string; // Raw output if parsing fails
}

export interface ResumeData {
  full_text: string;
  contact_info: ContactInfo;
  skills: {
    technical_skills: string[];
    soft_skills: string[];
    other_skills: string[]; // Might be empty based on parser
  };
  education: Array<{ degree?: string; entities?: unknown[] }>; // Adjust based on actual parser output
  experience: Array<{ text?: string; dates?: unknown[]; organizations?: unknown[] }>; // Adjust based on actual parser output
  sections: { [key: string]: string }; // e.g., { profile: 'summary text' }
  embedding: number[] | null; // Embedding might be null or excluded if not needed in frontend
  structured_profile: StructuredProfile;
}
