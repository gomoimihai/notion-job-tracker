# Notion Job Tracker Chrome Extension

A Chrome extension that helps you save job listings to a Notion job tracker database.

## Features

- Extract job information automatically from popular job listing sites:
  - LinkedIn
  - Indeed
  - Glassdoor
  - Google Jobs
- Save job details directly to your Notion job tracker database
- Track application status and add notes
- Simple and intuitive user interface

## Setup Instructions

### 1. Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name your integration (e.g., "Job Tracker Chrome Extension")
4. Select the workspace where your job tracker database is located
5. Grant the required capabilities (read & write content)
6. Click "Submit" to create your integration
7. Copy your "Internal Integration Token" (you'll need this later)

### 2. Create a Job Tracker Database in Notion

Create a database in Notion with the following properties:
- Company (Title)
- Position (Text)
- Location (Text)
- URL (URL)
- Date Added (Date)
- Status (Select) with options like:
  - Interested
  - Applied
  - Interview
  - Offer
  - Rejected
  - Not Interested
- Salary (Text)
- Description (Text) - For storing the full job description
- Notes (Text)

### 3. Share Your Database with the Integration

1. Open your job tracker database in Notion
2. Click "Share" in the top right corner
3. In the "Add people, emails, groups, or integrations" field, search for and select your integration
4. Click "Invite"

### 4. Find Your Database ID

1. Open your job tracker database in Notion
2. Look at the URL. It should look something like: `https://www.notion.so/workspace/83c75a51f3b3429983c75a51f3b342d8?v=...`
3. The database ID is the part after the workspace name and before the `?v=...` parameter
4. In this example, the database ID would be `83c75a51f3b3429983c75a51f3b342d8`

### 5. Install and Configure the Chrome Extension

1. Download the extension files or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. Click on the extension icon in your browser toolbar
6. Go to the settings page and enter your Notion API token and database ID
7. Save your settings

## How to Use

1. Navigate to a job listing page on a supported site
2. Click the extension icon in your browser toolbar
3. The form will be auto-filled with job details extracted from the page:
   - For LinkedIn, the extension can extract from various page layouts and formats
   - Automatically pulls company name, position title, location, salary, and full job description
   - Extracts job descriptions using specific selectors like `jobs-description__container` for LinkedIn
   - Extracts salary information from job descriptions when not explicitly listed
4. Review and edit the information as needed
5. Select the appropriate status for the job
6. Add any notes about the position
7. Click "Save to Notion" to add the job to your database

## Privacy

Your Notion API token and database ID are stored locally in your browser using Chrome's storage system and are never sent to any third-party servers. All communication happens directly between your browser and Notion's API.

## Development

### Project Structure

```
notion-job-tracker/
├── manifest.json          # Chrome extension manifest file
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── styles.css             # CSS styles for popup
├── background.js          # Background script for API communication
├── content.js             # Content script for extracting job data
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Adding Support for Additional Job Sites

To add support for additional job sites, edit the `content.js` file and add a new extraction function following the existing patterns.

## License

This project is licensed under the MIT License.
