/**
 * Types related to storage (chrome.storage and local storage)
 */

/**
 * Settings stored in chrome.storage
 */
export interface StoredSettings {
    notionToken?: string;
    databaseId?: string;
    enhanceAi?: boolean;
    sidebarOpen?: boolean;
}
