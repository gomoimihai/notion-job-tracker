// popup.ts

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

		if (!company || !position || !jobUrl) {
			showStatusMessage("Please fill in all required fields", "error");
			return;
		}

		// Check if this is a forced submission (after duplicate warning)
		const forceSubmit = jobForm.dataset.forceSubmit === "true";
		if (forceSubmit) {
			delete jobForm.dataset.forceSubmit;
		}

		// Disable form while submitting
		toggleFormState(false);
		showStatusMessage("Saving to Notion...", "");

		// Get Notion API token and database ID
		chrome.storage.sync.get(["notionToken", "databaseId"], (result) => {
			// Send message to background script to add job to Notion
			chrome.runtime.sendMessage(
				{
					action: "addJobToNotion",
					data: {
						notionToken: result.notionToken,
						databaseId: result.databaseId,
						forceSubmit: forceSubmit,
						jobData: {
							company,
							position,
							location,
							salary,
							jobUrl,
							status,
							description,
							notes,
						},
					},
				},
				(response: AddJobResponse) => {
					toggleFormState(true);

					// Handle potential duplicate job URL
					if (response && !response.success && response.requireConfirmation) {
						const confirmMsg = `This job URL was recently submitted. Submit anyway?`;
						showStatusMessage(confirmMsg, "warning");

						// Add confirm and cancel buttons to the status message
						const confirmBtn = document.createElement("button");
						confirmBtn.textContent = "Submit Anyway";
						confirmBtn.className = "confirm-btn";
						confirmBtn.addEventListener("click", () => {
							// Set the force submit flag and resubmit the form
							jobForm.dataset.forceSubmit = "true";
							jobForm.dispatchEvent(new Event("submit"));
						});

						const cancelBtn = document.createElement("button");
						cancelBtn.textContent = "Cancel";
						cancelBtn.className = "cancel-btn";
						cancelBtn.addEventListener("click", () => {
							showStatusMessage("Submission cancelled", "");
						});

						const btnContainer = document.createElement("div");
						btnContainer.className = "btn-container";
						btnContainer.appendChild(confirmBtn);
						btnContainer.appendChild(cancelBtn);
						statusMessage.appendChild(btnContainer);

						return;
					}

					if (response && response.success) {
						showStatusMessage("Job saved to Notion successfully!", "success");
						// Clear form after successful submission
						jobForm.reset();
					} else {
						const errorMessage =
							response && response.error
								? response.error
								: "Failed to save job to Notion";
						showStatusMessage(`Error: ${errorMessage}`, "error");
					}
				},
			);
		});
	});

	// Function to get the current tab info and prefill the form
	function getCurrentTabInfo() {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length > 0) {
				const currentTab = tabs[0];
				if (!currentTab.id) return; // Safety check
				const url = currentTab.url || "";

				// Prefill job URL
				(document.getElementById("job-url") as HTMLInputElement).value = url;

				// Check if tab URL is a LinkedIn job site
				const isJobSite =
					url.includes("linkedin.com/jobs") ||
					url.includes("linkedin.com/job/") ||
					(url.includes("linkedin.com") && url.includes("/view/"));

				if (isJobSite) {
					// Show extraction status
					showStatusMessage("Extracting job details from LinkedIn...", "");

					// First, make sure the content script is injected
					chrome.scripting.executeScript(
						{
							target: { tabId: currentTab.id },
							files: ["contentScript.js"],
						},
						() => {
							if (chrome.runtime.lastError) {
								console.error(
									"Error injecting content script:",
									chrome.runtime.lastError,
								);
								showStatusMessage(
									"Could not inject content script. Please fill in manually.",
									"error",
								);
								return;
							} // After successful injection, try to extract job info
							if (currentTab.id !== undefined) {
								chrome.tabs.sendMessage(
									currentTab.id as number,
									{ action: "extractJobInfo" },
									(response: ExtractJobResponse) => {
										if (chrome.runtime.lastError) {
											console.error(
												"Error extracting job info:",
												JSON.stringify(chrome.runtime.lastError, null, 2),
											);
											showStatusMessage(
												"Could not extract job details. Please fill in manually.",
												"error",
											);
											return;
										}

										if (response) {
											// Prefill form with extracted data
											(
												document.getElementById("company") as HTMLInputElement
											).value = response.company || "";
											(
												document.getElementById("position") as HTMLInputElement
											).value = response.position || "";
											(
												document.getElementById("location") as HTMLInputElement
											).value = response.location || "";
											(
												document.getElementById("salary") as HTMLInputElement
											).value = response.salary || "";
											(
												document.getElementById(
													"description",
												) as HTMLTextAreaElement
											).value = response.description || "";

											// Check if we successfully extracted any data
											if (
												response.company ||
												response.position ||
												response.location
											) {
												showStatusMessage(
													"Job details extracted successfully!",
													"success",
												);
											} else {
												showStatusMessage(
													"Limited job details found. Please fill in missing information.",
													"",
												);
											}
										} else {
											showStatusMessage(
												"No job details found. Please fill in manually.",
												"",
											);
										}
									},
								);
							}
						},
					);
				} else {
					showStatusMessage(
						"This does not appear to be a LinkedIn job page. Only LinkedIn is supported.",
						"",
					);
				}
			}
		});
	}

	// Helper function to show status messages
	function showStatusMessage(message: string, type: string) {
		statusMessage.textContent = message;
		statusMessage.className = "";
		if (type) {
			statusMessage.classList.add(type);
		}

		// Auto-clear success messages after a few seconds
		if (type === "success") {
			setTimeout(() => {
				statusMessage.textContent = "";
				statusMessage.className = "";
			}, 3000);
		}
	}

	// Helper function to toggle form state (enable/disable inputs)
	function toggleFormState(enabled: boolean) {
		const formElements = jobForm.elements;
		for (let i = 0; i < formElements.length; i++) {
			(formElements[i] as HTMLInputElement).disabled = !enabled;
		}
	}
});
