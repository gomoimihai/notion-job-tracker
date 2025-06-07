import { LMStudioClient } from "@lmstudio/sdk";
import { z } from "zod";
import {
	JobAnalysisInput,
	JobAnalysisOutput,
	CoverLetterInput,
	CoverLetterOutput,
} from "./types";

// A zod schema for job information
const jobSchema = z.object({
	title: z.string(),
	salary: z.string(),
	technicalStack: z.string(),
	summary: z.array(z.string()),
	location: z.string(),
});

// Export the inferred type from the jobSchema
export type JobAnalysis = z.infer<typeof jobSchema>;

const systemPromptJobSummary = `
You are a helpful and concise assistant designed to extract key information from job descriptions.

Your task is to:
Summarize the role in clear and concise language, focusing on the most relevant responsibilities and requirements.
Identify and list the following if present:
Location (e.g., remote, hybrid, onsite, including any specific country or city mentioned)
Salary details (if explicitly stated — do not speculate or generate estimates)
Technical stack or required technologies (e.g., programming languages, frameworks, tools)

Important rules:
If salary is not mentioned, do not infer or invent any value.
Do not include irrelevant details or marketing fluff.
Focus only on facts useful to a job seeker evaluating the opportunity.
Your output should be structured and easy to scan.

The job description is:
`;

export async function analyzeJobDescription(
	jobData: JobAnalysisInput,
): Promise<JobAnalysisOutput> {
	const client = new LMStudioClient();
	const model = await client.llm.model("deepseek-r1-distill-llama-8b");
	const modelResult = await model.respond(
		`${systemPromptJobSummary} ${jobData.description}`,
		{
			structured: jobSchema,
			maxTokens: 10000,
		},
	);

	return modelResult.parsed;
}

const systemPromptCoverLetter = `
You are a professional cover letter writer. Your task is to create a compelling cover letter based on the provided job description.
The job descriptions is:
`;

export async function createCoverLetter(
	jobData: JobAnalysisInput,
): Promise<JobAnalysisOutput> {
	const client = new LMStudioClient();
	const model = await client.llm.model("deepseek-r1-distill-llama-8b");
	const modelResult = await model.respond(
		`${systemPromptJobSummary} ${jobData.description}`,
		{
			structured: jobSchema,
			maxTokens: 10000,
		},
	);

	return modelResult.parsed;
}

/**
 * Schema for cover letter generation
 */
const coverLetterSchema = z.object({
	coverLetter: z.string(),
});

/**
 * Generate a cover letter based on job information
 */
export async function generateCoverLetter(
	input: CoverLetterInput,
): Promise<CoverLetterOutput> {
	const client = new LMStudioClient();
	const model = await client.llm.model("deepseek-r1-distill-llama-8b");

	// Create a prompt for the cover letter
	const prompt = `
	Summary of Mihai Bogdan Gomoi’s Experience (for Cover Letter Generation)
	Full Name: Mihai Bogdan Gomoi
	Location: Timisoara, Romania
	Experience: 14+ years as a Full-Stack JavaScript Developer, specializing in building and scaling web applications, software architecture (both monolith and serverless), and designing/implementing CI/CD pipelines
	Technical Skills:
	Frontend: Next.js (v15+), React (v19), TypeScript, Tailwind CSS, Radix UI, AI SDK, AngularJS, jQuery, Vanilla JS, HTML, CSS
	Backend: Node.js, Nest.js, Express.js (TypeScript), API Gateway, AWS Lambda, Model Context Protocol (MCP) Server, PostgreSQL, Drizzle ORM, DocumentDB (NoSQL)
	DevOps & Infrastructure: AWS Cloud, Cloudflare, Docker, Docker Compose, GitHub Actions, SST, Serverless, Terraform, CDK, Fargate, EC2, SQS, Redis
	AI/ML: Built AI-powered agent systems (integrating providers like OpenAI, Anthropic, xAI, Ollama, LMStudio), LLM-based workflows, and custom AI integrations using Vercel AI SDK
	Other: Strong focus on scalable systems, API design, microservices, authentication, and system security.
	Relevant Experience:
	AI Agent Systems: Led full-cycle development of an AI agent platform for computer automation with modular, extensible architecture. Managed both web and backend (Next.js, React, TypeScript, PostgreSQL, containerized environments) and handled multi-provider AI integration and orchestration
	FinTech & Crypto: Led teams and projects delivering scalable solutions, including crypto wallets and exchanges. Deep hands-on with Node.js/React stacks, API integrations (exchanges, banks), and regulated environments
	Team Leadership: Managed, mentored, and scaled high-performing engineering teams, often serving as Engineering Manager or Tech Lead, collaborating closely with cross-functional stakeholders and C-level leadership to define product and tech roadmaps
	Async & Remote Work: Significant experience leading distributed, async teams, shipping independently, and maintaining high standards in fast-paced, startup-like environments.
	Core Competencies:
	Software and solution architecture, cloud infrastructure, project management, team leadership, API and microservices design, DevOps, and technical mentorship
	Please write a professional cover letter for a job application with the following details:

	Company: ${input.company}
	Position: ${input.position}
	${input.location ? `Location: ${input.location}` : ""}
	${input.skills ? `Skills: ${input.skills}` : ""}

	Job Description:
	${input.jobDescription}

	Please create a compelling, well-structured, and professional cover letter that:
	1. Follows standard cover letter format
	2. Addresses the company by name
	3. Expresses enthusiasm for the role
	4. Highlights relevant skills and experience that match the job description
	5. Includes a strong opening and closing
	6. Is personalized for this specific role and company
	7. Is around 100-200 words, not longer
	8. Make sure to avoid generic phrases and instead focus on the specific job and company
	9. Use a professional tone and language appropriate for a job application
	10. You always start with Dear Hiring Team, and end with Sincerely, Mihai Gomoi
	11. Instead of [Company Name], use the actual company name provided in the input
	`;

	const modelResult = await model.respond(prompt, {
		structured: coverLetterSchema,
		maxTokens: 10000,
	});

	return modelResult.parsed;
}
