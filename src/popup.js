// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const jobForm = document.getElementById('job-form');
  const setupContainer = document.getElementById('setup-container');
  const jobFormContainer = document.getElementById('job-form-container');
  const settingsButton = document.getElementById('settings-button');
  const saveSettingsButton = document.getElementById('save-settings');
  const helpLink = document.getElementById('help-link');
  const statusMessage = document.getElementById('status-message');
  // Get the default location from storage or set to "Remote" if not found
  chrome.storage.sync.get(['defaultLocation'], (result) => {
    document.getElementById('location').value = result.defaultLocation || "Remote";
  });

  // Check if Notion API token and database ID are set
  chrome.storage.sync.get(['notionToken', 'databaseId'], (result) => {
    if (!result.notionToken || !result.databaseId) {
      // Show setup screen if settings are not configured
      setupContainer.classList.remove('hidden');
      jobFormContainer.classList.add('hidden');
    } else {
      // Settings are configured, show job form
      setupContainer.classList.add('hidden');
      jobFormContainer.classList.remove('hidden');
      
      // Get current tab URL and prefill the form
      getCurrentTabInfo();
    }
  });
  // Settings button click handler
  settingsButton.addEventListener('click', () => {
    chrome.storage.sync.get(['notionToken', 'databaseId', 'defaultLocation'], (result) => {
      document.getElementById('notion-token').value = result.notionToken || '';
      document.getElementById('database-id').value = result.databaseId || '';
      document.getElementById('default-location').value = result.defaultLocation || 'Remote';
    });
    
    setupContainer.classList.remove('hidden');
    jobFormContainer.classList.add('hidden');
  });
  // Save settings button click handler
  saveSettingsButton.addEventListener('click', () => {
    const notionToken = document.getElementById('notion-token').value.trim();
    const databaseId = document.getElementById('database-id').value.trim();
    const defaultLocation = document.getElementById('default-location').value.trim() || 'Remote';
    
    if (!notionToken || !databaseId) {
      showStatusMessage('Please provide both Notion token and database ID', 'error');
      return;
    }
    
    // Save settings to Chrome storage
    chrome.storage.sync.set({ 
      notionToken: notionToken,
      databaseId: databaseId,
      defaultLocation: defaultLocation
    }, () => {
      setupContainer.classList.add('hidden');
      jobFormContainer.classList.remove('hidden');
      showStatusMessage('Settings saved successfully', 'success');
      
      // Update the location field with the new default
      document.getElementById('location').value = defaultLocation;
      
      // Refresh form with current tab info
      getCurrentTabInfo();
    });
  });

  // Help link click handler
  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Open help page in new tab
    chrome.tabs.create({
      url: 'https://developers.notion.com/docs/create-a-notion-integration'
    });
  });
  // Job form submit handler
  jobForm.addEventListener('submit', (event) => {
    event.preventDefault();
    // Get form values
    const company = document.getElementById('company').value.trim();
    const position = document.getElementById('position').value.trim();
    const location = document.getElementById('location').value.trim();
    const salary = document.getElementById('salary').value.trim();
    const jobUrl = document.getElementById('job-url').value.trim();
    const status = document.getElementById('status').value;
    const description = document.getElementById('description').value.trim();
    const notes = document.getElementById('notes').value.trim();
    
    if (!company || !position || !jobUrl) {
      showStatusMessage('Please fill in all required fields', 'error');
      return;
    }
    
    // Check if this is a forced submission (after duplicate warning)
    const forceSubmit = jobForm.dataset.forceSubmit === 'true';
    if (forceSubmit) {
      delete jobForm.dataset.forceSubmit;
    }
    
    // Disable form while submitting
    toggleFormState(false);
    showStatusMessage('Saving to Notion...', '');
    
    // Get Notion API token and database ID
    chrome.storage.sync.get(['notionToken', 'databaseId'], (result) => {
      // Send message to background script to add job to Notion
      chrome.runtime.sendMessage({
        action: 'addJobToNotion',
        data: {
          notionToken: result.notionToken,
          databaseId: result.databaseId,
          forceSubmit: forceSubmit,
          jobData: {
            company: company,
            position: position,
            location: location,
            salary: salary,
            jobUrl: jobUrl,
            status: status,
            description: description,
            notes: notes
          }
        }
      }, (response) => {
        toggleFormState(true);
        
        // Handle potential duplicate job URL
        if (response && !response.success && response.requireConfirmation) {
          const confirmMsg = `This job URL was recently submitted. Submit anyway?`;
          showStatusMessage(confirmMsg, 'warning');
          
          // Add confirm and cancel buttons to the status message
          const confirmBtn = document.createElement('button');
          confirmBtn.textContent = 'Submit Anyway';
          confirmBtn.className = 'confirm-btn';
          confirmBtn.addEventListener('click', () => {
            // Set the force submit flag and resubmit the form
            jobForm.dataset.forceSubmit = 'true';
            jobForm.dispatchEvent(new Event('submit'));
          });
          
          const cancelBtn = document.createElement('button');
          cancelBtn.textContent = 'Cancel';
          cancelBtn.className = 'cancel-btn';
          cancelBtn.addEventListener('click', () => {
            showStatusMessage('Submission cancelled', '');
          });
          
          const btnContainer = document.createElement('div');
          btnContainer.className = 'btn-container';
          btnContainer.appendChild(confirmBtn);
          btnContainer.appendChild(cancelBtn);
          statusMessage.appendChild(btnContainer);
          
          return;
        }
        
        if (response && response.success) {
          showStatusMessage('Job saved to Notion successfully!', 'success');
          // Clear form after successful submission
          jobForm.reset();
        } else {
          const errorMessage = response && response.error ? response.error : 'Failed to save job to Notion';
          showStatusMessage(`Error: ${errorMessage}`, 'error');
        }
      });
    });
  });

  // Function to get the current tab info and prefill the form
  function getCurrentTabInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const currentTab = tabs[0];
        const url = currentTab.url;
        
        // Prefill job URL
        document.getElementById('job-url').value = url;
        
        // Check if tab URL is a job site
        const isJobSite = url.includes('linkedin.com/jobs') || 
                          url.includes('indeed.com') || 
                          url.includes('glassdoor.com') ||
                          (url.includes('google.com/search') && url.includes('jobs'));
        
        if (isJobSite) {          // Try to extract job info from the page
          chrome.tabs.sendMessage(currentTab.id, { action: 'extractJobInfo' }, (response) => {
            if (response && !chrome.runtime.lastError) {
              // Get current default location value
              const currentLocation = document.getElementById('location').value;
              
              // Prefill form with extracted data
              document.getElementById('company').value = response.company || '';
              document.getElementById('position').value = response.position || '';
              
              // Only update location if one was found and it's not empty
              // This preserves the default "Remote" value or user's preference
              if (response.location && response.location.trim() !== '') {
                document.getElementById('location').value = response.location;
              } else if (currentLocation.trim() === '') {
                // If current location is empty, get the default from storage
                chrome.storage.sync.get(['defaultLocation'], (result) => {
                  document.getElementById('location').value = result.defaultLocation || 'Remote';
                });
              }
              
              document.getElementById('salary').value = response.salary || '';
              document.getElementById('description').value = response.description || '';
            }
          });
        }
      }
    });
  }

  // Helper function to show status messages
  function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = '';
    if (type) {
      statusMessage.classList.add(type);
    }
    
    // Auto-clear success messages after a few seconds
    if (type === 'success') {
      setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = '';
      }, 3000);
    }
  }

  // Helper function to toggle form state (enable/disable inputs)
  function toggleFormState(enabled) {
    const formElements = jobForm.elements;
    for (let i = 0; i < formElements.length; i++) {
      formElements[i].disabled = !enabled;
    }
  }
});
