import { LMStudioClient } from "@lmstudio/sdk";
import { z } from "zod";

// A zod schema for a book
const jobSchema = z.object({
	title: z.string(),
	salary: z.string(),
});

const client = new LMStudioClient();
const model = await client.llm.model("deepseek-r1-distill-llama-8b");
const modelResult = await model.respond(jobData.description, {
	structured: jobSchema,
	maxTokens: 5000,
});

console.info(modelResult.parsed);
