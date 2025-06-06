/**
 * Common utility functions for the application
 */

import {
	StatusMessageParams,
	FormStateParams,
	StatusMessageType,
} from "./types/utils";
import { ANIMATIONS } from "./types/constants";

/**
 * Shows a status message with optional auto-clearing
 */
export function showStatusMessage({
	message,
	type,
	element,
	autoClear = true,
	duration,
}: StatusMessageParams): void {
	if (!element) return;

	element.textContent = message;
	element.className = "";

	if (type) {
		element.classList.add(type);
	}

	// Auto-clear success and warning messages after a delay
	if (autoClear && (type === "success" || type === "warning")) {
		const clearDelay =
			duration ||
			(type === "success"
				? ANIMATIONS.SUCCESS_MESSAGE_DURATION
				: ANIMATIONS.WARNING_MESSAGE_DURATION);

		setTimeout(() => {
			element.textContent = "";
			element.className = "";
		}, clearDelay);
	}
}

/**
 * Toggles form elements between enabled and disabled states
 */
export function toggleFormState({ form, enabled }: FormStateParams): void {
	const formElements = form.elements;
	for (let i = 0; i < formElements.length; i++) {
		(formElements[i] as HTMLInputElement).disabled = !enabled;
	}
}

/**
 * Logs errors with consistent formatting
 */
export function logError(context: string, error: unknown): void {
	console.error(`[Notion Job Tracker] ${context}:`, error);
}
