export interface Resume {
  full_text: string;
  contact_info: {
    email: string | null;
    phone: string | null;
  };
  skills: {
    technical_skills: string[];
    soft_skills: string[];
    other_skills: string[];
  };
  education: Array<{
    degree: string;
    entities: string[];
  }>;
  experience: Array<{
    text: string;
    dates: string[];
    organizations: string[];
  }>;
  sections: {
    profile: string;
  };
  structured_profile: {
    summary: string;
    core_skills: string[];
    key_achievements: string[];
    experience_overview: string;
    education_overview: string;
    projects: string[];
    technical_skills: string[];
    soft_skills: string[];
  };
}

export interface InterviewState {
  currentQuestion: string;
  answers: string[];
  isLoading: boolean;
  error: string | null;
}

export interface APIError {
  message: string;
  status: number;
}