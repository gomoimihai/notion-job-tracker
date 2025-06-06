# Notion Job Tracker Chrome Extension

A Chrome extension that helps you save job listings to a Notion job tracker database with AI-powered analysis.

## Features

- Extract job information automatically from popular job listing sites:
  - LinkedIn
  - Indeed
  - Glassdoor
  - Google Jobs
- AI-powered job analysis that provides:
  - Job title refinement
  - Salary information extraction
  - Technical stack identification
  - Key points summarization
  - Location details
- Beautiful UI for displaying AI analysis notes
- Save job details directly to your Notion job tracker database
- Track application status and add notes
- Convenient sidebar interface for easy access while browsing

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
- Notes (Text) - For storing your personal notes and AI analysis

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
4. Click "Load unpacked" and select the `dist` folder containing the extension files
5. Navigate to a job listing page and click the extension icon to open the sidebar
6. Go to the settings by clicking the settings button
7. Enter your Notion API token and database ID
8. Enable or disable the AI enhancement feature according to your preference
9. Save your settings

## How to Use

1. Navigate to a job listing page on a supported site (currently LinkedIn)
2. The sidebar will automatically appear on the right side of the page
   - You can collapse it by clicking the toggle button
3. The form will be auto-filled with job details extracted from the page
4. If AI enhancement is enabled, the extension will:
   - Analyze the job description
   - Extract key information like technical requirements
   - Provide a summary of important points
   - Display AI analysis in a clean, formatted UI below the notes field
5. Review and edit the information as needed
6. Select the appropriate status for the job
7. Add any personal notes about the position
8. Click "Save to Notion" to add the job to your database

### AI Analysis Features

The AI enhancement (powered by LM Studio) provides:

- Technical stack identification: Lists programming languages and technologies required
- Key points summarization: Extracts the most important aspects of the job
- Salary information: Attempts to extract or estimate salary information even when not explicitly listed
- Location details: Identifies remote, hybrid, or on-site information
- Position title refinement: Suggests more accurate or standardized job titles

## Privacy

Your Notion API token and database ID are stored locally in your browser using Chrome's storage system and are never sent to any third-party servers. All communication happens directly between your browser and Notion's API.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```

### Building the Extension

Development build with watch mode (automatically rebuilds on changes):
```
npm run dev
```

Production build:
```
npm run prod
```

### Loading the Extension in Chrome

1. Build the extension using one of the commands above
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select the `dist` folder from this project
5. The extension should now be installed and visible in your Chrome toolbar

Alternatively, use the VS Code task:
```
npm run build
```
Then run the "Open Chrome with Extension" task in VS Code.

### Project Structure

```
notion-job-tracker/
├── src/                   # Source files
│   ├── background.ts      # Background script for API communication
│   ├── sidebar.ts         # Sidebar UI functionality
│   ├── sidebarInjector.ts # Script to inject the sidebar into pages
│   ├── ai.ts              # AI analysis functionality
│   ├── utils.ts           # Utility functions
│   ├── constants.ts       # Constants and configuration
│   └── types/             # TypeScript type definitions
├── public/                # Static files
│   ├── manifest.json      # Chrome extension manifest file
│   ├── sidebar.html       # Sidebar interface
│   ├── sidebar.css        # CSS styles for sidebar
│   └── icons/             # Extension icons
├── dist/                  # Build output (generated by webpack)
├── config/                # Build configuration
│   ├── webpack.common.js  # Common webpack configuration
│   ├── webpack.config.js  # Main webpack configuration
│   └── paths.js          # Path configurations
├── tsconfig.json          # TypeScript configuration
└── package.json           # npm package configuration
```

### AI Integration

The extension uses the LM Studio SDK to connect to a local AI model for job description analysis. The AI integration:

1. Parses job descriptions using structured extraction
2. Returns analysis in a standardized JSON format
3. Displays results in a user-friendly format in the sidebar

To modify the AI analysis:
- Edit the schema in `src/ai.ts` to extract different or additional information
- Modify the `displayAINotes` function in `sidebar.ts` to change how AI notes are displayed

## Troubleshooting

### Notion API Issues

If you encounter errors when saving jobs to Notion, here are some common issues and solutions:

#### Error: "body.properties.Company.id should be defined"

This error occurs when the Notion API format has changed or your database structure doesn't match the expected format. The extension now automatically adapts to your database structure by:

1. Fetching your database schema before submitting job data
2. Matching property names case-insensitively
3. Using the correct property types based on your database structure

Make sure that:
- Your database has a "Company" property that's set as the Title property
- Your Notion integration has permission to access the database
- You've entered the correct Database ID and API token in the extension settings

#### Error: "Title property does not have the correct configuration"

Every Notion database must have exactly one "title" property. Make sure your database has a property (usually "Company") set as the Title property type in Notion.

#### Error: "Property values do not match schema"

This happens when the data sent doesn't match the property types in your database. Check that:
- Your database has all the fields listed in the Setup Instructions
- The property types match (Rich Text, Date, Select, URL, etc.)

#### Error: "Content exceeds maximum length" 

Notion has a limit of 2000 characters for rich text properties. If job descriptions are too long, the extension will automatically truncate them.

### AI Feature Issues

#### AI Analysis Not Working

If the AI analysis feature is not working:

1. Make sure the "Enhance with AI" option is enabled in the settings
2. Check that you have LM Studio running locally on port 41343
3. Ensure you're using a compatible model (the extension uses deepseek-r1-distill-llama-8b by default)
4. Check the browser console for any error messages related to AI connectivity

#### AI Analysis Not Accurate

The AI analysis quality depends on:
- The model being used
- The quality and completeness of the job description
- The structure of the job posting

You can always edit the notes field manually before saving to Notion.

## License

This project is licensed under the MIT License.

## Upcoming Features

Based on our roadmap, we plan to implement:

- Dedicated configuration page with customizable defaults and templates
- Support for additional job sites beyond LinkedIn
- Batch processing to save multiple jobs from search results
- Enhanced job application tracking with reminders and follow-up dates
- Resume matching to highlight your matching skills and qualifications
- Dark mode and keyboard shortcuts
- Support for custom Notion database schemas

Feel free to contribute to the project by implementing any of these features or suggesting new ones!
