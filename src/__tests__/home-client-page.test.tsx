
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HomeClientPage from '@/app/home-client-page';
import { User, Project } from '@/lib/types';

// Mock server-side modules
jest.mock('@/lib/data.server.ts', () => ({}));

// Mock child components to isolate the component under test
jest.mock('@/components/project-card', () => {
  return function DummyProjectCard({ project }: { project: Project }) {
    return <div data-testid="project-card">{project.name}</div>;
  };
});

const mockUser: User = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  avatarUrl: 'https://example.com/avatar.png',
  onboarded: true,
};

const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Test Project 1',
    tagline: 'Tagline 1',
    description: 'Description 1',
    category: 'Creative & Media',
    status: 'published',
    team: [],
    timeline: 'test',
    contributionNeeds: [],
    progress: 0,
    votes: 0,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  },
  {
    id: '2',
    name: 'Test Project 2',
    tagline: 'Tagline 2',
    description: 'Description 2',
    category: 'Technical & Engineering',
    status: 'published',
    team: [],
    timeline: 'test',
    contributionNeeds: [],
    progress: 0,
    votes: 0,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  },
];

describe('HomeClientPage', () => {
  it('should render projects and filter them correctly based on category selection', async () => {
    const user = userEvent.setup();
    render(<HomeClientPage allPublishedProjects={mockProjects} currentUser={mockUser} />);

    // 1. Initial Render: All projects should be visible
    expect(screen.getByText('All Projects')).toBeInTheDocument();
    expect(screen.getAllByTestId('project-card')).toHaveLength(2);
    expect(screen.getByText('Test Project 1')).toBeInTheDocument(); // Creative & Media
    expect(screen.getByText('Test Project 2')).toBeInTheDocument(); // Technical & Engineering

    // 2. Filter by 'Creative & Media': Only creative projects should be visible
    const creativeButton = screen.getByRole('button', { name: /creative/i });
    await user.click(creativeButton);

    expect(screen.getAllByTestId('project-card')).toHaveLength(1);
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Project 2')).not.toBeInTheDocument();

    // 3. Filter by 'Technical & Engineering' as well: Both creative and technical projects should be visible
    const technicalButton = screen.getByRole('button', { name: /technical/i });
    await user.click(technicalButton);

    expect(screen.getAllByTestId('project-card')).toHaveLength(2);
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();

    // 4. De-select 'Creative & Media': Only technical projects should be visible
    await user.click(creativeButton);

    expect(screen.getAllByTestId('project-card')).toHaveLength(1);
    expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();

    // 5. De-select 'Technical & Engineering': All projects should be visible again
    await user.click(technicalButton);
    
    expect(screen.getAllByTestId('project-card')).toHaveLength(2);
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
  });
});
