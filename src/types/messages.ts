/**
 * Types related to message passing between content scripts, background script, and popups
 */
import { JobData, ExtractJobResponse } from './job';

/**
 * Request to add a job to Notion
 */
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

/**
 * Response from add job request
 */
export interface AddJobResponse {
    success: boolean;
    error?: string;
    requireConfirmation?: boolean;
    jobUrl?: string;
    data?: any; // AI analysis or other data
}

/**
 * Message for extracting job information
 */
export interface ExtractJobInfoMessage {
    action: "extractJobInfo";
}

/**
 * Message for toggling the sidebar
 */
export interface ToggleSidebarMessage {
    action: "toggleSidebar";
}

/**
 * Message for filling job info in the form
 */
export interface FillJobInfoMessage {
    action: "fillJobInfo";
    data: ExtractJobResponse;
}

/**
 * Union type of all possible messages
 */
export type ChromeMessage = 
    | AddJobRequest 
    | ExtractJobInfoMessage 
    | ToggleSidebarMessage
    | FillJobInfoMessage;
