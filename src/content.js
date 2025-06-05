//Same content as the original content.js file
// content.js
// This script runs on the job listing pages to extract job information

import { LMStudioClient } from "@lmstudio/sdk";

// Listen for messages from popup script
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'extractJobInfo') {
    const jobInfo = await extractJobInfo();
    sendResponse(jobInfo);
  }
  return true; // Return true to allow asynchronous response
});

// Function to extract job information from different job sites
async function extractJobInfo() {
  const url = window.location.href;
  let jobInfo = {
    company: '',
    position: '',
    location: '',
    salary: '',
    description: ''
  };
  // LinkedIn job page - check for various LinkedIn job URL formats
  if (url.includes('linkedin.com/jobs/') || 
      url.includes('linkedin.com/job/') || 
      (url.includes('linkedin.com') && url.includes('/view/'))) {
    jobInfo = await extractFromLinkedIn();
  }
  // Indeed job page
  else if (url.includes('indeed.com/viewjob') || url.includes('indeed.com/job/')) {
    jobInfo = extractFromIndeed();
  }
  // Glassdoor job page
  else if (url.includes('glassdoor.com') && (url.includes('/job-listing/') || url.includes('/Details/'))) {
    jobInfo = extractFromGlassdoor();
  }
  // Google Jobs
  else if (url.includes('google.com/search') && document.querySelector('.vNEEBe')) {
    jobInfo = extractFromGoogleJobs();
  }
  
  return jobInfo;
}

// Extract job info from LinkedIn
async function extractFromLinkedIn() {
  const jobInfo = {
    company: '',
    position: '',
    location: '',
    salary: '',
    description: ''
  };

  // LinkedIn has different layouts, so we need to try different selectors
  
  // Job title - try multiple possible selectors
  const titleSelectors = [
    '.top-card-layout__title',                        // Standard job page
    '.job-details-jobs-unified-top-card__job-title',  // New job page layout
    'h1.t-24',                                       // Another possible job title format
    'h1.job-view-title',                             // Another variation
    'h1[data-test-job-title]'                        // Data attribute selector
  ];
  
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent.trim()) {
      jobInfo.position = titleElement.textContent.trim();
      break;
    }
  }

  // Company name - try multiple possible selectors
  const companySelectors = [
    '.topcard__org-name-link',                        // Standard company link
    '.job-details-jobs-unified-top-card__company-name', // New layout company name
    'a[data-tracking-control-name="public_jobs_topcard-org-name"]', // Tracking attribute
    '.jobs-unified-top-card__company-name',           // Another variation
    'a[data-tracking-control-name="public_jobs_topcard_company_name"]', // Another tracking attribute
    'a[data-test-job-company-name]'                  // Data attribute selector
  ];
  
  for (const selector of companySelectors) {
    const companyElement = document.querySelector(selector);
    if (companyElement && companyElement.textContent.trim()) {
      jobInfo.company = companyElement.textContent.trim();
      break;
    }
  }

  // Location - try multiple possible selectors
  const locationSelectors = [
    '.topcard__flavor--bullet',                      // Standard location
    '.job-details-jobs-unified-top-card__bullet',     // New layout bullet (location)
    '.jobs-unified-top-card__bullet',                // Another variation
    '.job-details-jobs-unified-top-card__workplace-type', // Workplace type might include location
    'span[data-test-job-location]',                  // Data attribute selector
    '.jobs-unified-top-card__location'               // Another possible location selector
  ];

  for (const selector of locationSelectors) {
    const locationElement = document.querySelector(selector);
    if (locationElement && locationElement.textContent.trim()) {
      jobInfo.location = locationElement.textContent.trim().replace(/\s+/g, ' ');
      break;
    }
  }
  
  // Salary - LinkedIn doesn't always show salary, so this might be empty
  const salarySelectors = [
    '.compensation__salary-range',                   // Standard salary range
    '.job-details-jobs-unified-top-card__salary-range', // New layout salary range
    '.salary-range-text'                           // Another possible salary selector
  ];
  
  for (const selector of salarySelectors) {
    const salaryElement = document.querySelector(selector);
    if (salaryElement && salaryElement.textContent.trim()) {
      jobInfo.salary = salaryElement.textContent.trim();
      break;
    }
  }
  
  // Job description - try multiple possible selectors
  const descriptionSelectors = [
    '.jobs-description__container',                  // Standard description container
    '.jobs-description-content__text',               // Job description text in new layout
    '.jobs-description',                             // Another possible description selector
    '.description__text',                             // Another variation
    '[data-test-job-description]'                     // Data attribute selector
  ];
  
  for (const selector of descriptionSelectors) {
    const descriptionElement = document.querySelector(selector);
    if (descriptionElement && descriptionElement.textContent.trim()) {
      jobInfo.description = descriptionElement.textContent.trim().substring(0, 5000); // Limit to 5000 chars
    }
    const client = new LMStudioClient();
    console.log("AI!!!!");
    const model = await client.llm.model("deepseek-r1-distill-llama-8b");
    const result = await model.respond(jobInfo.description);
    jobInfo.description = result.content
  }
  
  return jobInfo;
}

// Extract job info from Indeed
function extractFromIndeed() {
  const jobInfo = {
    company: '',
    position: '',
    location: '',
    salary: '',
    description: ''
  };
  
  // Job title
  const titleElement = document.querySelector('.jobsearch-JobInfoHeader-title');
  if (titleElement) {
    jobInfo.position = titleElement.textContent.trim();
  }
  
  // Company name
  const companyElement = document.querySelector('.jobsearch-InlineCompanyRating-companyName');
  if (companyElement) {
    jobInfo.company = companyElement.textContent.trim();
  }
  
  // Location
  const locationElement = document.querySelector('.jobsearch-JobInfoHeader-locationText');
  if (locationElement) {
    jobInfo.location = locationElement.textContent.trim();
  }
  
  // Salary
  const salaryElement = document.querySelector('[data-testid="attribute_snippet_compensation"]');
  if (salaryElement) {
    jobInfo.salary = salaryElement.textContent.trim();
  }
  
  // Description
  const descriptionElement = document.querySelector('#jobDescriptionText');
  if (descriptionElement) {
    jobInfo.description = descriptionElement.textContent.trim().substring(0, 5000); // Limit to 5000 chars
  }
  
  return jobInfo;
}

// Extract job info from Glassdoor
function extractFromGlassdoor() {
  const jobInfo = {
    company: '',
    position: '',
    location: '',
    salary: '',
    description: ''
  };
  
  // Job title
  const titleElement = document.querySelector('.job-title');
  if (titleElement) {
    jobInfo.position = titleElement.textContent.trim();
  }
  
  // Company name
  const companyElement = document.querySelector('.employer-name');
  if (companyElement) {
    jobInfo.company = companyElement.textContent.trim();
  }
  
  // Location
  const locationElement = document.querySelector('.location');
  if (locationElement) {
    jobInfo.location = locationElement.textContent.trim();
  }
  
  // Salary - Glassdoor often shows salary range
  const salaryElement = document.querySelector('.salary-estimate');
  if (salaryElement) {
    jobInfo.salary = salaryElement.textContent.trim();
  }
  
  // Description
  const descriptionElement = document.querySelector('.jobDescriptionContent');
  if (descriptionElement) {
    jobInfo.description = descriptionElement.textContent.trim().substring(0, 5000); // Limit to 5000 chars
  }
  
  return jobInfo;
}

// Extract job info from Google Jobs
function extractFromGoogleJobs() {
  const jobInfo = {
    company: '',
    position: '',
    location: '',
    salary: '',
    description: ''
  };
  
  // Job title
  const titleElement = document.querySelector('.vNEEBe');
  if (titleElement) {
    jobInfo.position = titleElement.textContent.trim();
  }
  
  // Company name
  const companyElement = document.querySelector('.nJlQNd');
  if (companyElement) {
    jobInfo.company = companyElement.textContent.trim();
  }
  
  // Location
  const locationElement = document.querySelector('.Qk80Jf');
  if (locationElement) {
    jobInfo.location = locationElement.textContent.trim();
  }
  
  // Salary
  const salaryElement = document.querySelector('[data-attrid="subtitle"] span');
  if (salaryElement && salaryElement.textContent.includes('$')) {
    jobInfo.salary = salaryElement.textContent.trim();
  }
  
  // Description
  const descriptionElement = document.querySelector('.HBvzbc');
  if (descriptionElement) {
    jobInfo.description = descriptionElement.textContent.trim().substring(0, 5000); // Limit to 5000 chars
  }
  
  return jobInfo;
}
