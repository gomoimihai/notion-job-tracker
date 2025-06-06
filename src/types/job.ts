/**
 * Types related to job information
 */

/**
 * Represents the basic job information extracted from job listing pages
 */
export interface JobInfo {
    company: string;
    position: string;
    location: string;
    salary: string;
    description: string;
    error?: string;
    url?: string; // Optional URL for the job listing
}

/**
 * Represents the complete job data used in the Notion database
 */
export interface JobData {
    company: string;
    position: string;
    location: string;
    jobUrl: string;
    salary: string;
    status: string;
    description: string;
    notes: string;
}

/**
 * Response from job data extraction
 */
export interface ExtractJobResponse {
    company?: string;
    position?: string;
    location?: string;
    salary?: string;
    description?: string;
    url?: string;
    error?: string;
}
