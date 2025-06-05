import { LMStudioClient } from "@lmstudio/sdk";
import { z } from "zod";

// Define the job data interface
interface JobData {
	description: string;
}

// A zod schema for job information
const jobSchema = z.object({
	title: z.string(),
	salary: z.string(),
});

export async function analyzeJobDescription(jobData: JobData) {
	const client = new LMStudioClient();
	const model = await client.llm.model("deepseek-r1-distill-llama-8b");
	const modelResult = await model.respond(jobData.description, {
		structured: jobSchema,
		maxTokens: 5000,
	});

	return modelResult.parsed;
}
