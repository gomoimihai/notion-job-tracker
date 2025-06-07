import { JobAnalysis } from '../ai';

export type StatusMessageType = '' | 'success' | 'error' | 'warning' | 'loading';

export interface StatusMessageParams {
    message: string;
    type: StatusMessageType;
    element?: HTMLElement;
    autoClear?: boolean;
    duration?: number;
}

export interface FormStateParams {
    form: HTMLFormElement;
    enabled: boolean;
}
export interface SidebarElements {
    jobId: HTMLInputElement;
    jobForm: HTMLFormElement;
    setupContainer: HTMLElement;
    jobFormContainer: HTMLElement;
    settingsButton: HTMLButtonElement;
    saveSettingsButton: HTMLButtonElement;
    helpLink: HTMLAnchorElement;
    statusMessage: HTMLElement;
    toggleSidebar: HTMLElement;
    sidebarContainer: HTMLElement;
    companyInput: HTMLInputElement;
    positionInput: HTMLInputElement;
    locationInput: HTMLInputElement;
    salaryInput: HTMLInputElement;
    jobUrlInput: HTMLInputElement;
    statusSelect: HTMLSelectElement;
    descriptionTextarea: HTMLTextAreaElement;
    notesTextarea: HTMLTextAreaElement;
    notionTokenInput: HTMLInputElement;
    databaseIdInput: HTMLInputElement;
    enhanceAiCheckbox: HTMLInputElement;
    // AI Notes UI elements
    aiNotesContainer: HTMLElement;
    aiNotesContent: HTMLElement;
}
export interface LinkedInSelectorsMap {
    title: string[];
    company: string[];
    location: string[];
    salary: string[];
    description: string[];
}

export interface SidebarStateRef {
    value: boolean;
}
export interface StoredSettings {
    notionToken?: string;
    databaseId?: string;
    enhanceAi?: boolean;
    sidebarOpen?: boolean;
}

export interface NotionDbSchema {
    properties: {
        [key: string]: {
            type: string;
            rich_text?: object;
            number?: object;
            select?: object;
            date?: object;
            url?: object;
        };
    };
}

export interface AddJobToNotionParams {
    notionToken: string;
    databaseId: string;
    jobData: import('./job').JobData;
}

export interface AddJobRequest {
    action: string;
    data: {
        notionToken: string;
        databaseId: string;
        jobData: JobData;
        forceSubmit?: boolean;
        enhanceAi?: boolean;
    };
}
export interface AddJobResponse {
    success: boolean;
    error?: string;
    requireConfirmation?: boolean;
    jobUrl?: string;
    data?: JobAnalysis;
    // AI analysis response fields
    title?: string;
    salary?: string;
    keyPoints?: string[];
}

export interface AINotes {
    title?: string;
    salary?: string;
    technicalStack?: string;
    summary?: string[];
    location?: string;
    [key: string]: any;
}

export interface ExtractJobInfoMessage {
    action: "extractJobInfo";
}

export interface ToggleSidebarMessage {
    action: "toggleSidebar";
}
export interface FillJobInfoMessage {
    action: "fillJobInfo";
    data: ExtractJobResponse;
}

export type ChromeMessage = 
    | AddJobRequest 
    | ExtractJobInfoMessage 
    | ToggleSidebarMessage
    | FillJobInfoMessage;

export interface JobInfo {
    id: string;
    company: string;
    position: string;
    location: string;
    salary: string;
    description: string;
    error?: string;
    url?: string; // Optional URL for the job listing
}

export interface JobData {
    id: string;
    company: string;
    position: string;
    location: string;
    jobUrl: string;
    salary: string;
    status: string;
    description: string;
    notes: string;
}
export interface ExtractJobResponse {
    id: string;
    company?: string;
    position?: string;
    location?: string;
    salary?: string;
    description?: string;
    error?: string;
    url?: string;
}

export interface JobAnalysisInput {
    description: string;
}

export interface JobAnalysisOutput {
    title: string;
    salary: string;
    keyPoints?: string[];
}
