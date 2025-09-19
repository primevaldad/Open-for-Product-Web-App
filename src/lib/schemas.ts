
import { z } from 'zod';

const MAX_TAG_LENGTH = 35;

// --- Base Schemas ---

export const ProjectTagSchema = z.object({
    id: z.string().max(MAX_TAG_LENGTH),
    display: z.string().max(MAX_TAG_LENGTH),
    role: z.enum(['category', 'relational']),
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
  contributionNeeds: z.string().min(1, 'Contribution needs are required.'),
  tags: z.array(ProjectTagSchema).optional().default([]),
  team: z.array(ProjectMemberSchema).optional().default([]),
});


// --- Refinement Logic ---

// Reusable refinement to check for the number of category tags
const tagValidationRefinement = (data: { tags: z.infer<typeof ProjectTagSchema>[] }) => {
    return data.tags.filter(t => t.role === 'category').length <= 3;
};


// --- Final Schemas ---

// Schema for creating a new project, used in the create form and action
export const CreateProjectSchema = ProjectBaseSchema.refine(tagValidationRefinement, {
    message: "A project can have a maximum of 3 category tags.",
    path: ["tags"],
});

// Schema for editing an existing project, used in the edit form and action
export const EditProjectSchema = ProjectBaseSchema.extend({
  id: z.string(),
  timeline: z.string().min(1, "Timeline is required."),
  // Governance is optional on the Project type, so it must be optional here too.
  governance: z.object({
    contributorsShare: z.number(),
    communityShare: z.number(),
    sustainabilityShare: z.number(),
  }).optional(),
})
.refine(tagValidationRefinement, {
    message: "A project can have a maximum of 3 category tags.",
    path: ["tags"],
})
.refine(data => {
    // If governance is not defined, this validation does not apply
    if (!data.governance) return true;
    // If it is defined, the shares must sum to 100
    const { contributorsShare, communityShare, sustainabilityShare } = data.governance;
    return contributorsShare + communityShare + sustainabilityShare === 100;
}, {
    message: "The sum of all governance shares must be exactly 100%.",
    path: ["governance"], // This will display the error next to the governance section
});


// --- Inferred Types ---

export type CreateProjectFormValues = z.infer<typeof CreateProjectSchema>;
export type EditProjectFormValues = z.infer<typeof EditProjectSchema>;
