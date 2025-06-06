/**
 * Types related to Notion API integration
 */

/**
 * Represents the Notion database schema
 */
export interface NotionDbSchema {
    properties: {
        [key: string]: {
            type: string;
            // Other possible fields that might be needed
            rich_text?: object; // For rich_text properties
            number?: object;    // For number properties
            select?: object;    // For select properties
            date?: object;      // For date properties
            url?: object;       // For URL properties
            // Add other property types as needed
        };
    };
}

/**
 * Parameters for adding a job to Notion
 */
export interface AddJobToNotionParams {
    notionToken: string;
    databaseId: string;
    jobData: import('./job').JobData;
}
