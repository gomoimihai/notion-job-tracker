// sidebarInjector.ts
import { JobInfo } from "./types/job";
import { FillJobInfoMessage } from "./types/messages";
import { LinkedInSelectorsMap, SidebarStateRef } from "./types/ui";
import { UI } from "./types/constants";
import { logError } from "./utils";

// Extract UI constants for easier access
const SIDEBAR_WIDTH = UI.SIDEBAR.WIDTH;
const TOGGLE_BUTTON_WIDTH = UI.SIDEBAR.TOGGLE_BUTTON_WIDTH;
const TOGGLE_BUTTON_HEIGHT = UI.SIDEBAR.TOGGLE_BUTTON_HEIGHT;
const STORAGE_KEY = UI.SIDEBAR.STORAGE_KEY;
const URL_CHANGE_DETECTION_DELAY = UI.SIDEBAR.URL_CHANGE_DETECTION_DELAY;

/**
 * Helper: Create a message to send job info to the sidebar
 */
function createFillJobInfoMessage(jobInfo: JobInfo): FillJobInfoMessage {
	return {
		action: "fillJobInfo",
		data: jobInfo,
	};
}

/**
 * Helper: Save the sidebar state to storage
 */
function saveSidebarState(isOpen: boolean) {
	// Try chrome.storage.local first, fallback to localStorage
	try {
		chrome.storage.local.set({ sidebarOpen: isOpen });
	} catch (error) {
		logError("Failed to save sidebar state to chrome.storage", error);

		try {
			localStorage.setItem(STORAGE_KEY, String(isOpen));
		} catch (localError) {
			logError("Failed to save sidebar state to localStorage", localError);
		}
	}
}

/**
 * Helper: Extract and send job info to the sidebar iframe
 */
async function extractAndSendJobInfo(iframe: HTMLIFrameElement) {
	try {
		const jobInfo = await extractJobInfo();
		iframe.contentWindow?.postMessage(createFillJobInfoMessage(jobInfo), "*");
	} catch (error) {
		logError("Failed to extract or send job info", error);
	}
}

/**
 * Helper: Toggle sidebar visibility
 */
function toggleSidebar(
	iframe: HTMLIFrameElement,
	toggleButton: HTMLDivElement,
	isOpen: boolean,
): boolean {
	const newState = !isOpen;

	if (newState) {
		// Open sidebar
		iframe.style.width = SIDEBAR_WIDTH;
		toggleButton.innerHTML = "<span>›</span>";
		toggleButton.style.right = SIDEBAR_WIDTH;

		// Extract and send job info
		extractAndSendJobInfo(iframe);
	} else {
		// Close sidebar
		iframe.style.width = "0";
		toggleButton.innerHTML =
			'<span style="transform: rotate(180deg); display: block;">›</span>';
		toggleButton.style.right = "0";
	}

	// Save state
	saveSidebarState(newState);
	return newState;
}

/**
 * Create and inject the sidebar iframe
 */
function createSidebarIframe(): HTMLIFrameElement {
	const iframe = document.createElement("iframe");
	iframe.src = chrome.runtime.getURL("sidebar.html");
	iframe.id = "notion-job-tracker-sidebar";
	iframe.style.position = "fixed";
	iframe.style.top = "0";
	iframe.style.right = "0";
	iframe.style.width = "0px"; // Start with 0 width
	iframe.style.height = "100%";
	iframe.style.border = "none";
	iframe.style.zIndex = "10000";
	iframe.style.transition = "width 0.3s ease-in-out";

	// Add the iframe to the page
	document.body.appendChild(iframe);
	return iframe;
}

/**
 * Create toggle button for the sidebar
 */
function createToggleButton(): HTMLDivElement {
	const toggleButton = document.createElement("div");
	toggleButton.id = "notion-job-tracker-toggle";
	toggleButton.innerHTML =
		'<span style="transform: rotate(180deg); display: block;">›</span>';
	toggleButton.style.position = "fixed";
	toggleButton.style.right = "0";
	toggleButton.style.top = "50%";
	toggleButton.style.transform = "translateY(-50%)";
	toggleButton.style.width = TOGGLE_BUTTON_WIDTH;
	toggleButton.style.height = TOGGLE_BUTTON_HEIGHT;
	toggleButton.style.backgroundColor = "#037dde";
	toggleButton.style.color = "white";
	toggleButton.style.display = "flex";
	toggleButton.style.alignItems = "center";
	toggleButton.style.justifyContent = "center";
	toggleButton.style.cursor = "pointer";
	toggleButton.style.borderRadius = "5px 0 0 5px";
	toggleButton.style.boxShadow = "-3px 0 5px rgba(0, 0, 0, 0.1)";
	toggleButton.style.zIndex = "9999";
	toggleButton.style.fontSize = "20px";
	toggleButton.style.fontWeight = "bold";

	// Add the toggle button to the page
	document.body.appendChild(toggleButton);
	return toggleButton;
}

/**
 * Setup URL change observer
 */
function setupUrlChangeObserver(
	iframe: HTMLIFrameElement,
	sidebarOpenRef: SidebarStateRef,
) {
	let lastUrl = window.location.href;

	const urlObserver = new MutationObserver(() => {
		const currentUrl = window.location.href;
		if (currentUrl !== lastUrl) {
			console.log("URL changed from", lastUrl, "to", currentUrl);
			lastUrl = currentUrl;

			// Wait a moment for the page content to update
			setTimeout(() => {
				if (sidebarOpenRef.value) {
					extractAndSendJobInfo(iframe);
				}
			}, URL_CHANGE_DETECTION_DELAY);
		}
	});

	// Start observing URL changes
	urlObserver.observe(document, { subtree: true, childList: true });
}

/**
 * Setup message listeners for the sidebar
 */
function setupMessageListeners(
	iframe: HTMLIFrameElement,
	toggleButton: HTMLDivElement,
	sidebarOpenRef: SidebarStateRef,
) {
	// Listen for messages from the sidebar iframe
	window.addEventListener("message", (event) => {
		// Make sure the message is from our extension
		if (event.origin === chrome.runtime.getURL("").slice(0, -1)) {
			if (event.data.action === "toggleSidebar") {
				sidebarOpenRef.value = toggleSidebar(
					iframe,
					toggleButton,
					sidebarOpenRef.value,
				);
			} else if (event.data.action === "extractJobInfo") {
				extractAndSendJobInfo(iframe);
			}
		}
	});

	// Listen for messages from the extension background script
	try {
		chrome.runtime.onMessage.addListener((request) => {
			if (request.action === "toggleSidebar") {
				sidebarOpenRef.value = toggleSidebar(
					iframe,
					toggleButton,
					sidebarOpenRef.value,
				);
			} else if (request.action === "extractJobInfo") {
				extractAndSendJobInfo(iframe);
				return true;
			}
			return true;
		});
	} catch (error) {
		logError("Failed to add chrome.runtime message listener", error);
	}
}

/**
 * Restore sidebar state from storage
 */
async function restoreSidebarState(
	iframe: HTMLIFrameElement,
	toggleButton: HTMLDivElement,
	sidebarOpenRef: SidebarStateRef,
): Promise<boolean> {
	// First try using chrome.storage.local
	try {
		return new Promise((resolve) => {
			chrome.storage.local.get([STORAGE_KEY.replace(/-/g, "")], (result) => {
				if (result.sidebarOpen) {
					sidebarOpenRef.value = true;
					iframe.style.width = SIDEBAR_WIDTH;
					toggleButton.innerHTML = "<span>›</span>";
					toggleButton.style.right = SIDEBAR_WIDTH;
					extractAndSendJobInfo(iframe);
					resolve(true);
				} else {
					resolve(false);
				}
			});
		});
	} catch (error) {
		logError("Failed to read sidebar state from chrome.storage", error);

		// Fallback to localStorage
		try {
			const savedState = localStorage.getItem(STORAGE_KEY);
			if (savedState === "true") {
				sidebarOpenRef.value = true;
				iframe.style.width = SIDEBAR_WIDTH;
				toggleButton.innerHTML = "<span>›</span>";
				toggleButton.style.right = SIDEBAR_WIDTH;
				extractAndSendJobInfo(iframe);
				return true;
			}
		} catch (localError) {
			logError("Failed to read sidebar state from localStorage", localError);
		}
	}
	return false;
}

/**
 * Function to inject the sidebar into the page
 */
function injectSidebar() {
	// Create UI elements
	const iframe = createSidebarIframe();
	const toggleButton = createToggleButton();
	// Use an object for sidebarOpen to allow it to be passed by reference
	const sidebarOpenRef: SidebarStateRef = { value: false };

	// Setup URL change detection
	setupUrlChangeObserver(iframe, sidebarOpenRef);

	// Restore sidebar state from storage
	restoreSidebarState(iframe, toggleButton, sidebarOpenRef);

	// Setup message listeners
	setupMessageListeners(iframe, toggleButton, sidebarOpenRef);

	// Handle toggle button click
	toggleButton.addEventListener("click", () => {
		sidebarOpenRef.value = toggleSidebar(
			iframe,
			toggleButton,
			sidebarOpenRef.value,
		);
	});
}

// Initialize the extension
(function initialize() {
	// Check if the page already has our sidebar
	if (!document.getElementById("notion-job-tracker-sidebar")) {
		injectSidebar();
	}
})();

// Listen for content script messages
try {
	chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
		if (request.action === "extractJobInfo") {
			// Forward this to the existing content script that handles job extraction
			extractJobInfo()
				.then((jobInfo) => {
					sendResponse(jobInfo);
				})
				.catch((error) => {
					sendResponse({ error: error.message });
				});
			return true; // Indicates we'll send a response asynchronously
		}
	});
} catch (error) {
	logError(
		"Failed to add chrome.runtime message listener for extractJobInfo",
		error,
	);
}

/**
 * LinkedIn selectors for different job page elements
 */
const LinkedInSelectors: LinkedInSelectorsMap = {
	title: [
		".job-details-jobs-unified-top-card__job-title", // New job page layout
		"h1.top-card-layout__title", // Another possible layout
		"h1.job-title", // Another possible layout
		"h2.t-24.t-bold.jobs-unified-top-card__job-title", // Additional selector for modern LinkedIn
		".jobs-unified-top-card__job-title", // Generic class
	],
	company: [
		".topcard__org-name-link", // Standard company link
		".job-details-jobs-unified-top-card__company-name", // New layout company name
		'a[data-tracking-control-name="public_jobs_topcard-org-name"]', // Tracking attribute
		".jobs-unified-top-card__company-name", // Another variation
		'a[data-tracking-control-name="public_jobs_topcard_company_name"]', // Another tracking attribute
		"a[data-test-job-company-name]", // Data attribute selector
		".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__company-name", // Nested selector
	],
	location: [
		".job-details-jobs-unified-top-card__bullet", // New job page layout
		".job-details-jobs-unified-top-card__workplace-type", // New job page layout for remote
		".topcard__flavor--bullet", // Older job page layout
		".job-details-jobs-unified-top-card__company-name + span", // Sibling of company name
		"span.location", // Standard location span
		".jobs-unified-top-card__bullet", // Generic bullet class
		".jobs-unified-top-card__workplace-type", // Workplace type
		".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__bullet", // Nested structure
	],
	salary: [
		".compensation__salary", // Standard salary
		".job-details-jobs-unified-top-card__job-insight > .job-details-jobs-unified-top-card__job-insight-view-model-secondary", // New layout salary
		".jobs-unified-top-card__job-insight:contains('$')", // Modern LinkedIn salary
		".jobs-unified-top-card__job-insight-container .jobs-unified-top-card__job-insight:contains('$')", // Nested structure
	],
	description: [
		".job-details-jobs-unified-top-card__description-container", // New job page description container
		".show-more-less-html__markup", // Another description container
		"#job-details", // Job details section
		".description__text", // Older description text layout
		".jobs-description", // Modern description container
		".jobs-description-content", // Content within description
		".jobs-box__html-content", // HTML content box
	],
};

/**
 * Extract text content from the first matching selector
 * @param selectors - Array of CSS selectors to try
 * @param containsText - Optional text that the element should contain (for special cases)
 * @returns The trimmed text content or empty string
 */
function extractContentFromSelectors(
	selectors: string[],
	containsText?: string,
): string {
	for (const selector of selectors) {
		if (selector.includes(":contains") && containsText) {
			// Handle custom contains selector
			const baseSelector = selector.split(":contains")[0];
			const elements = document.querySelectorAll(baseSelector);
			const matchingEl = Array.from(elements).find((el) =>
				el.textContent?.includes(containsText),
			);

			if (matchingEl?.textContent?.trim()) {
				return matchingEl.textContent.trim();
			}
		} else {
			// Standard selector
			const element = document.querySelector(selector);
			if (element?.textContent?.trim()) {
				return element.textContent.trim();
			}
		}
	}
	return "";
}

/**
 * Check if the current URL is a LinkedIn job page
 */
function isLinkedInJobPage(url: string): boolean {
	return (
		url.includes("linkedin.com/jobs/") ||
		url.includes("linkedin.com/job/") ||
		(url.includes("linkedin.com") && url.includes("/view/"))
	);
}

/**
 * Remove specific phrases from text content
 */
function cleanupDescription(text: string): string {
	// Remove "about the job" if it exists, case-insensitive
	const phraseToRemove = "about the job";
	const regex = new RegExp(phraseToRemove, "gi");
	return text.replace(regex, "").trim();
}

/**
 * Extract job info from LinkedIn
 */
async function extractFromLinkedIn(): Promise<JobInfo> {
	const jobInfo: JobInfo = {
		company: "",
		position: "",
		location: "Remote", // Default to Remote
		salary: "",
		description: "",
	};

	// Extract position
	jobInfo.position = extractContentFromSelectors(LinkedInSelectors.title);

	// Extract company
	jobInfo.company = extractContentFromSelectors(LinkedInSelectors.company);

	// Extract location
	const locationText = extractContentFromSelectors(LinkedInSelectors.location);
	if (locationText) {
		jobInfo.location = locationText;
	}

	// Extract salary - special case with contains selector
	jobInfo.salary = extractContentFromSelectors(LinkedInSelectors.salary, "$");

	// Extract description
	const descriptionText = extractContentFromSelectors(
		LinkedInSelectors.description,
	);
	if (descriptionText) {
		jobInfo.description = cleanupDescription(descriptionText);
	}

	return jobInfo;
}

/**
 * Main function to extract job information from the current page
 */
async function extractJobInfo(): Promise<JobInfo> {
	const url = window.location.href;
	const defaultJobInfo: JobInfo = {
		company: "",
		position: "",
		location: "Remote", // Default to Remote
		salary: "",
		description: "",
	};

	// Only extract from LinkedIn job pages for now
	if (isLinkedInJobPage(url)) {
		console.log("LinkedIn job page detected, extracting information...");
		try {
			// Wait a short time to ensure the page is fully loaded after AJAX changes
			await new Promise((resolve) => setTimeout(resolve, 300));
			const jobInfo = await extractFromLinkedIn();
			console.log("Extracted job info:", jobInfo);
			return jobInfo;
		} catch (error) {
			logError("Error extracting job info", error);
			// Return default info with error flag
			return {
				...defaultJobInfo,
				error:
					error instanceof Error
						? error.message
						: "Unknown error extracting job info",
			};
		}
	} else {
		console.log("Not a supported job page, no information extracted");
		return defaultJobInfo;
	}
}
