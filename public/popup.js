// popup.js
document.addEventListener("DOMContentLoaded", () => {
	const jobForm = document.getElementById("job-form");
	const setupContainer = document.getElementById("setup-container");
	const jobFormContainer = document.getElementById("job-form-container");
	const settingsButton = document.getElementById("settings-button");
	const saveSettingsButton = document.getElementById("save-settings");
	const helpLink = document.getElementById("help-link");
	const statusMessage = document.getElementById("status-message");

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
			document.getElementById("notion-token").value = result.notionToken || "";
			document.getElementById("database-id").value = result.databaseId || "";
		});

		setupContainer.classList.remove("hidden");
		jobFormContainer.classList.add("hidden");
	});

	// Save settings button click handler
	saveSettingsButton.addEventListener("click", () => {
		const notionToken = document.getElementById("notion-token").value.trim();
		const databaseId = document.getElementById("database-id").value.trim();

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
		// Get form values
		const company = document.getElementById("company").value.trim();
		const position = document.getElementById("position").value.trim();
		const location = document.getElementById("location").value.trim();
		const salary = document.getElementById("salary").value.trim();
		const jobUrl = document.getElementById("job-url").value.trim();
		const status = document.getElementById("status").value;
		const description = document.getElementById("description").value.trim();
		const notes = document.getElementById("notes").value.trim();

		if (!company || !position || !jobUrl) {
			showStatusMessage("Please fill in all required fields", "error");
			return;
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
						jobData: {
							company,
							position,
							location,
							salary,
							jobUrl,
							status,
							description,
							notes,
							dateAdded: new Date().toISOString(),
						},
					},
				},
				(response) => {
					toggleFormState(true);

					if (response?.success) {
						showStatusMessage("Job saved to Notion successfully!", "success");
						// Reset form
						jobForm.reset();
					} else {
						showStatusMessage(
							response.error ||
								"Failed to save job to Notion. Please check your settings.",
							"error",
						);
					}
				},
			);
		});
	});
	// Function to get current tab info and prefill form
	function getCurrentTabInfo() {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (tabs.length === 0) return;

			const currentTab = tabs[0];
			document.getElementById("job-url").value = currentTab.url;

			// Display "Extracting info..." message
			showStatusMessage("Extracting job information...", "");

			// Send message to content script to extract job details
			chrome.tabs.sendMessage(
				currentTab.id,
				{ action: "extractJobInfo" },
				(response) => {
					// Clear the status message
					statusMessage.textContent = "";
					statusMessage.className = "";

					// Handle case where content script isn't ready or there's an error
					if (chrome.runtime.lastError) {
						console.log("Error getting job info:", chrome.runtime.lastError);

						// Extract job site from URL for the form title
						let jobSite = "";
						const url = currentTab.url.toLowerCase();
						if (url.includes("linkedin.com")) jobSite = "LinkedIn";
						else if (url.includes("indeed.com")) jobSite = "Indeed";
						else if (url.includes("glassdoor.com")) jobSite = "Glassdoor";
						else if (url.includes("google.com/search")) jobSite = "Google Jobs";

						if (jobSite) {
							showStatusMessage(
								`This appears to be a ${jobSite} job listing. Please fill in the details manually.`,
								"",
							);
						}
						return;
					}

					// If we got a valid response from the content script
					if (response) {
						// Fill the form with extracted job info
						if (response.company) {
							document.getElementById("company").value = response.company;
							// Also set the page title to include company name
							document.title = `Add ${response.company} Job to Notion`;
						}

						if (response.position) {
							document.getElementById("position").value = response.position;
							// If we have both company and position, make a more descriptive title
							if (response.company) {
								document.title = `Add ${response.position} at ${response.company} to Notion`;
							}
						}

						if (response.location) {
							document.getElementById("location").value = response.location;
						}
						if (response.salary) {
							document.getElementById("salary").value = response.salary;
						}

						if (response.description) {
							document.getElementById("description").value =
								response.description;
						}

						// Check if we successfully extracted job information
						if (
							response.company ||
							response.position ||
							response.location ||
							response.salary ||
							response.description
						) {
							showStatusMessage(
								"Job information extracted successfully!",
								"success",
							);
							setTimeout(() => {
								statusMessage.textContent = "";
								statusMessage.className = "";
							}, 3000);
						} else {
							showStatusMessage(
								"Could not automatically extract job details. Please fill in manually.",
								"",
							);
						}
					}
				},
			);
		});
	}

	// Function to enable/disable form
	function toggleFormState(enabled) {
		const inputs = jobForm.querySelectorAll("input, select, textarea, button");
		inputs.forEach((input) => {
			input.disabled = !enabled;
		});
	}

	// Function to show status message
	function showStatusMessage(message, type) {
		statusMessage.textContent = message;
		statusMessage.className = "";

		if (type) {
			statusMessage.classList.add(type);
		}

		// Clear message after 5 seconds
		if (type === "success") {
			setTimeout(() => {
				statusMessage.textContent = "";
				statusMessage.className = "";
			}, 5000);
		}
	}
});
