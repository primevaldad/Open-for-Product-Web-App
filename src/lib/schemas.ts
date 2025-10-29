
import { z } from 'zod';

const MAX_TAG_LENGTH = 35;

// --- Base Schemas ---

export const ProjectTagSchema = z.object({
  id: z.string().min(1, "Tag ID required").max(MAX_TAG_LENGTH),
  display: z.string().min(1, "Display text required").max(MAX_TAG_LENGTH),
  type: z.enum(['category', 'relational', 'custom'], {
    required_error: "Tag type is required.",
    invalid_type_error: "Invalid tag type. Must be one of 'category', 'relational', or 'custom'.",
  }),
});

export const ProjectMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['lead', 'contributor', 'participant']),
});

// Base properties common to both create and edit forms
export const ProjectBaseSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  tagline: z.string().min(1, 'Tagline is required.'),
  description: z.string().min(1, 'Description is required.'),
  photoUrl: z.string().url("Please enter a valid URL.").or(z.literal('')).optional(),
  contributionNeeds: z.string().min(1, 'Contribution needs are required.'),
  tags: z.array(ProjectTagSchema),
  team: z.array(ProjectMemberSchema),
});


// --- Refinement Logic ---

// A single, shared refinement function to be used by both schemas.
const sharedRefinement = (data: any, ctx: z.ZodContext) => {
  // 1. Validate category tag count
  if (data.tags && data.tags.filter((t: any) => t.type === 'category').length > 3) {
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
