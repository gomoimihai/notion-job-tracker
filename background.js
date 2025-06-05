// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addJobToNotion') {
    addJobToNotion(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ 
        success: false, 
        error: error.message || 'Error adding job to Notion' 
      }));
    
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
    const response = await fetch(`https://api.notion.com/v1/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties: {
          // These property names should match your Notion database
          // You may need to adjust these based on your specific Notion database structure
          "Company": {
            "title": [
              {
                "text": {
                  "content": jobData.company
                }
              }
            ]
          },
          "Position": {
            "rich_text": [
              {
                "text": {
                  "content": jobData.position
                }
              }
            ]
          },
          "Location": jobData.location ? {
            "rich_text": [
              {
                "text": {
                  "content": jobData.location
                }
              }
            ]
          } : null,
          "URL": {
            "url": jobData.jobUrl
          },
          "Date Added": {
            "date": {
              "start": formattedDate
            }
          },
          "Status": {
            "select": {
              "name": jobData.status
            }
          },
          "Salary": jobData.salary ? {
            "rich_text": [
              {
                "text": {
                  "content": jobData.salary
                }
              }
            ]
          } : null,          "Description": jobData.description ? {
            "rich_text": [
              {
                "text": {
                  "content": jobData.description
                }
              }
            ]
          } : null,
          "Notes": jobData.notes ? {
            "rich_text": [
              {
                "text": {
                  "content": jobData.notes
                }
              }
            ]
          } : null
        }
      })
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Error adding job to Notion');
    }
    
    return {
      success: true,
      data: responseData
    };
  } catch (error) {
    console.error('Error adding job to Notion:', error);
    throw error;
  }
}
