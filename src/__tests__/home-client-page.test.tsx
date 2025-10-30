
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import HomeClientPage from '@/app/(app)/home/home-client-page';
import type { HydratedProject, Tag, User } from '@/lib/types';

// Mock the necessary components and hooks
jest.mock('@/components/ai/suggest-steps', () => ({
  SuggestSteps: () => <div data-testid="suggest-steps"></div>,
}));
jest.mock('@/components/project-card', () => ({
    __esModule: true,
    default: ({ project }: { project: HydratedProject }) => (
      <div data-testid="project-card">{project.name}</div>
    ),
}));


const mockUser: User = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTags: Tag[] = [
  { id: '1', name: 'Creative', description: 'Creative projects' },
  { id: '2', name: 'Technical', description: 'Technical projects' },
];

const mockProjects: HydratedProject[] = [
  {
    id: 'p1',
    name: 'Test Project 1',
    description: 'Creative Project 1',
    tags: [{ id: '1', name: 'Creative' }],
    team: [{ userId: '1', user: mockUser, role: 'owner' }],
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    // @ts-ignore
    category: 'Creative',
  },
  {
    id: 'p2',
    name: 'Test Project 2',
    description: 'Technical Project 1',
    tags: [{ id: '2', name: 'Technical' }],
    team: [{ userId: '2', user: { ...mockUser, id: '2' }, role: 'owner' }],
    createdAt: new Date('2024-01-02T00:00:00.000Z'),
    // @ts-ignore
    category: 'Technical',
  },
];

describe('HomeClientPage', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    render(
      <HomeClientPage
        allPublishedProjects={mockProjects}
        currentUser={mockUser}
        allTags={mockTags}
        allProjectPathLinks={[]}
        allLearningPaths={[]}
      />
    );
  });

  it('should render projects and filter them correctly based on tag selection', async () => {
    // 1. Initial state: Both projects should be visible
    expect(screen.getByText('Test Project 1')).toBeInTheDocument(); // Creative
    expect(screen.getByText('Test Project 2')).toBeInTheDocument(); // Technical

    const tagSelector = screen.getByRole('combobox', { name: /Filter by Tags/i });

    // 2. Filter by 'Creative': Only creative projects should be visible
    await user.click(tagSelector);
    const creativeOption = await screen.findByText('Creative');
    await user.click(creativeOption);
    await user.keyboard('{Escape}'); // Close the dialog

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Project 2')).not.toBeInTheDocument();

    // 3. Add 'Technical' to filter: Both projects should be visible again (OR logic)
    await user.click(tagSelector);
    const technicalOption = await screen.findByText('Technical');
    await user.click(technicalOption);
    await user.keyboard('{Escape}'); // Close the dialog

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();

    // 4. De-select 'Creative': Only technical projects should be visible
    await user.click(tagSelector);
    const creativeOptionAgain = await screen.findByText('Creative');
    await user.click(creativeOptionAgain);
    await user.keyboard('{Escape}'); // Close the dialog

    expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();

    // 5. De-select 'Technical': All projects should be visible again
    await user.click(tagSelector);
    const technicalOptionAgain = await screen.findByText('Technical');
    await user.click(technicalOptionAgain);
    await user.keyboard('{Escape}'); // Close the dialog

    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });
});
