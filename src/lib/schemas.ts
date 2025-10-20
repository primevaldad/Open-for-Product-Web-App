
import { z } from 'zod';

const MAX_TAG_LENGTH = 35;

// --- Base Schemas ---

export const ProjectTagSchema = z.object({
    id: z.string().max(MAX_TAG_LENGTH),
    display: z.string().max(MAX_TAG_LENGTH),
    type: z.enum(['category', 'relational', 'custom']),
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

// Reusable refinement for the create schema.
const tagValidationRefinement = (data: { tags: z.infer<typeof ProjectTagSchema>[] }) => {
    return data.tags.filter(t => t.type === 'category').length <= 3;
};


// --- Final Schemas ---

// Schema for creating a new project, used in the create form and action
export const CreateProjectSchema = ProjectBaseSchema.refine(tagValidationRefinement, {
    message: "A project can have a maximum of 3 category tags.",
    path: ["tags"],
});

// Schema for editing an existing project, using superRefine for more robust validation
export const EditProjectSchema = ProjectBaseSchema.omit({ team: true }).extend({
  id: z.string(),
  governance: z.object({
    contributorsShare: z.number(),
    communityShare: z.number(),
    sustainabilityShare: z.number(),
  }).optional(),
}).superRefine((data, ctx) => {
  // 1. Validate category tag count
  if (data.tags.filter(t => t.type === 'category').length > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A project can have a maximum of 3 category tags.",
      path: ["tags"],
    });
  }

  // 2. Validate governance total
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
});


// --- Inferred Types ---

export type CreateProjectFormValues = z.infer<typeof CreateProjectSchema>;
export type EditProjectFormValues = z.infer<typeof EditProjectSchema>;
