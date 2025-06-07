// background.ts
import { analyzeJobDescription } from "./ai"; // Import the AI function
import {
	AddJobRequest,
	AddJobResponse,
	NotionDbSchema,
	AddJobToNotionParams,
	JobAnalysisInput,
	JobAnalysisOutput,
} from "./types";

// Handle browser action click (toolbar button)
chrome.action.onClicked.addListener((tab) => {
	if (tab.id) {
		chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
	}
});

// Cache for database schemas
interface SchemaCache {
	[key: string]: {
		schema: NotionDbSchema;
		timestamp: number;
	};
}

const schemaCache: SchemaCache = {};
const SCHEMA_CACHE_LIFETIME = 60 * 60 * 1000; // 1 hour in milliseconds

chrome.runtime.onMessage.addListener(
	(request: AddJobRequest, sender, sendResponse) => {
		const jobUrl = request.data.jobData.jobUrl;
		const enhanceAi = request.data.enhanceAi; // Get enhanceAi flag

		if (request.action === "enhanceWithAi") {
			let jobDataForNotion = { ...request.data.jobData };
			if (enhanceAi && jobDataForNotion.description) {
				try {
					console.log("Enhancing notes with AI...");

					analyzeJobDescription({
						description: jobDataForNotion.description,
					} as JobAnalysisInput)
						.then((result) => {
							// Format the response to match AddJobResponse interface
							sendResponse({
								success: true,
								data: result,
							});
						})
						.catch((error) => {
							console.error("AI analysis error:", error);
							sendResponse({
								success: false,
								error: error.message || "Error enhancing with AI",
							});
						});
				} catch (aiError) {
					console.error("Error during AI analysis:", aiError);
					sendResponse({
						success: false,
						error:
							aiError instanceof Error
								? aiError.message
								: "Error during AI analysis",
					});
				}
			} else {
				sendResponse({
					success: false,
					error: "AI enhancement is disabled or no description provided",
				});
			}
			return true;
		}
		if (request.action === "addJobToNotion") {
			// Check if this job was recently submitted
			if (wasRecentlySubmitted(jobUrl) && !request.data.forceSubmit) {
				console.log(
					"Job URL was recently submitted, preventing potential duplicate:",
					jobUrl,
				);

				// Ask for confirmation before proceeding
				if (!request.data.forceSubmit) {
					sendResponse({
						success: false,
						error:
							"This job URL was recently submitted. To submit anyway, please try again.",
						requireConfirmation: true,
						jobUrl: jobUrl,
					});
					return true;
				}

				console.log("Forcing submission of a potential duplicate job");
			}

			// Check if there's already a submission in progress
			if (isSubmitting) {
				console.log("Job submission already in progress, preventing duplicate");
				sendResponse({
					success: false,
					error: "A job submission is already in progress. Please wait.",
				});
				return true;
			}

			isSubmitting = true;
			console.log("Starting job submission to Notion");

			// Potentially modify jobData.notes with AI analysis before sending to Notion
			const processAndAddJob = async () => {
				let jobDataForNotion = { ...request.data.jobData };

				return addJobToNotion({
					notionToken: request.data.notionToken,
					databaseId: request.data.databaseId,
					jobData: jobDataForNotion, // Use potentially modified jobData
				});
			};

			processAndAddJob()
				.then((result) => {
					isSubmitting = false;

					// Add to recently submitted if successful
					if (result.success && jobUrl) {
						addToRecentlySubmitted(jobUrl);
					}

					console.log("Job submission completed successfully");
					sendResponse(result);
				})
				.catch((error) => {
					isSubmitting = false;
					console.log("Job submission failed:", error);
					sendResponse({
						success: false,
						error: error.message || "Error adding job to Notion",
					});
				});

			// Return true to indicate we'll respond asynchronously
			return true;
		}
	},
);

// Prevent duplicate submissions
let isSubmitting: boolean = false;

import { STORAGE } from "./constants";

// Store recently submitted job URLs to prevent duplicates
const recentlySubmittedJobs: Set<string> = new Set();

// Function to check if a job URL was recently submitted
function wasRecentlySubmitted(jobUrl: string): boolean {
	return recentlySubmittedJobs.has(jobUrl);
}

// Function to add a job URL to the recently submitted list
function addToRecentlySubmitted(jobUrl: string): void {
	// Add the current URL
	recentlySubmittedJobs.add(jobUrl);

	// If we have too many entries, remove the oldest ones
	// (This is a simplified approach since we don't track order properly in a Set)
	if (recentlySubmittedJobs.size > STORAGE.MAX_RECENT_JOBS) {
		// Convert to array, remove the first entry, and convert back to Set
		const jobArray = Array.from(recentlySubmittedJobs);
		recentlySubmittedJobs.clear();
		jobArray.slice(1).forEach((url) => recentlySubmittedJobs.add(url));
	}
}

// Function to check if a job with the given External ID already exists in the database
async function checkJobExistsInNotion(
	notionToken: string,
	databaseId: string,
	externalId: string,
): Promise<boolean> {
	try {
		console.log(
			`Checking if job with External ID ${externalId} already exists`,
		);

		// First, fetch the database schema to get the correct property name for ExternalID
		let dbSchema: NotionDbSchema;
		const cacheKey = `${databaseId}`;
		const currentTime = Date.now();

		// Try to use cached schema if available
		if (
			schemaCache[cacheKey] &&
			currentTime - schemaCache[cacheKey].timestamp < SCHEMA_CACHE_LIFETIME
		) {
			dbSchema = schemaCache[cacheKey].schema;
		} else {
			// Fetch the database structure
			const dbResponse = await fetch(
				`https://api.notion.com/v1/databases/${databaseId}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${notionToken}`,
						"Content-Type": "application/json",
						"Notion-Version": "2022-06-28",
					},
				},
			);

			if (!dbResponse.ok) {
				const error = await dbResponse.json();
				console.error("Error fetching database schema:", error);
				return false;
			}

			dbSchema = (await dbResponse.json()) as NotionDbSchema;
			schemaCache[cacheKey] = {
				schema: dbSchema,
				timestamp: currentTime,
			};
		}

		// Helper function to find the correct property name in the database
		function findPropertyName(searchName: string): string {
			// Try direct match first
			if (dbSchema.properties[searchName]) {
				return searchName;
			}

			// Try case-insensitive match
			const lowerSearchName = searchName.toLowerCase();
			for (const key in dbSchema.properties) {
				if (key.toLowerCase() === lowerSearchName) {
					return key; // Return the actual property name with correct case
				}
			}

			// Return original if no match found
			return searchName;
		}

		// Get the correct property name for ExternalID
		const externalIdPropName = findPropertyName("ExternalID");

		// Use Notion's query API to search for the external ID
		const response = await fetch(
			`https://api.notion.com/v1/databases/${databaseId}/query`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${notionToken}`,
					"Content-Type": "application/json",
					"Notion-Version": "2022-06-28",
				},
				body: JSON.stringify({
					filter: {
						property: externalIdPropName,
						rich_text: {
							equals: externalId,
						},
					},
				}),
			},
		);

		if (!response.ok) {
			const error = await response.json();
			console.error("Error checking for existing job:", error);
			// If there's an error, we'll conservatively return false and continue with the submission
			return false;
		}

		const result = await response.json();
		console.log(
			`Found ${result.results.length} matching jobs with ExternalID: ${externalId}`,
		);

		// If we found any matching records, a job with this ID already exists
		return result.results.length > 0;
	} catch (error) {
		console.error("Error checking for existing job:", error);
		// If there's an exception, we'll conservatively return false
		return false;
	}
}

// Function to add a job to the Notion database
async function addJobToNotion(
	data: AddJobToNotionParams,
): Promise<AddJobResponse> {
	const { notionToken, databaseId, jobData } = data;
	console.log(jobData);
	// Format date for Notion (YYYY-MM-DD)
	const formattedDate = new Date().toISOString().split("T")[0];

	try {
		// Check if a job with this External ID already exists
		if (jobData.id) {
			const jobExists = await checkJobExistsInNotion(
				notionToken,
				databaseId,
				jobData.id,
			);
			if (jobExists) {
				return {
					success: false,
					error: `A job with External ID "${jobData.id}" already exists in the database.`,
					requireConfirmation: false,
					jobUrl: jobData.jobUrl,
				};
			}
		}

		// Check if we have a valid cached schema
		let dbSchema: NotionDbSchema;
		const cacheKey = `${databaseId}`;
		const currentTime = Date.now();

		if (
			schemaCache[cacheKey] &&
			currentTime - schemaCache[cacheKey].timestamp < SCHEMA_CACHE_LIFETIME
		) {
			console.log("Using cached database schema");
			dbSchema = schemaCache[cacheKey].schema;
		} else {
			console.log("Fetching fresh database schema");
			// Fetch the database structure to understand its schema
			const dbResponse = await fetch(
				`https://api.notion.com/v1/databases/${databaseId}`,
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${notionToken}`,
						"Content-Type": "application/json",
						"Notion-Version": "2022-06-28",
					},
				},
			);

			if (!dbResponse.ok) {
				const error = await dbResponse.json();
				throw new Error(
					error.message || `Error fetching database: ${dbResponse.status}`,
				);
			}

			dbSchema = (await dbResponse.json()) as NotionDbSchema;

			// Store in cache
			schemaCache[cacheKey] = {
				schema: dbSchema,
				timestamp: currentTime,
			};
		}

		// Cache the schema with the current timestamp
		schemaCache[databaseId] = {
			schema: dbSchema,
			timestamp: Date.now(),
		};

		// Helper function to find the correct property name in the database
		function findPropertyName(searchName: string): string {
			// Try direct match first
			if (dbSchema.properties[searchName]) {
				return searchName;
			}

			// Try case-insensitive match
			const lowerSearchName = searchName.toLowerCase();
			for (const key in dbSchema.properties) {
				if (key.toLowerCase() === lowerSearchName) {
					return key; // Return the actual property name with correct case
				}
			}

			// Return original if no match found
			return searchName;
		}

		// Build properties object with correct property names from the database
		const properties: Record<string, any> = {};

		// Company (Title property)
		const idPropName = findPropertyName("ExternalID");
		if (dbSchema.properties[idPropName]?.type === "rich_text") {
			properties[idPropName] = {
				rich_text: [
					{
						text: {
							content: jobData.id,
						},
					},
				],
			};
		}

		// Company (Title property)
		const companyPropName = findPropertyName("Company");
		properties[companyPropName] = {
			title: [
				{
					text: {
						content: jobData.company,
					},
				},
			],
		};

		// Position
		const positionPropName = findPropertyName("Position");
		if (dbSchema.properties[positionPropName]?.type === "rich_text") {
			properties[positionPropName] = {
				rich_text: [
					{
						text: {
							content: jobData.position,
						},
					},
				],
			};
		}

		// Location
		if (jobData.location) {
			const locationPropName = findPropertyName("Location");
			if (dbSchema.properties[locationPropName]?.type === "rich_text") {
				properties[locationPropName] = {
					rich_text: [
						{
							text: {
								content: jobData.location,
							},
						},
					],
				};
			}
		}

		// URL
		const urlPropName = findPropertyName("URL");
		if (dbSchema.properties[urlPropName]?.type === "url") {
			properties[urlPropName] = {
				url: jobData.jobUrl,
			};
		}

		// Status
		const statusPropName = findPropertyName("Status");
		if (dbSchema.properties[statusPropName]?.type === "select") {
			properties[statusPropName] = {
				select: {
					name: jobData.status,
				},
			};
		}

		// Date Added
		const dateAddedPropName = findPropertyName("Date Added");
		if (dbSchema.properties[dateAddedPropName]?.type === "date") {
			properties[dateAddedPropName] = {
				date: {
					start: formattedDate,
				},
			};
		}

		// Description
		const descriptionPropName = findPropertyName("Description");
		if (dbSchema.properties[descriptionPropName]?.type === "rich_text") {
			properties[descriptionPropName] = {
				rich_text: [
					{
						text: {
							content: jobData.description.substring(0, 2000), // Notion rich text limit
						},
					},
				],
			};
		}

		// Notes
		const notesPropName = findPropertyName("Notes");
		if (dbSchema.properties[notesPropName]?.type === "rich_text") {
			properties[notesPropName] = {
				rich_text: [
					{
						text: {
							content: jobData.notes.substring(0, 2000), // Notion rich text limit
						},
					},
				],
			};
		}

		// Salary
		if (jobData.salary) {
			const salaryPropName = findPropertyName("Salary");
			// Check if salary property is rich_text or number
			if (dbSchema.properties[salaryPropName]?.type === "rich_text") {
				properties[salaryPropName] = {
					rich_text: [
						{
							text: {
								content: jobData.salary,
							},
						},
					],
				};
			} else if (dbSchema.properties[salaryPropName]?.type === "number") {
				// Attempt to parse salary as a number. This is a basic attempt.
				// You might need more robust parsing depending on salary string formats.
				const salaryNumber = parseFloat(
					jobData.salary.replace(/[^\\d.-]/g, ""),
				);
				if (!isNaN(salaryNumber)) {
					properties[salaryPropName] = {
						number: salaryNumber,
					};
				} else {
					// Fallback to storing as text if parsing fails, or handle error
					console.warn(
						`Could not parse salary "${jobData.salary}" as a number. Storing as text if possible or skipping.`,
					);
					// Optionally, you could try to find a text-based salary field or skip
				}
			}
		}

		// Create the page in Notion
		const response = await fetch(`https://api.notion.com/v1/pages`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${notionToken}`,
				"Content-Type": "application/json",
				"Notion-Version": "2022-06-28", // We're keeping this version for compatibility
			},
			body: JSON.stringify({
				parent: {
					database_id: databaseId,
				},
				properties: properties,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error(
				"Notion API Error Response:",
				JSON.stringify(error, null, 2),
			);
			throw new Error(error.message || `Error: ${response.status}`);
		}

		const result = await response.json();
		return { success: true, data: result };
	} catch (error: any) {
		console.error("Error adding job to Notion:", error);
		if ("response" in error) {
			console.error("Response data:", error.response.data);
			console.error("Response status:", error.response.status);
		}
		throw error;
	}
}
