/**
 * Common utility types and functions
 */

/**
 * Message types for status indicators
 */
export type StatusMessageType = '' | 'success' | 'error' | 'warning' | 'loading';

/**
 * Parameters for showing a status message
 */
export interface StatusMessageParams {
    message: string;
    type: StatusMessageType;
    element?: HTMLElement;
    autoClear?: boolean;
    duration?: number;
}

/**
 * Parameters for toggling form state
 */
export interface FormStateParams {
    form: HTMLFormElement;
    enabled: boolean;
}
