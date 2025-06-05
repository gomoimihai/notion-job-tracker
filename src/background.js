'use strict';

import { LMStudioClient } from "@lmstudio/sdk";
// background.js
// Prevent duplicate submissions
let isSubmitting = false;

// Store recently submitted job URLs to prevent duplicates
const recentlySubmittedJobs = new Set();
const MAX_RECENT_JOBS = 50; // Remember the last 50 jobs

// Function to check if a job URL was recently submitted
function wasRecentlySubmitted(jobUrl) {
  return recentlySubmittedJobs.has(jobUrl);
}

// Function to add a job URL to the recently submitted list
function addToRecentlySubmitted(jobUrl) {
  // Add the current URL
  recentlySubmittedJobs.add(jobUrl);
  
  // If we have too many entries, remove the oldest ones
  // (This is a simplified approach since we don't track order properly in a Set)
  if (recentlySubmittedJobs.size > MAX_RECENT_JOBS) {
    // Convert to array, remove the first entry, and convert back to Set
    const jobArray = Array.from(recentlySubmittedJobs);
    recentlySubmittedJobs.clear();
    jobArray.slice(1).forEach(url => recentlySubmittedJobs.add(url));
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addJobToNotion') {
    const jobUrl = request.data.jobData.jobUrl;
    
    // Check if this job was recently submitted
    if (wasRecentlySubmitted(jobUrl)) {
      console.log("Job URL was recently submitted, preventing potential duplicate:", jobUrl);
      
      // Ask for confirmation before proceeding
      if (!request.data.forceSubmit) {
        sendResponse({ 
          success: false, 
          error: 'This job URL was recently submitted. To submit anyway, please try again.',
          requireConfirmation: true,
          jobUrl: jobUrl
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
        error: 'A job submission is already in progress. Please wait.' 
      });
      return true;
    }
    
    isSubmitting = true;
    console.log("Starting job submission to Notion");
    
    addJobToNotion(request.data)
      .then(result => {
        isSubmitting = false;
        
        // Add to recently submitted if successful
        if (result.success && jobUrl) {
          addToRecentlySubmitted(jobUrl);
        }
        
        console.log("Job submission completed successfully");
        sendResponse(result);
      })
      .catch(error => {
        isSubmitting = false;
        console.log("Job submission failed:", error);
        sendResponse({ 
          success: false, 
          error: error.message || 'Error adding job to Notion' 
        });
      });
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
});

// Function to add a job to the Notion database
async function addJobToNotion(data) {
  const { notionToken, databaseId, jobData } = data;
  
  // Format date for Notion (YYYY-MM-DD)
  const formattedDate = new Date().toISOString().split('T')[0];
  
  try {
    // First, let's fetch the database structure to understand its schema
    const dbResponse = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });
    
    if (!dbResponse.ok) {
      const error = await dbResponse.json();
      throw new Error(error.message || `Error fetching database: ${dbResponse.status}`);
    }
    
    const dbSchema = await dbResponse.json();
    console.log('Database schema:', dbSchema);
    
    // Helper function to find the correct property name in the database
    function findPropertyName(searchName) {
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
    const properties = {};
    
    // Company (Title property)
    const companyPropName = findPropertyName('Company');
    properties[companyPropName] = {
      title: [
        {
          text: {
            content: jobData.company
          }
        }
      ]
    };
    
    // Position
    const positionPropName = findPropertyName('Position');
    if (dbSchema.properties[positionPropName]?.type === 'rich_text') {
      properties[positionPropName] = {
        rich_text: [
          {
            text: {
              content: jobData.position
            }
          }
        ]
      };
    }
    
    // Location
    if (jobData.location) {
      const locationPropName = findPropertyName('Location');
      if (dbSchema.properties[locationPropName]?.type === 'rich_text') {
        properties[locationPropName] = {
          rich_text: [
            {
              text: {
                content: jobData.location
              }
            }
          ]
        };
      }
    }
    
    // URL
    const urlPropName = findPropertyName('URL');
    if (dbSchema.properties[urlPropName]?.type === 'url') {
      properties[urlPropName] = {
        url: jobData.jobUrl
      };
    }
    
    // Date Added
    const datePropName = findPropertyName('Date Added');
    if (dbSchema.properties[datePropName]?.type === 'date') {
      properties[datePropName] = {
        date: {
          start: formattedDate
        }
      };
    }
    
    // Status
    const statusPropName = findPropertyName('Status');
    if (dbSchema.properties[statusPropName]?.type === 'select') {
      properties[statusPropName] = {
        select: {
          name: jobData.status
        }
      };
    }
    
    // Salary
    if (jobData.salary) {
      const salaryPropName = findPropertyName('Salary');
      if (dbSchema.properties[salaryPropName]?.type === 'rich_text') {
        properties[salaryPropName] = {
          rich_text: [
            {
              text: {
                content: jobData.salary
              }
            }
          ]
        };
      }
    }
    
    // Description
    if (jobData.description) {
      const descPropName = findPropertyName('Description');
      if (dbSchema.properties[descPropName]?.type === 'rich_text') {
        // Notion has a 2000 character limit for rich_text properties
        const truncatedDescription = jobData.description.substring(0, 1900);
        properties[descPropName] = {
          rich_text: [
            {
              text: {
                content: truncatedDescription
              }
            }
          ]
        };
      }
    }
    
    // Notes
    if (jobData.notes) {
      const notesPropName = findPropertyName('Notes');
      if (dbSchema.properties[notesPropName]?.type === 'rich_text') {
        properties[notesPropName] = {
          rich_text: [
            {
              text: {
                content: jobData.notes
              }
            }
          ]
        };
      }
    }
    
    const client = new LMStudioClient();

    const model = await client.llm.model("deepseek-r1-distill-llama-8b");
    const modelResult = await model.respond(jobData.description);

    console.info(modelResult.content);

    // Now create the page with the correctly formatted properties
    const response = await fetch(`https://api.notion.com/v1/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28' // We're keeping this version for compatibility
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties: properties
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Notion API Error Response:", JSON.stringify(error, null, 2));
      throw new Error(error.message || `Error: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error("Error adding job to Notion:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}
