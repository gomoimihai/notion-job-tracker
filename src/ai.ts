import { LMStudioClient } from "@lmstudio/sdk";
import { z } from "zod";
import { JobAnalysisInput, JobAnalysisOutput } from "./types";

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

export async function analyzeJobDescription(
	jobData: JobAnalysisInput,
): Promise<JobAnalysisOutput> {
	const client = new LMStudioClient();
	const model = await client.llm.model("deepseek-r1-distill-llama-8b");
	const modelResult = await model.respond(jobData.description, {
		structured: jobSchema,
		maxTokens: 5000,
	});

	return modelResult.parsed;
}
