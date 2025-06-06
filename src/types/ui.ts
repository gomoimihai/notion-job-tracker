/**
 * Types related to UI elements and interactions
 */

/**
 * Sidebar elements interface for better type safety
 */
export interface SidebarElements {
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
}

/**
 * LinkedIn selectors by type
 */
export interface LinkedInSelectorsMap {
    title: string[];
    company: string[];
    location: string[];
    salary: string[];
    description: string[];
}

/**
 * Reference object for sidebar state
 */
export interface SidebarStateRef {
    value: boolean;
}
