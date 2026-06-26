export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'local';

export interface ResearchOutput {
  keyPoints: string[];
  statistics: string[];
  subtopics: string[];
}

export interface OutlineOutput {
  title: string;
  sections: {
    heading: string;
    points: string[];
  }[];
}

export interface DraftOutput {
  content: string; // Markdown formatted article
}

export interface SEOOutput {
  title: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
}

export interface SocialOutput {
  twitterThread: string[];
  linkedInPost: string;
  emailSubjectLines: string[];
}

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface PipelineState {
  research: { status: PipelineStepStatus; output?: ResearchOutput; error?: string };
  outline: { status: PipelineStepStatus; output?: OutlineOutput; error?: string };
  draft: { status: PipelineStepStatus; output?: DraftOutput; error?: string };
  seo: { status: PipelineStepStatus; output?: SEOOutput; error?: string };
  social: { status: PipelineStepStatus; output?: SocialOutput; error?: string };
}
