// background.ts
import { analyzeJobDescription } from "./ai"; // Import the AI function
import { JobData } from "./types/job";
import { AddJobRequest, AddJobResponse } from "./types/messages";
import { NotionDbSchema, AddJobToNotionParams } from "./types/notion";
import { JobAnalysisInput, JobAnalysisOutput } from "./types/ai";

// Handle browser action click (toolbar button)
chrome.action.onClicked.addListener((tab) => {
	if (tab.id) {
		chrome.tabs.sendMessage(tab.id, { action: "toggleSidebar" });
	}
});

// Prevent duplicate submissions
let isSubmitting: boolean = false;

import { STORAGE } from "./types/constants";

// Store recently submitted job URLs to prevent duplicates
const recentlySubmittedJobs: Set<string> = new Set();
const MAX_RECENT_JOBS: number = STORAGE.MAX_RECENT_JOBS; // Remember the last 50 jobs

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
	if (recentlySubmittedJobs.size > MAX_RECENT_JOBS) {
		// Convert to array, remove the first entry, and convert back to Set
		const jobArray = Array.from(recentlySubmittedJobs);
		recentlySubmittedJobs.clear();
		jobArray.slice(1).forEach((url) => recentlySubmittedJobs.add(url));
	}
}

chrome.runtime.onMessage.addListener(
	(request: AddJobRequest, sender, sendResponse) => {
		if (request.action === "addJobToNotion") {
			const jobUrl = request.data.jobData.jobUrl;
			const enhanceAi = request.data.enhanceAi; // Get enhanceAi flag

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

				if (enhanceAi && jobDataForNotion.description) {
					try {
						console.log("Enhancing notes with AI...");
						const aiAnalysis: JobAnalysisOutput = await analyzeJobDescription({
							description: jobDataForNotion.description,
						} as JobAnalysisInput);
						// Format the AI analysis into notes
						let aiNotes = "";
						if (aiAnalysis) {
							// Create a more structured, readable format for the AI analysis
							aiNotes = `## AI Analysis\n\nSuggested Title: ${aiAnalysis.title}\n\nEstimated Salary Range: ${aiAnalysis.salary}`;
						}

						// Append AI notes to existing notes or set as new notes
						if (jobDataForNotion.notes) {
							jobDataForNotion.notes += `\\n\\n${aiNotes}`;
						} else {
							jobDataForNotion.notes = aiNotes;
						}
						console.log("AI enhanced notes:", jobDataForNotion.notes);
					} catch (aiError) {
						console.error("Error during AI analysis:", aiError);
						// Decide how to handle AI errors: proceed without AI notes, or send error back
						// For now, proceeding without AI enhancement on error.
					}
				}

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

// Using NotionDbSchema imported from types/notion

// Function to add a job to the Notion database
async function addJobToNotion(
	data: AddJobToNotionParams,
): Promise<AddJobResponse> {
	const { notionToken, databaseId, jobData } = data;

	// Format date for Notion (YYYY-MM-DD)
	const formattedDate = new Date().toISOString().split("T")[0];

	try {
		// First, let's fetch the database structure to understand its schema
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

		const dbSchema = (await dbResponse.json()) as NotionDbSchema;
		console.log("Database schema:", dbSchema);

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
