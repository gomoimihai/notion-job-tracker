// sidebar.ts

// Define interfaces for the job data
interface JobData {
	company: string;
	position: string;
	location: string;
	salary: string;
	jobUrl: string;
	status: string;
	description: string;
	notes: string;
}

// Define interfaces for message responses
interface ExtractJobResponse {
	company?: string;
	position?: string;
	location?: string;
	salary?: string;
	description?: string;
	error?: string;
}

interface AddJobResponse {
	success: boolean;
	error?: string;
	requireConfirmation?: boolean;
	jobUrl?: string;
}

document.addEventListener("DOMContentLoaded", () => {
	// Get DOM elements with proper type casting
	const jobForm = document.getElementById("job-form") as HTMLFormElement;
	const setupContainer = document.getElementById(
		"setup-container",
	) as HTMLElement;
	const jobFormContainer = document.getElementById(
		"job-form-container",
	) as HTMLElement;
	const settingsButton = document.getElementById(
		"settings-button",
	) as HTMLButtonElement;
	const saveSettingsButton = document.getElementById(
		"save-settings",
	) as HTMLButtonElement;
	const helpLink = document.getElementById("help-link") as HTMLAnchorElement;
	const statusMessage = document.getElementById(
		"status-message",
	) as HTMLElement;
	const toggleSidebar = document.getElementById(
		"toggle-sidebar",
	) as HTMLElement;
	const sidebarContainer = document.querySelector(
		".sidebar-container",
	) as HTMLElement;

	// Toggle sidebar functionality
	toggleSidebar.addEventListener("click", () => {
		sidebarContainer.classList.toggle("collapsed");
		// Save sidebar state
		const isCollapsed = sidebarContainer.classList.contains("collapsed");
		chrome.storage.local.set({ sidebarCollapsed: isCollapsed });
	});

	// Check if sidebar was collapsed in previous session
	chrome.storage.local.get(["sidebarCollapsed"], (result) => {
		if (result.sidebarCollapsed) {
			sidebarContainer.classList.add("collapsed");
		}
	});

	// Check if Notion API token and database ID are set
	chrome.storage.sync.get(["notionToken", "databaseId"], (result) => {
		if (!result.notionToken || !result.databaseId) {
			// Show setup screen if settings are not configured
			setupContainer.classList.remove("hidden");
			jobFormContainer.classList.add("hidden");
		} else {
			// Settings are configured, show job form
			setupContainer.classList.add("hidden");
			jobFormContainer.classList.remove("hidden");

			// Get current tab URL and prefill the form
			getCurrentTabInfo();
		}
	});

	// Settings button click handler
	settingsButton.addEventListener("click", () => {
		chrome.storage.sync.get(["notionToken", "databaseId"], (result) => {
			(document.getElementById("notion-token") as HTMLInputElement).value =
				result.notionToken || "";
			(document.getElementById("database-id") as HTMLInputElement).value =
				result.databaseId || "";
		});

		setupContainer.classList.remove("hidden");
		jobFormContainer.classList.add("hidden");
	});

	// Save settings button click handler
	saveSettingsButton.addEventListener("click", () => {
		const notionToken = (
			document.getElementById("notion-token") as HTMLInputElement
		).value.trim();
		const databaseId = (
			document.getElementById("database-id") as HTMLInputElement
		).value.trim();

		if (!notionToken || !databaseId) {
			showStatusMessage(
				"Please provide both Notion token and database ID",
				"error",
			);
			return;
		}

		// Save settings to Chrome storage
		chrome.storage.sync.set(
			{
				notionToken: notionToken,
				databaseId: databaseId,
			},
			() => {
				setupContainer.classList.add("hidden");
				jobFormContainer.classList.remove("hidden");
				showStatusMessage("Settings saved successfully", "success");

				// Refresh form with current tab info
				getCurrentTabInfo();
			},
		);
	});

	// Help link click handler
	helpLink.addEventListener("click", (e) => {
		e.preventDefault();
		// Open help page in new tab
		chrome.tabs.create({
			url: "https://developers.notion.com/docs/create-a-notion-integration",
		});
	});

	// Job form submit handler
	jobForm.addEventListener("submit", (event) => {
		event.preventDefault();
		// Get form values with proper type casting
		const company = (
			document.getElementById("company") as HTMLInputElement
		).value.trim();
		const position = (
			document.getElementById("position") as HTMLInputElement
		).value.trim();
		const location = (
			document.getElementById("location") as HTMLInputElement
		).value.trim();
		const salary = (
			document.getElementById("salary") as HTMLInputElement
		).value.trim();
		const jobUrl = (
			document.getElementById("job-url") as HTMLInputElement
		).value.trim();
		const status = (document.getElementById("status") as HTMLSelectElement)
			.value;
		const description = (
			document.getElementById("description") as HTMLTextAreaElement
		).value.trim();
		const notes = (
			document.getElementById("notes") as HTMLTextAreaElement
		).value.trim();

		// Validate required fields
		if (!company || !position || !jobUrl) {
			showStatusMessage(
				"Please fill in all required fields (Company, Position, Job URL)",
				"error",
			);
			return;
		}

		// Show loading state
		showStatusMessage("Saving job to Notion...", "loading");

		// Get stored Notion credentials
		chrome.storage.sync.get(["notionToken", "databaseId"], (result) => {
			// Validate credentials
			if (!result.notionToken || !result.databaseId) {
				showStatusMessage(
					"Notion API token and database ID are required. Please go to Settings.",
					"error",
				);
				return;
			}

			// Prepare job data
			const jobData: JobData = {
				company,
				position,
				location,
				jobUrl,
				salary,
				status,
				description,
				notes,
			};

			// Send message to background script to add job to Notion
			chrome.runtime.sendMessage(
				{
					action: "addJobToNotion",
					data: {
						notionToken: result.notionToken,
						databaseId: result.databaseId,
						jobData,
						forceSubmit: false, // First attempt is not forced
					},
				},
				(response: AddJobResponse) => {
					if (response.success) {
						// Job added successfully
						showStatusMessage("Job added to Notion successfully!", "success");
						// Reset form
						jobForm.reset();
					} else {
						// Handle error or confirmation for possible duplicate
						if (response.requireConfirmation && response.jobUrl) {
							// Ask user to confirm submission of potentially duplicate job
							if (
								confirm("This job URL was recently submitted. Submit anyway?")
							) {
								// User confirmed, submit with force flag
								chrome.runtime.sendMessage(
									{
										action: "addJobToNotion",
										data: {
											notionToken: result.notionToken,
											databaseId: result.databaseId,
											jobData,
											forceSubmit: true, // Force submission
										},
									},
									(forcedResponse: AddJobResponse) => {
										if (forcedResponse.success) {
											showStatusMessage(
												"Job added to Notion successfully!",
												"success",
											);
											jobForm.reset();
										} else {
											showStatusMessage(
												`Error: ${forcedResponse.error || "Unknown error"}`,
												"error",
											);
										}
									},
								);
							} else {
								// User canceled, show message
								showStatusMessage(
									"Job submission canceled by user.",
									"warning",
								);
							}
						} else {
							// Regular error
							showStatusMessage(
								`Error: ${response.error || "Unknown error"}`,
								"error",
							);
						}
					}
				},
			);
		});
	});

	// Function to get current tab info and prefill form
	function getCurrentTabInfo() {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs[0] && tabs[0].url) {
				// Set the job URL from current tab
				const urlInput = document.getElementById("job-url") as HTMLInputElement;
				urlInput.value = tabs[0].url;

				// Try to extract job info from page content
				chrome.tabs.sendMessage(
					tabs[0].id as number,
					{ action: "extractJobInfo" },
					(response: ExtractJobResponse) => {
						if (response && !response.error) {
							// Prefill form with extracted data
							if (response.company) {
								(document.getElementById("company") as HTMLInputElement).value =
									response.company;
							}
							if (response.position) {
								(
									document.getElementById("position") as HTMLInputElement
								).value = response.position;
							}
							if (response.location) {
								(
									document.getElementById("location") as HTMLInputElement
								).value = response.location;
							}
							if (response.salary) {
								(document.getElementById("salary") as HTMLInputElement).value =
									response.salary;
							}
							if (response.description) {
								(
									document.getElementById("description") as HTMLTextAreaElement
								).value = response.description;
							}
						} else if (chrome.runtime.lastError) {
							// Content script might not be loaded - ignore this error
							console.log(
								"Content script not available:",
								chrome.runtime.lastError,
							);
						}
					},
				);
			}
		});
	}

	// Function to show status messages
	function showStatusMessage(message: string, type: string) {
		statusMessage.textContent = "";

		// Add loading spinner if type is loading
		if (type === "loading") {
			const spinner = document.createElement("span");
			spinner.className = "loading-spinner";
			statusMessage.appendChild(spinner);
			statusMessage.appendChild(document.createTextNode(" " + message));
		} else {
			statusMessage.textContent = message;
		}

		// Set appropriate styling
		statusMessage.className = "";
		statusMessage.classList.add(type);
		statusMessage.style.display = "block";

		// Hide success and warning messages after 5 seconds
		if (type === "success" || type === "warning") {
			setTimeout(() => {
				statusMessage.style.display = "none";
			}, 5000);
		}
	}
});
