// sidebar.ts
import {
	JobData,
	ExtractJobResponse,
	AddJobResponse,
	SidebarElements,
	AINotes,
} from "./types";
import { toggleFormState } from "./utils";

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
		jobId: document.getElementById("jobId") as HTMLInputElement,
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
		) as HTMLInputElement, // Initialize enhance AI checkbox		// AI Notes UI elements
		aiNotesContainer: document.getElementById(
			"ai-notes-container",
		) as HTMLElement,
		aiNotesContent: document.getElementById("ai-notes-content") as HTMLElement,
		// Cover Letter UI elements
		generateCoverLetterButton: document.getElementById(
			"generate-cover-letter",
		) as HTMLButtonElement,
		coverLetterContainer: document.getElementById(
			"cover-letter-container",
		) as HTMLElement,
		coverLetterTextarea: document.getElementById(
			"cover-letter",
		) as HTMLTextAreaElement,
		copyCoverLetterButton: document.getElementById(
			"copy-cover-letter",
		) as HTMLButtonElement,
		downloadCoverLetterButton: document.getElementById(
			"download-cover-letter",
		) as HTMLButtonElement,
		regenerateCoverLetterButton: document.getElementById(
			"regenerate-cover-letter",
		) as HTMLButtonElement,
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

	// Generate Cover Letter button click handler
	elements.generateCoverLetterButton.addEventListener("click", () => {
		handleGenerateCoverLetter(elements);
	});

	// Copy Cover Letter button click handler
	elements.copyCoverLetterButton.addEventListener("click", () => {
		copyCoverLetterToClipboard(elements);
	});

	// Download Cover Letter button click handler
	elements.downloadCoverLetterButton.addEventListener("click", () => {
		downloadCoverLetter(elements);
	});

	// Regenerate Cover Letter button click handler
	elements.regenerateCoverLetterButton.addEventListener("click", () => {
		handleGenerateCoverLetter(elements);
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
		// First, immediately fill in basic job info
		if (jobInfo.id) {
			elements.jobId.value = jobInfo.id;
		}

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
		// Only proceed with AI enhancement if the setting is enabled
		if (result.enhanceAi) {
			// Show loading state while waiting for AI enhancement			// Show loading indicator in status message
			showStatusMessage("Enhancing with AI...", "loading", elements);

			// Disable form while AI is analyzing
			toggleFormState({ form: elements.jobForm, enabled: false });

			// Send message to background script for AI enhancement
			chrome.runtime.sendMessage(
				{
					action: "enhanceWithAi",
					data: {
						jobData: jobInfo,
						enhanceAi: result.enhanceAi,
					},
				},
				(response: AddJobResponse) => {
					// Re-enable the form regardless of the result
					toggleFormState({ form: elements.jobForm, enabled: true });

					if (chrome.runtime.lastError) {
						console.error("Error sending message:", chrome.runtime.lastError);
						showStatusMessage(
							`AI enhancement failed: ${chrome.runtime.lastError.message}`,
							"error",
							elements,
						);
						return;
					}
					if (response && response.success) {
						showStatusMessage("AI enhancement complete", "success", elements);
						const aiNotes = response.data;
						if (!aiNotes) {
							return;
						}
						// Update form with AI analysis data
						// if (aiNotes.title) {
						// 	// If AI suggests a better title and the user hasn't manually changed it
						// 	if (
						// 		!elements.positionInput.value ||
						// 		elements.positionInput.value === jobInfo.position
						// 	) {
						// 		elements.positionInput.value = aiNotes.title;
						// 	}
						// }

						// Store raw AI data in notes field (for submission to Notion)
						elements.notesTextarea.value = JSON.stringify(aiNotes, null, 2);
						elements.salaryInput.value = aiNotes.salary || "";

						// Display AI notes in a nice format
						displayAINotes(aiNotes, elements);
					} else if (response && response.error) {
						showStatusMessage(
							`AI enhancement failed: ${response.error}`,
							"error",
							elements,
						);
					}
				},
			);
		}
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
			const id = elements.jobId.value.trim();
			const company = elements.companyInput.value.trim();
			const position = elements.positionInput.value.trim();
			const location = elements.locationInput.value.trim();
			const salary = elements.salaryInput.value.trim();
			const jobUrl = elements.jobUrlInput.value.trim();
			const status = elements.statusSelect.value;
			const description = elements.descriptionTextarea.value.trim();
			let notes = elements.notesTextarea.value.trim(); // Changed to let

			const jobData: JobData = {
				id,
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

		// If we have AI notes in the response, display them
		if (response.data) {
			displayAINotes(response.data, elements);
		}

		// Reset form after successful submission
		elements.jobForm.reset();

		// Hide the AI notes container after form reset
		setTimeout(() => {
			elements.aiNotesContainer.classList.add("hidden");
		}, 100);
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

/**
 * Display AI notes in a nice UI format
 */
function displayAINotes(aiNotes: AINotes, elements: SidebarElements): void {
	// Clear previous content
	elements.aiNotesContent.innerHTML = "";

	// Show the AI notes container
	elements.aiNotesContainer.classList.remove("hidden");

	// Create content for each AI note section
	if (aiNotes.title) {
		createAINotesSection("Position", aiNotes.title, elements.aiNotesContent);
	}

	if (aiNotes.salary) {
		createAINotesSection("Salary", aiNotes.salary, elements.aiNotesContent);
	}

	if (aiNotes.location) {
		createAINotesSection("Location", aiNotes.location, elements.aiNotesContent);
	}

	if (aiNotes.technicalStack) {
		createAINotesSection(
			"Technical Stack",
			aiNotes.technicalStack,
			elements.aiNotesContent,
		);
	}

	if (aiNotes.summary && aiNotes.summary.length > 0) {
		const summaryContent = aiNotes.summary.join("\n• ");
		createAINotesSection(
			"Key Points",
			`• ${summaryContent}`,
			elements.aiNotesContent,
		);
	}

	// Add any additional fields that may be in the AI notes
	Object.entries(aiNotes).forEach(([key, value]) => {
		if (
			!["title", "salary", "location", "technicalStack", "summary"].includes(
				key,
			) &&
			value
		) {
			const formattedKey = key
				.replace(/([A-Z])/g, " $1")
				.replace(/^./, (str) => str.toUpperCase());

			let displayValue = value;
			if (Array.isArray(value)) {
				displayValue = value.join("\n• ");
				if (displayValue) {
					displayValue = `• ${displayValue}`;
				}
			}

			createAINotesSection(formattedKey, displayValue, elements.aiNotesContent);
		}
	});
}

/**
 * Create a section for AI notes
 */
function createAINotesSection(
	title: string,
	content: string,
	container: HTMLElement,
): void {
	const sectionDiv = document.createElement("div");
	sectionDiv.className = "ai-notes-section";

	const titleElement = document.createElement("div");
	titleElement.className = "ai-notes-section-title";
	titleElement.textContent = title;

	const contentElement = document.createElement("div");
	contentElement.className = "ai-notes-section-content";
	contentElement.textContent = content;

	sectionDiv.appendChild(titleElement);
	sectionDiv.appendChild(contentElement);
	container.appendChild(sectionDiv);
}

/**
 * Handle cover letter generation
 */
function handleGenerateCoverLetter(elements: SidebarElements): void {
	// Show the cover letter container if it's hidden
	if (elements.coverLetterContainer.style.display === "none") {
		elements.coverLetterContainer.style.display = "block";
	}

	// Validate required fields
	const company = elements.companyInput.value.trim();
	const position = elements.positionInput.value.trim();
	const description = elements.descriptionTextarea.value.trim();

	if (!company || !position || !description) {
		showStatusMessage(
			"Please fill in company, position, and job description before generating a cover letter",
			"error",
			elements,
		);
		return;
	}

	// Show loading state
	elements.coverLetterTextarea.value = "Generating your cover letter...";
	elements.coverLetterTextarea.disabled = true;
	showStatusMessage("Generating cover letter...", "loading", elements);

	// Gather data for cover letter generation
	const coverLetterInput = {
		company,
		position,
		jobDescription: description,
		location: elements.locationInput.value.trim(),
		skills: "", // You could add a field for skills or extract them from the job description
	};

	// Call background script to generate cover letter
	chrome.runtime.sendMessage(
		{
			action: "generateCoverLetter",
			data: coverLetterInput,
		},
		(response: { success: boolean; coverLetter?: string; error?: string }) => {
			// Re-enable the textarea regardless of the result
			elements.coverLetterTextarea.disabled = false;

			if (chrome.runtime.lastError) {
				console.error("Error sending message:", chrome.runtime.lastError);
				showStatusMessage(
					`Cover letter generation failed: ${chrome.runtime.lastError.message}`,
					"error",
					elements,
				);
				elements.coverLetterTextarea.value =
					"Error generating cover letter. Please try again.";
				return;
			}

			if (response && response.success && response.coverLetter) {
				showStatusMessage(
					"Cover letter generated successfully",
					"success",
					elements,
				);
				elements.coverLetterTextarea.value = response.coverLetter;
			} else {
				showStatusMessage(
					`Cover letter generation failed: ${response?.error || "Unknown error"}`,
					"error",
					elements,
				);
				elements.coverLetterTextarea.value =
					"Error generating cover letter. Please try again.";
			}
		},
	);
}

/**
 * Copy cover letter to clipboard
 */
function copyCoverLetterToClipboard(elements: SidebarElements): void {
	const coverLetterText = elements.coverLetterTextarea.value.trim();

	if (!coverLetterText) {
		showStatusMessage("No cover letter to copy", "warning", elements);
		return;
	}

	// Copy to clipboard
	navigator.clipboard
		.writeText(coverLetterText)
		.then(() => {
			showStatusMessage(
				"Cover letter copied to clipboard!",
				"success",
				elements,
			);
		})
		.catch((err) => {
			console.error("Failed to copy: ", err);
			showStatusMessage("Failed to copy to clipboard", "error", elements);
		});
}

/**
 * Download cover letter as text file
 */
function downloadCoverLetter(elements: SidebarElements): void {
	const coverLetterText = elements.coverLetterTextarea.value.trim();

	if (!coverLetterText) {
		showStatusMessage("No cover letter to download", "warning", elements);
		return;
	}

	const company = elements.companyInput.value.trim() || "company";
	const position = elements.positionInput.value.trim() || "position";
	const filename = `Cover_Letter_${company}_${position}.txt`
		.replace(/\s+/g, "_")
		.replace(/[^a-zA-Z0-9_\.]/g, "");

	const blob = new Blob([coverLetterText], { type: "text/plain" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();

	// Cleanup
	setTimeout(() => {
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, 100);

	showStatusMessage("Cover letter downloaded", "success", elements);
}
