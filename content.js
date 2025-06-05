// content.js
// This script runs on the job listing pages to extract job information

// Listen for messages from popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobInfo') {
    const jobInfo = extractJobInfo();
    sendResponse(jobInfo);
  }
  return true; // Return true to allow asynchronous response
});

// Function to extract job information from different job sites
function extractJobInfo() {
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
    jobInfo = extractFromLinkedIn();
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
function extractFromLinkedIn() {
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
      jobInfo.location = locationElement.textContent.trim();
      break;
    }
  }

  // Salary - try multiple possible sources
  // First check compensation insights section
  const compensationSections = [
    '.compensation-insights-section', 
    '.salary-insights-section',
    '.job-details-jobs-unified-top-card__job-insight',
    '.job-details-jobs-unified-top-card__salary-context'
  ];
  
  for (const selector of compensationSections) {
    const salarySection = document.querySelector(selector);
    if (salarySection && salarySection.textContent.toLowerCase().includes('salary')) {
      jobInfo.salary = salarySection.textContent.trim().replace(/\s+/g, ' ');
      break;
    }
  }
  
  // If salary not found in compensation insights, look elsewhere
  if (!jobInfo.salary) {
    // Check job insights
    const jobInsightSelectors = [
      '.decorated-job-posting__details--employment-status',
      '.job-details-jobs-unified-top-card__job-insight',
      'li.jobs-unified-top-card__job-insight',
      '.jobs-box__group .t-14 span[aria-hidden="true"]',
      '.job-view-layout.jobs-details .jobs-box__group'
    ];
    
    for (const selector of jobInsightSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const text = element.textContent.toLowerCase();
        if (text.includes('salary') || text.includes('compensation') || text.includes('pay') || 
            text.includes('$') || text.includes('€') || text.includes('£')) {
          jobInfo.salary = element.textContent.trim();
          break;
        }
      }
      if (jobInfo.salary) break;
    }
  }
  
  // Try to extract information from job description
  if (!jobInfo.salary) {
    const jobDescriptionSelectors = [
      '.description__text',
      '.jobs-description-content',
      '.jobs-box__html-content',
      '.jobs-description__content'
    ];
    
    for (const selector of jobDescriptionSelectors) {
      const descriptionElement = document.querySelector(selector);
      if (descriptionElement) {
        const descriptionText = descriptionElement.textContent;
        
        // Look for salary patterns in the description
        const salaryPatterns = [
          /\$\s*\d+[,.]?\d+\s*(?:-|to|–)\s*\$?\s*\d+[,.]?\d+/i,  // $50,000 - $70,000
          /salary(?:\s*range)?(?:\s*is)?(?:\s*:)?\s*\$\s*\d+[,.]?\d+/i,  // Salary: $50,000
          /compensation(?:\s*range)?(?:\s*is)?(?:\s*:)?\s*\$\s*\d+[,.]?\d+/i,  // Compensation: $50,000
          /\$\d+[,.]?\d+\s*(?:per|\/)\s*(?:year|yr|annual|annum)/i,  // $50,000 per year
          /\$\d+[,.]?\d+\s*(?:per|\/)\s*(?:hour|hr)/i,  // $25 per hour
          /\$\d+[,.]?\d+k(?:\s*-\s*\$?\d+[,.]?\d+k)?/i  // $50k - $70k
        ];
        
        for (const pattern of salaryPatterns) {
          const match = descriptionText.match(pattern);
          if (match) {
            jobInfo.salary = match[0];
            break;
          }
        }
        if (jobInfo.salary) break;      }
    }
  }

  // Extract the job description using the jobs-description__container class
  const descriptionSelectors = [
    '.jobs-description__container',          // Primary selector you specified
    '.jobs-description',                    // Parent container
    '.jobs-box__html-content',              // Another possible container
    '.jobs-description-content',            // Alternative container
    '.description__text',                   // Legacy selector
    '[data-job-description]'                // Data attribute selector
  ];
  
  for (const selector of descriptionSelectors) {
    const descContainer = document.querySelector(selector);
    if (descContainer) {
      // Get the text content, preserving some formatting
      try {
        // Try to preserve some formatting by extracting HTML
        const cleanDescription = cleanupDescription(descContainer.innerHTML);
        jobInfo.description = cleanDescription;
      } catch (e) {
        // Fallback to plain text if HTML extraction fails
        jobInfo.description = descContainer.textContent.trim()
          .replace(/\s+/g, ' ')  // Replace multiple whitespace with single space
          .replace(/\n\s*\n/g, '\n\n'); // Keep paragraph breaks
      }
      
      // If we found a description, no need to check other selectors
      if (jobInfo.description) {
        // Limit description length to avoid extremely long text
        if (jobInfo.description.length > 20000) {
          jobInfo.description = jobInfo.description.substring(0, 20000) + '...';
        }
        break;
      }
    }
  }

  return jobInfo;
}

// Helper function to clean up HTML description
function cleanupDescription(html) {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove script tags
  const scripts = tempDiv.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove style tags
  const styles = tempDiv.querySelectorAll('style');
  styles.forEach(style => style.remove());
  
  // Convert some HTML elements to plain text with minimal formatting
  let text = tempDiv.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')                  // Convert <br> to newlines
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')      // Convert paragraphs to text with newlines
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')    // Convert list items to bullets
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '$1\n\n')  // Convert headings to text
    .replace(/<[^>]*>/g, '');                       // Remove any remaining HTML tags
  
  // Clean up whitespace
  text = text.trim()
    .replace(/\n{3,}/g, '\n\n')                     // Replace 3+ newlines with 2
    .replace(/\s+/g, ' ')                           // Replace multiple spaces with single space
    .replace(/\n\s+/g, '\n')                        // Remove spaces at start of lines
    .replace(/\n+$/, '');                           // Remove trailing newlines
  
  return text;
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
  const titleElement = document.querySelector('h1.jobsearch-JobInfoHeader-title');
  if (titleElement) {
    jobInfo.position = titleElement.textContent.trim();
  }

  // Company name
  const companyElement = document.querySelector('[data-testid="inlineCompanyName"]');
  if (companyElement) {
    jobInfo.company = companyElement.textContent.trim();
  }

  // Location
  const locationElement = document.querySelector('[data-testid="job-location"]');
  if (locationElement) {
    jobInfo.location = locationElement.textContent.trim();
  }
  // Salary
  const salaryElement = document.querySelector('[data-testid="attribute_snippet_compensation"]');
  if (salaryElement) {
    jobInfo.salary = salaryElement.textContent.trim();
  }
  
  // Job description
  const descriptionSelectors = [
    '.jobsearch-jobDescriptionText',
    '[data-testid="job-description"]',
    '#jobDescriptionText'
  ];
  
  for (const selector of descriptionSelectors) {
    const descElement = document.querySelector(selector);
    if (descElement) {
      try {
        // Try to preserve some formatting by extracting HTML
        jobInfo.description = cleanupDescription(descElement.innerHTML);
      } catch (e) {
        // Fallback to plain text
        jobInfo.description = descElement.textContent.trim();
      }
      
      if (jobInfo.description) {
        // Limit description length
        if (jobInfo.description.length > 5000) {
          jobInfo.description = jobInfo.description.substring(0, 5000) + '...';
        }
        break;
      }
    }
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
  const titleElement = document.querySelector('.e1tk4fih2');
  if (titleElement) {
    jobInfo.position = titleElement.textContent.trim();
  }

  // Company name
  const companyElement = document.querySelector('.e1tk4fih5');
  if (companyElement) {
    jobInfo.company = companyElement.textContent.trim();
  }

  // Location
  const locationElement = document.querySelector('.e1tk4fih4');
  if (locationElement) {
    jobInfo.location = locationElement.textContent.trim();
  }
  // Salary - Glassdoor often shows salary
  const salaryElement = document.querySelector('[data-test="detailSalary"]');
  if (salaryElement) {
    jobInfo.salary = salaryElement.textContent.trim();
  }
  
  // Job description
  const descriptionSelectors = [
    '.jobDescriptionContent',
    '.desc',
    '[data-test="description"]',
    '.jobDescriptionPadding',
    '.job-description'
  ];
  
  for (const selector of descriptionSelectors) {
    const descElement = document.querySelector(selector);
    if (descElement) {
      try {
        jobInfo.description = cleanupDescription(descElement.innerHTML);
      } catch (e) {
        jobInfo.description = descElement.textContent.trim();
      }
      
      if (jobInfo.description) {
        if (jobInfo.description.length > 5000) {
          jobInfo.description = jobInfo.description.substring(0, 5000) + '...';
        }
        break;
      }
    }
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
  const titleElement = document.querySelector('.BjJfJf');
  if (titleElement) {
    jobInfo.position = titleElement.textContent.trim();
  }

  // Company name
  const companyElement = document.querySelector('.vNEEBe');
  if (companyElement) {
    jobInfo.company = companyElement.textContent.trim();
  }

  // Location
  const locationElement = document.querySelector('.Qk80Jf');
  if (locationElement) {
    jobInfo.location = locationElement.textContent.trim();
  }
  // Salary
  const salaryElements = document.querySelectorAll('.LL4CDc');
  salaryElements.forEach(element => {
    if (element.textContent.includes('$') || 
        element.textContent.toLowerCase().includes('salary') || 
        element.textContent.toLowerCase().includes('per hour')) {
      jobInfo.salary = element.textContent.trim();
    }
  });
  
  // Job description
  const descriptionSelectors = [
    '.HBvzbc',                         // Google Jobs description container
    '.YgLbBe',                         // Another possible description container
    '.WbZuDe',                         // Job details section
    '[data-vi-job-description="true"]' // Data attribute for job description
  ];
  
  for (const selector of descriptionSelectors) {
    const descElement = document.querySelector(selector);
    if (descElement) {
      try {
        jobInfo.description = cleanupDescription(descElement.innerHTML);
      } catch (e) {
        jobInfo.description = descElement.textContent.trim();
      }
      
      if (jobInfo.description) {
        if (jobInfo.description.length > 5000) {
          jobInfo.description = jobInfo.description.substring(0, 5000) + '...';
        }
        break;
      }
    }
  }

  return jobInfo;
}
