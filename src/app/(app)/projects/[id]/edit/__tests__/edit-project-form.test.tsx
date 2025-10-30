
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditProjectForm from '../edit-project-form';
import type { Project } from '@/lib/types';

jest.mock('@/lib/firebase');
jest.mock('@firebase/storage');
jest.mock('@/app/actions/projects');

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Mock the MDEditor component that is dynamically imported
jest.mock('next/dynamic', () => () => {
  const MockMDEditor = () => <textarea data-testid="mock-md-editor" />;
  return MockMDEditor;
});

// Mock the useToast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

describe('EditProjectForm', () => {
  const mockProject: Project = {
    id: 'p1',
    name: 'Test Project',
    tagline: 'A test tagline',
    description: '# Test Description\nThis is a test description with markdown.',
    category: 'Technical & Engineering',
    timeline: '3 months',
    contributionNeeds: ['React', 'Node.js'],
    progress: 50,
    team: [],
    votes: 10,
    discussions: [],
    status: 'published',
    governance: {
      contributorsShare: 70,
      communityShare: 20,
      sustainabilityShare: 10,
    },
    startDate: '2024-01-01',
    endDate: '2024-03-31',
  };

  const mockUpdateProject = jest.fn();

  it('renders the form with project data without crashing', () => {
    render(<EditProjectForm project={mockProject} updateProject={mockUpdateProject} />);

    // Check if the main form title is rendered
    expect(screen.getByText('Project Details')).toBeInTheDocument();

    // Check if some form fields are populated with project data
    expect(screen.getByLabelText('Project Name')).toHaveValue(mockProject.name);
    expect(screen.getByLabelText('Tagline')).toHaveValue(mockProject.tagline);
    
    // Check that our mocked MDEditor is rendered
    expect(screen.getByTestId('mock-md-editor')).toBeInTheDocument();

    // Check that a governance slider label is rendered correctly
    expect(screen.getByText(`Contributors Share: ${mockProject.governance.contributorsShare}%`)).toBeInTheDocument();
  });
});
