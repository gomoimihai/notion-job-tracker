/**
 * Types related to AI functionality
 */

/**
 * Input data for job analysis
 */
export interface JobAnalysisInput {
    description: string;
}

/**
 * Output schema for job analysis
 */
export interface JobAnalysisOutput {
    title: string;
    salary: string;
}
