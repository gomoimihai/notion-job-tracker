// Listen for messages from popup script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if (request.action === "extractJobInfo") {
		// Use promise pattern to handle async function with sendResponse
		extractJobInfo()
			.then((jobInfo) => {
				console.log("Job info extracted:", jobInfo);
				sendResponse(jobInfo);
			})
			.catch((error) => {
				console.error("Error extracting job info:", error);
				sendResponse({ error: error.message });
			});
	}
	return true; // Return true to allow asynchronous response
});

// Function to extract job information from LinkedIn jobs
async function extractJobInfo() {
	const url = window.location.href;
	let jobInfo = {
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
		jobInfo = await extractFromLinkedIn();
	} else {
		console.log("Not a LinkedIn job page, no information extracted");
	}

	return jobInfo;
}

// Extract job info from LinkedIn
async function extractFromLinkedIn() {
	const jobInfo = {
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
	];
	// console.log('da noi intram aici');
	for (const selector of titleSelectors) {
		const titleElement = document.querySelector(selector);
		if (titleElement?.textContent.trim()) {
			jobInfo.position = titleElement.textContent.trim();
			console.log("Position found:", jobInfo.position);
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
	];

	for (const selector of companySelectors) {
		const companyElement = document.querySelector(selector);
		if (companyElement?.textContent.trim()) {
			jobInfo.company = companyElement.textContent.trim();
			break;
		}
	}

	// Location - try multiple possible selectors
	const locationSelectors = [
		".topcard__flavor--bullet", // Standard location
		".job-details-jobs-unified-top-card__bullet", // New layout bullet (location)
		".jobs-unified-top-card__bullet", // Another variation
		".job-details-jobs-unified-top-card__workplace-type", // Workplace type might include location
		"span[data-test-job-location]", // Data attribute selector
		".jobs-unified-top-card__location", // Another possible location selector
	];

	for (const selector of locationSelectors) {
		const locationElement = document.querySelector(selector);
		if (locationElement?.textContent.trim()) {
			jobInfo.location = locationElement.textContent
				.trim()
				.replace(/\s+/g, " ");
			break;
		}
	}

	// Salary - LinkedIn doesn't always show salary, so this might be empty
	const salarySelectors = [
		".compensation__salary-range", // Standard salary range
		".job-details-jobs-unified-top-card__salary-range", // New layout salary range
		".salary-range-text", // Another possible salary selector
	];

	for (const selector of salarySelectors) {
		const salaryElement = document.querySelector(selector);
		if (salaryElement?.textContent.trim()) {
			jobInfo.salary = salaryElement.textContent.trim();
			break;
		}
	}

	// Job description - try multiple possible selectors
	const descriptionSelectors = [
		".jobs-description__container", // Standard description container
		".jobs-description-content__text", // Job description text in new layout
		".jobs-description", // Another possible description selector
		".description__text", // Another variation
		"[data-test-job-description]", // Data attribute selector
	];

	for (const selector of descriptionSelectors) {
		const descriptionElement = document.querySelector(selector);
		if (descriptionElement?.textContent.trim()) {
			jobInfo.description = descriptionElement.textContent
				.trim()
				.substring(0, 5000); // Limit to 5000 chars
			break;
		}
	}

	return jobInfo;
}
