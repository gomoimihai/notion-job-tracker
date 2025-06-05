// sidebarInjector.ts

// Function to inject the sidebar into the page
function injectSidebar() {
	// Create the sidebar iframe
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

	// Store the current URL to detect changes
	let lastUrl = window.location.href;

	// Create a URL observer to detect AJAX navigation
	const urlObserver = new MutationObserver(() => {
		// Check if URL has changed
		const currentUrl = window.location.href;
		if (currentUrl !== lastUrl) {
			console.log("URL changed from", lastUrl, "to", currentUrl);
			lastUrl = currentUrl;

			// Wait a moment for the page content to update
			setTimeout(() => {
				// Extract and send job info when URL changes
				if (sidebarOpen) {
					extractJobInfo().then((jobInfo) => {
						iframe.contentWindow?.postMessage(
							{
								action: "fillJobInfo",
								data: jobInfo,
							},
							"*",
						);
					});
				}
			}, 1000); // Small delay to ensure page content has updated
		}
	});

	// Start observing URL changes by watching for changes in the body
	urlObserver.observe(document, { subtree: true, childList: true });

	// Create a toggle button that will be shown initially
	const toggleButton = document.createElement("div");
	toggleButton.id = "notion-job-tracker-toggle";
	toggleButton.innerHTML =
		'<span style="transform: rotate(180deg); display: block;">›</span>';
	toggleButton.style.position = "fixed";
	toggleButton.style.right = "0";
	toggleButton.style.top = "50%";
	toggleButton.style.transform = "translateY(-50%)";
	toggleButton.style.width = "30px";
	toggleButton.style.height = "60px";
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
	// Initialize sidebar state (closed by default)
	let sidebarOpen = false;

	// Check if sidebar was open in previous session
	try {
		chrome.storage.local.get(["sidebarOpen"], (result) => {
			if (result.sidebarOpen) {
				sidebarOpen = true;
				iframe.style.width = "380px";
				toggleButton.innerHTML = "<span>›</span>";
				toggleButton.style.right = "380px";

				// Extract and send job info when sidebar is initially open
				extractJobInfo().then((jobInfo) => {
					iframe.contentWindow?.postMessage(
						{
							action: "fillJobInfo",
							data: jobInfo,
						},
						"*",
					);
				});
			}
		});
	} catch (error) {
		console.log("Failed to read sidebar state from chrome.storage:", error);
		// Fallback to localStorage
		try {
			const savedState = localStorage.getItem(
				"notion-job-tracker-sidebar-open",
			);
			if (savedState === "true") {
				sidebarOpen = true;
				iframe.style.width = "380px";
				toggleButton.innerHTML = "<span>›</span>";
				toggleButton.style.right = "380px";

				// Extract and send job info when sidebar is initially open
				extractJobInfo().then((jobInfo) => {
					iframe.contentWindow?.postMessage(
						{
							action: "fillJobInfo",
							data: jobInfo,
						},
						"*",
					);
				});
			}
		} catch (localError) {
			console.log(
				"Failed to read sidebar state from localStorage:",
				localError,
			);
		}
	}
	// Handle toggle button click
	toggleButton.addEventListener("click", () => {
		sidebarOpen = !sidebarOpen;

		if (sidebarOpen) {
			iframe.style.width = "380px";
			toggleButton.innerHTML = "<span>›</span>";
			toggleButton.style.right = "380px";

			// Extract and send job info when sidebar is opened
			extractJobInfo().then((jobInfo) => {
				iframe.contentWindow?.postMessage(
					{
						action: "fillJobInfo",
						data: jobInfo,
					},
					"*",
				);
			});
		} else {
			iframe.style.width = "0";
			toggleButton.innerHTML =
				'<span style="transform: rotate(180deg); display: block;">›</span>';
			toggleButton.style.right = "0";
		}

		// Save sidebar state (with error handling)
		try {
			chrome.storage.local.set({ sidebarOpen });
		} catch (error) {
			console.log("Failed to save sidebar state to chrome.storage:", error);
			// Fallback to localStorage
			try {
				localStorage.setItem(
					"notion-job-tracker-sidebar-open",
					String(sidebarOpen),
				);
			} catch (localError) {
				console.log(
					"Failed to save sidebar state to localStorage:",
					localError,
				);
			}
		}
	});

	// Listen for messages from the sidebar iframe
	window.addEventListener("message", (event) => {
		// Make sure the message is from our extension
		if (event.origin === chrome.runtime.getURL("").slice(0, -1)) {
			if (event.data.action === "toggleSidebar") {
				toggleButton.click();
			} else if (event.data.action === "extractJobInfo") {
				// Handle request to extract job info
				extractJobInfo().then((jobInfo) => {
					iframe.contentWindow?.postMessage(
						{
							action: "fillJobInfo",
							data: jobInfo,
						},
						"*",
					);
				});
			}
		}
	});
	// Listen for messages from the extension
	try {
		chrome.runtime.onMessage.addListener((request) => {
			if (request.action === "toggleSidebar") {
				toggleButton.click();
			} else if (request.action === "extractJobInfo") {
				// Extract job info and respond
				extractJobInfo().then((jobInfo) => {
					iframe.contentWindow?.postMessage(
						{
							action: "fillJobInfo",
							data: jobInfo,
						},
						"*",
					);
					return jobInfo;
				});
			}
			return true;
		});
	} catch (error) {
		console.log("Failed to add chrome.runtime message listener:", error);
	}
}

// Check if the page already has our sidebar
if (!document.getElementById("notion-job-tracker-sidebar")) {
	injectSidebar();
}

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
	console.log(
		"Failed to add chrome.runtime message listener for extractJobInfo:",
		error,
	);
}

// Define the job info interface
interface JobInfo {
	company: string;
	position: string;
	location: string;
	salary: string;
	description: string;
	error?: string;
}

// Use the existing job extraction function
// This is borrowed from the original contentScript.ts
async function extractJobInfo(): Promise<JobInfo> {
	const url = window.location.href;
	let jobInfo: JobInfo = {
		company: "",
		position: "",
		location: "",
		salary: "",
		description: "",
	};

	// Only extract from LinkedIn job pages
	if (
		url.includes("linkedin.com/jobs/") ||
		url.includes("linkedin.com/job/") ||
		(url.includes("linkedin.com") && url.includes("/view/"))
	) {
		console.log("LinkedIn job page detected, extracting information...");
		try {
			// Wait a short time to ensure the page is fully loaded after AJAX changes
			await new Promise((resolve) => setTimeout(resolve, 300));
			jobInfo = await extractFromLinkedIn();
			console.log("Extracted job info:", jobInfo);
		} catch (error) {
			console.error("Error extracting job info:", error);
		}
	} else {
		console.log("Not a LinkedIn job page, no information extracted");
	}

	return jobInfo;
}

// Extract job info from LinkedIn
async function extractFromLinkedIn(): Promise<JobInfo> {
	const jobInfo: JobInfo = {
		company: "",
		position: "",
		location: "",
		salary: "",
		description: "",
	};

	// LinkedIn has different layouts, so we need to try different selectors

	// Job title - try multiple possible selectors
	const titleSelectors = [
		".job-details-jobs-unified-top-card__job-title", // New job page layout
		"h1.top-card-layout__title", // Another possible layout
		"h1.job-title", // Another possible layout
		"h2.t-24.t-bold.jobs-unified-top-card__job-title", // Additional selector for modern LinkedIn
		".jobs-unified-top-card__job-title", // Generic class
	];

	for (const selector of titleSelectors) {
		const titleElement = document.querySelector(selector);
		if (titleElement?.textContent?.trim()) {
			jobInfo.position = titleElement.textContent.trim();
			break;
		}
	}

	// Company name - try multiple possible selectors
	const companySelectors = [
		".topcard__org-name-link", // Standard company link
		".job-details-jobs-unified-top-card__company-name", // New layout company name
		'a[data-tracking-control-name="public_jobs_topcard-org-name"]', // Tracking attribute
		".jobs-unified-top-card__company-name", // Another variation
		'a[data-tracking-control-name="public_jobs_topcard_company_name"]', // Another tracking attribute
		"a[data-test-job-company-name]", // Data attribute selector
		".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__company-name", // Nested selector
	];

	for (const selector of companySelectors) {
		const companyElement = document.querySelector(selector);
		if (companyElement?.textContent?.trim()) {
			jobInfo.company = companyElement.textContent.trim();
			break;
		}
	}

	// Location - try multiple possible selectors
	const locationSelectors = [
		".job-details-jobs-unified-top-card__bullet", // New job page layout
		".job-details-jobs-unified-top-card__workplace-type", // New job page layout for remote
		".topcard__flavor--bullet", // Older job page layout
		".job-details-jobs-unified-top-card__company-name + span", // Sibling of company name
		"span.location", // Standard location span
		".jobs-unified-top-card__bullet", // Generic bullet class
		".jobs-unified-top-card__workplace-type", // Workplace type
		".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__bullet", // Nested structure
	];

	for (const selector of locationSelectors) {
		const locationElement = document.querySelector(selector);
		if (locationElement?.textContent?.trim()) {
			jobInfo.location = locationElement.textContent.trim();
			break;
		}
	}

	// Salary - try multiple possible selectors
	const salarySelectors = [
		".compensation__salary", // Standard salary
		".job-details-jobs-unified-top-card__job-insight > .job-details-jobs-unified-top-card__job-insight-view-model-secondary", // New layout salary
		".jobs-unified-top-card__job-insight:contains('$')", // Modern LinkedIn salary
		".jobs-unified-top-card__job-insight-container .jobs-unified-top-card__job-insight:contains('$')", // Nested structure
	];

	for (const selector of salarySelectors) {
		let salaryElement;
		if (selector.includes(":contains")) {
			// For custom selector with :contains
			const textToFind = selector.match(/:"(.*?)"/)?.[1] || "$";
			const elements = document.querySelectorAll(
				selector.split(":contains")[0],
			);
			salaryElement = Array.from(elements).find((el) =>
				el.textContent?.includes(textToFind),
			);
		} else {
			salaryElement = document.querySelector(selector);
		}

		if (salaryElement?.textContent?.trim()) {
			jobInfo.salary = salaryElement.textContent.trim();
			break;
		}
	}

	// Job description - try multiple possible selectors
	const descriptionSelectors = [
		".job-details-jobs-unified-top-card__description-container", // New job page description container
		".show-more-less-html__markup", // Another description container
		"#job-details", // Job details section
		".description__text", // Older description text layout
		".jobs-description", // Modern description container
		".jobs-description-content", // Content within description
		".jobs-box__html-content", // HTML content box
	];

	for (const selector of descriptionSelectors) {
		const descriptionElement = document.querySelector(selector);
		if (descriptionElement?.textContent?.trim()) {
			jobInfo.description = descriptionElement.textContent.trim();
			break;
		}
	}

	return jobInfo;
}
