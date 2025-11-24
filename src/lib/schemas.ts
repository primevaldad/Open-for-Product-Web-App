
import { z } from 'zod';

const MAX_TAG_LENGTH = 35;

// --- Base Schemas ---

export const ProjectTagSchema = z.object({
  id: z.string().min(1, "Tag ID required").max(MAX_TAG_LENGTH),
  display: z.string().min(1, "Display text required").max(MAX_TAG_LENGTH),
  isCategory: z.boolean(),
}).passthrough();

export const ProjectMemberSchema = z.object({
	userId: z.string(),
	// projectId: z.string(), // projectId is not part of the form data for a member
	role: z.enum(['lead', 'contributor', 'participant']),
	pendingRole: z.enum(['lead', 'contributor', 'participant']).optional(),
	createdAt: z.date().optional(),
	updatedAt: z.date().optional()
}).passthrough();


// Base properties common to both create and edit forms
export const ProjectBaseSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  tagline: z.string().min(1, 'Tagline is required.'),
  description: z.string().min(1, 'Description is required.'),
  project_type: z.enum(['public', 'private', 'personal']).default('public'),
  photoUrl: z.string().url("Please enter a valid URL.").or(z.literal('')).optional(),
  contributionNeeds: z.string().min(1, 'Contribution needs are required.'),
  tags: z.array(ProjectTagSchema),
  team: z.array(ProjectMemberSchema),
});

// --- Task Schema ---
export const TaskStatusSchema = z.enum(['To Do', 'In Progress', 'Done', 'Archived']);

export const TaskSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, 'Title is required.'),
    description: z.string().optional(),
    status: TaskStatusSchema,
    assigneeId: z.string().optional(),
    estimatedHours: z.number().optional(),
    dueDate: z.date().optional(),
    isMilestone: z.boolean().optional(),
});


// --- Refinement Logic ---

// A single, shared refinement function to be used by both schemas.
const sharedRefinement = (data: any, ctx: z.RefinementCtx) => {
  // 1. Validate category tag count
  if (data.tags && data.tags.filter((t: any) => t.isCategory).length > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A project can have a maximum of 3 category tags.",
      path: ["tags"],
    });
  }

  // 2. Validate governance total (only if governance exists on the schema)
  if (data.governance) {
    const { contributorsShare, communityShare, sustainabilityShare } = data.governance;
    if (contributorsShare + communityShare + sustainabilityShare !== 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The sum of all governance shares must be exactly 100%.",
        path: ["governance"],
      });
    }
  }
};


// --- Final Schemas ---

// Schema for creating a new project, using the base and refinement.
export const CreateProjectSchema = ProjectBaseSchema.superRefine(sharedRefinement);

// Schema for editing an existing project, extending the base and using the same refinement.
export const EditProjectSchema = ProjectBaseSchema.extend({
  id: z.string(),
  governance: z.object({
    contributorsShare: z.number(),
    communityShare: z.number(),
    sustainabilityShare: z.number(),
  }).optional(),
}).superRefine(sharedRefinement);


// --- Inferred Types ---

export type CreateProjectFormValues = z.infer<typeof CreateProjectSchema>;
export type EditProjectFormValues = z.infer<typeof EditProjectSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskFormValues = z.infer<typeof TaskSchema>;
