// sidebar.ts
import {
	JobData,
	ExtractJobResponse,
	AddJobResponse,
	SidebarElements,
} from "./types";

document.addEventListener("DOMContentLoaded", () => {
	// Initialize element references
	const elements = initializeElements();
	setupEventListeners(elements);
	loadSidebarState(elements);
	checkNotionSettings(elements);
});

/**
 * Initialize all DOM element references
 */
function initializeElements(): SidebarElements {
	return {
		jobForm: document.getElementById("job-form") as HTMLFormElement,
		setupContainer: document.getElementById("setup-container") as HTMLElement,
		jobFormContainer: document.getElementById(
			"job-form-container",
		) as HTMLElement,
		settingsButton: document.getElementById(
			"settings-button",
		) as HTMLButtonElement,
		saveSettingsButton: document.getElementById(
			"save-settings",
		) as HTMLButtonElement,
		helpLink: document.getElementById("help-link") as HTMLAnchorElement,
		statusMessage: document.getElementById("status-message") as HTMLElement,
		toggleSidebar: document.getElementById("toggle-sidebar") as HTMLElement,
		sidebarContainer: document.querySelector(
			".sidebar-container",
		) as HTMLElement,
		companyInput: document.getElementById("company") as HTMLInputElement,
		positionInput: document.getElementById("position") as HTMLInputElement,
		locationInput: document.getElementById("location") as HTMLInputElement,
		salaryInput: document.getElementById("salary") as HTMLInputElement,
		jobUrlInput: document.getElementById("job-url") as HTMLInputElement,
		statusSelect: document.getElementById("status") as HTMLSelectElement,
		descriptionTextarea: document.getElementById(
			"description",
		) as HTMLTextAreaElement,
		notesTextarea: document.getElementById("notes") as HTMLTextAreaElement,
		notionTokenInput: document.getElementById(
			"notion-token",
		) as HTMLInputElement,
		databaseIdInput: document.getElementById("database-id") as HTMLInputElement,
		enhanceAiCheckbox: document.getElementById(
			"enhance-ai",
		) as HTMLInputElement, // Initialize enhance AI checkbox
	};
}

/**
 * Setup all event listeners
 */
function setupEventListeners(elements: SidebarElements): void {
	// Toggle sidebar functionality
	elements.toggleSidebar.addEventListener("click", () => {
		toggleSidebarView(elements);
	});

	// Listen for messages from parent page (sidebarInjector)
	window.addEventListener("message", (event) => {
		handleIncomingMessages(event, elements);
	});

	// Settings button click handler
	elements.settingsButton.addEventListener("click", () => {
		showSettingsView(elements);
	});

	// Save settings button click handler
	elements.saveSettingsButton.addEventListener("click", () => {
		saveSettings(elements);
	});

	// Help link click handler
	elements.helpLink.addEventListener("click", (e) => {
		e.preventDefault();
		// Open help page in new tab
		chrome.tabs.create({
			url: "https://developers.notion.com/docs/create-a-notion-integration",
		});
	});

	// Job form submit handler
	elements.jobForm.addEventListener("submit", (event) => {
		event.preventDefault();
		handleJobFormSubmit(elements);
	});
}

/**
 * Toggle sidebar view between expanded and collapsed
 */
function toggleSidebarView(elements: SidebarElements): void {
	elements.sidebarContainer.classList.toggle("collapsed");
	// Save sidebar state
	const isCollapsed = elements.sidebarContainer.classList.contains("collapsed");
	chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
}

/**
 * Load sidebar state from storage
 */
function loadSidebarState(elements: SidebarElements): void {
	chrome.storage.local.get(["sidebarCollapsed"], (result) => {
		if (result.sidebarCollapsed) {
			elements.sidebarContainer.classList.add("collapsed");
		}
	});
}

/**
 * Handle messages from parent page or iframe
 */
function handleIncomingMessages(
	event: MessageEvent,
	elements: SidebarElements,
): void {
	if (event.data && event.data.action === "fillJobInfo") {
		fillFormWithJobInfo(event.data.data, elements);
	}
}

/**
 * Fill job form with extracted data
 */
function fillFormWithJobInfo(
	jobInfo: ExtractJobResponse,
	elements: SidebarElements,
): void {
	if (!jobInfo || jobInfo.error) return;
	chrome.storage.sync.get(["enhanceAi"], (result) => {
		// Send message to background script to add job to Notion
		chrome.runtime.sendMessage(
			{
				action: "enhanceWithAi",
				data: {
					jobData: jobInfo,
					enhanceAi: result.enhanceAi, // Pass enhance AI setting to background
				},
			},
			(response: AddJobResponse) => {
				if (chrome.runtime.lastError) {
					console.error("Error sending message:", chrome.runtime.lastError);
					showStatusMessage(
						`Error: ${chrome.runtime.lastError.message}`,
						"error",
						elements,
					);
					return;
				}
				console.log("AI enhancement response:", response);
				// Fill in the form with the extracted job info
				if (jobInfo.company) {
					elements.companyInput.value = jobInfo.company;
				}

				if (jobInfo.position) {
					elements.positionInput.value = jobInfo.position;
				}

				if (jobInfo.location) {
					elements.locationInput.value = jobInfo.location;
				}

				if (jobInfo.salary) {
					elements.salaryInput.value = jobInfo.salary;
				}

				if (jobInfo.description) {
					elements.descriptionTextarea.value = jobInfo.description;
				}

				if (jobInfo.url) {
					elements.jobUrlInput.value = jobInfo.url;
				}
			},
		);
	});
}

/**
 * Check if Notion API token and database ID are set
 */
function checkNotionSettings(elements: SidebarElements): void {
	chrome.storage.sync.get(
		["notionToken", "databaseId", "enhanceAi"],
		(result) => {
			if (!result.notionToken || !result.databaseId) {
				showSetupView(elements);
			} else {
				showJobFormView(elements);
				// Pre-fill settings if they exist
				elements.notionTokenInput.value = result.notionToken || "";
				elements.databaseIdInput.value = result.databaseId || "";
				elements.enhanceAiCheckbox.checked = result.enhanceAi === true; // Set checkbox state
				// Request job info from parent page
				requestJobInfo();
			}
		},
	);
}

/**
 * Show the setup/settings view
 */
function showSetupView(elements: SidebarElements): void {
	elements.setupContainer.classList.remove("hidden");
	elements.jobFormContainer.classList.add("hidden");
}

/**
 * Show the job form view
 */
function showJobFormView(elements: SidebarElements): void {
	elements.setupContainer.classList.add("hidden");
	elements.jobFormContainer.classList.remove("hidden");
}

/**
 * Show the settings view and load existing settings
 */
function showSettingsView(elements: SidebarElements): void {
	// Load existing settings into the input fields
	chrome.storage.sync.get(
		["notionToken", "databaseId", "enhanceAi"],
		(result) => {
			elements.notionTokenInput.value = result.notionToken || "";
			elements.databaseIdInput.value = result.databaseId || "";
			elements.enhanceAiCheckbox.checked = result.enhanceAi === true; // Set checkbox state
		},
	);

	elements.setupContainer.classList.remove("hidden");
	elements.jobFormContainer.classList.add("hidden");
}

/**
 * Save Notion API settings
 */
function saveSettings(elements: SidebarElements): void {
	const notionToken = elements.notionTokenInput.value.trim();
	const databaseId = elements.databaseIdInput.value.trim();
	const enhanceAi = elements.enhanceAiCheckbox.checked;

	if (!notionToken || !databaseId) {
		showStatusMessage(
			"Please provide both Notion token and database ID",
			"error",
			elements,
		);
		return;
	}

	// Save settings to Chrome storage
	chrome.storage.sync.set(
		{
			notionToken: notionToken,
			databaseId: databaseId,
			enhanceAi: enhanceAi, // Save the enhance AI setting
		},
		() => {
			showJobFormView(elements);
			showStatusMessage("Settings saved successfully", "success", elements);
			getCurrentTabInfo();
		},
	);
}

/**
 * Handle job form submission
 */
function handleJobFormSubmit(elements: SidebarElements): void {
	// Get form values
	const company = elements.companyInput.value.trim();
	const position = elements.positionInput.value.trim();
	const location = elements.locationInput.value.trim();
	const salary = elements.salaryInput.value.trim();
	const jobUrl = elements.jobUrlInput.value.trim();
	const status = elements.statusSelect.value;
	const description = elements.descriptionTextarea.value.trim();
	let notes = elements.notesTextarea.value.trim(); // Changed to let

	if (!company || !position || !jobUrl) {
		showStatusMessage(
			"Please fill in all required fields (Company, Position, Job URL)",
			"error",
			elements,
		);
		return;
	}

	// Show loading state
	showStatusMessage("Saving job to Notion...", "loading", elements);
	submitJobToNotion(elements, false);
}

/**
 * Submit job data to Notion
 */
function submitJobToNotion(
	elements: SidebarElements,
	forceSubmit: boolean,
): void {
	chrome.storage.sync.get(
		["notionToken", "databaseId", "enhanceAi"],
		(result) => {
			// Validate credentials
			if (!result.notionToken || !result.databaseId) {
				showStatusMessage(
					"Notion API token and database ID are required. Please go to Settings.",
					"error",
					elements,
				);
				return;
			}

			// Get form values
			const company = elements.companyInput.value.trim();
			const position = elements.positionInput.value.trim();
			const location = elements.locationInput.value.trim();
			const salary = elements.salaryInput.value.trim();
			const jobUrl = elements.jobUrlInput.value.trim();
			const status = elements.statusSelect.value;
			const description = elements.descriptionTextarea.value.trim();
			let notes = elements.notesTextarea.value.trim(); // Changed to let

			const jobData: JobData = {
				company,
				position,
				location,
				salary,
				jobUrl,
				status,
				description,
				notes, // Initial notes
			};

			// Send message to background script to add job to Notion
			chrome.runtime.sendMessage(
				{
					action: "addJobToNotion",
					data: {
						notionToken: result.notionToken,
						databaseId: result.databaseId,
						jobData,
						forceSubmit,
						enhanceAi: result.enhanceAi, // Pass enhance AI setting to background
					},
				},
				(response: AddJobResponse) => {
					if (chrome.runtime.lastError) {
						console.error("Error sending message:", chrome.runtime.lastError);
						showStatusMessage(
							`Error: ${chrome.runtime.lastError.message}`,
							"error",
							elements,
						);
						return;
					}
					handleNotionResponse(response, jobData, elements);
				},
			);
		},
	);
}

/**
 * Handle response from Notion API submission
 */
function handleNotionResponse(
	response: AddJobResponse,
	jobData: JobData, // jobData might be useful for context or retry
	elements: SidebarElements,
): void {
	if (response.success) {
		showStatusMessage("Job saved successfully!", "success", elements);
		elements.jobForm.reset(); // Reset form after successful submission
		// If AI enhanced notes, they are handled by background.ts.
		// If you need to display the AI notes in the sidebar,
		// the response.data could carry them back.
		// For now, just resetting the form.
	} else if (response.requireConfirmation && response.jobUrl) {
		handleDuplicateJobConfirmation(response, jobData, elements);
	} else {
		showStatusMessage(
			`Error: ${response.error || "Unknown error"}`,
			"error",
			elements,
		);
	}
}

/**
 * Handle confirmation for duplicate job submission
 */
function handleDuplicateJobConfirmation(
	response: AddJobResponse,
	jobData: JobData,
	elements: SidebarElements,
): void {
	const confirmDuplicate = confirm(
		`This job URL (${response.jobUrl}) was recently submitted. Are you sure you want to add it again?`,
	);
	if (confirmDuplicate) {
		// Resubmit with forceSubmit flag and current AI setting
		elements.jobForm.dataset.forceSubmit = "true";
		submitJobToNotion(elements, true);
	} else {
		showStatusMessage("Submission cancelled.", "", elements);
		//toggleFormState(elements, true); // Re-enable form if cancelled
	}
}

/**
 * Get current tab info and prefill form
 */
function getCurrentTabInfo(): void {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (tabs[0] && tabs[0].url) {
			// Set the job URL from current tab
			const urlInput = document.getElementById("job-url") as HTMLInputElement;
			urlInput.value = tabs[0].url;
			requestJobInfo();
		}
	});
}

/**
 * Request job info from parent page
 */
function requestJobInfo(): void {
	window.parent.postMessage({ action: "extractJobInfo" }, "*");
}

/**
 * Show status message with appropriate styling
 */
function showStatusMessage(
	message: string,
	type: string,
	elements: SidebarElements,
): void {
	elements.statusMessage.textContent = "";

	// Add loading spinner if type is loading
	if (type === "loading") {
		const spinner = document.createElement("span");
		spinner.className = "loading-spinner";
		elements.statusMessage.appendChild(spinner);
		elements.statusMessage.appendChild(document.createTextNode(" " + message));
	} else {
		elements.statusMessage.textContent = message;
	}

	// Set appropriate styling
	elements.statusMessage.className = "";
	elements.statusMessage.classList.add(type);
	elements.statusMessage.style.display = "block";

	// Hide success and warning messages after 5 seconds
	if (type === "success" || type === "warning") {
		setTimeout(() => {
			elements.statusMessage.style.display = "none";
		}, 5000);
	}
}
