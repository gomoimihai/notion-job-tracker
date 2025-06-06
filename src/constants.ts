/**
 * Application constants
 */

import { LinkedInSelectorsMap } from "./types";

export const UI = {
	SIDEBAR: {
		WIDTH: "380px",
		TOGGLE_BUTTON_WIDTH: "30px",
		TOGGLE_BUTTON_HEIGHT: "60px",
		STORAGE_KEY: "notion-job-tracker-sidebar-open",
		URL_CHANGE_DETECTION_DELAY: 1000,
	},
};

export const STORAGE = {
	MAX_RECENT_JOBS: 50,
};

export const ANIMATIONS = {
	SUCCESS_MESSAGE_DURATION: 3000,
	WARNING_MESSAGE_DURATION: 5000,
};

/**
 * LinkedIn selectors for different job page elements
 */
export const LinkedInSelectors: LinkedInSelectorsMap = {
	title: [
		".job-details-jobs-unified-top-card__job-title", // New job page layout
		"h1.top-card-layout__title", // Another possible layout
		"h1.job-title", // Another possible layout
		"h2.t-24.t-bold.jobs-unified-top-card__job-title", // Additional selector for modern LinkedIn
		".jobs-unified-top-card__job-title", // Generic class
	],
	company: [
		".topcard__org-name-link", // Standard company link
		".job-details-jobs-unified-top-card__company-name", // New layout company name
		'a[data-tracking-control-name="public_jobs_topcard-org-name"]', // Tracking attribute
		".jobs-unified-top-card__company-name", // Another variation
		'a[data-tracking-control-name="public_jobs_topcard_company_name"]', // Another tracking attribute
		"a[data-test-job-company-name]", // Data attribute selector
		".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__company-name", // Nested selector
	],
	location: [
		".job-details-jobs-unified-top-card__bullet", // New job page layout
		".job-details-jobs-unified-top-card__workplace-type", // New job page layout for remote
		".topcard__flavor--bullet", // Older job page layout
		".job-details-jobs-unified-top-card__company-name + span", // Sibling of company name
		"span.location", // Standard location span
		".jobs-unified-top-card__bullet", // Generic bullet class
		".jobs-unified-top-card__workplace-type", // Workplace type
		".jobs-unified-top-card__subtitle-primary-grouping .jobs-unified-top-card__bullet", // Nested structure
	],
	salary: [
		".compensation__salary", // Standard salary
		".job-details-jobs-unified-top-card__job-insight > .job-details-jobs-unified-top-card__job-insight-view-model-secondary", // New layout salary
		".jobs-unified-top-card__job-insight:contains('$')", // Modern LinkedIn salary
		".jobs-unified-top-card__job-insight-container .jobs-unified-top-card__job-insight:contains('$')", // Nested structure
	],
	description: [
		".job-details-jobs-unified-top-card__description-container", // New job page description container
		".show-more-less-html__markup", // Another description container
		"#job-details", // Job details section
		".description__text", // Older description text layout
		".jobs-description", // Modern description container
		".jobs-description-content", // Content within description
		".jobs-box__html-content", // HTML content box
	],
};
