import { config } from 'dotenv';
config();

import '@/ai/flows/highlight-project-blockers.ts';
import '@/ai/flows/suggest-next-steps.ts';
import '@/ai/flows/summarize-project-progress.ts';