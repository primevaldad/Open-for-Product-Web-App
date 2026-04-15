
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
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
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

// Mock the upload action used by ImageUpload
jest.mock('@/app/actions/upload', () => ({
  uploadProjectImage: jest.fn().mockResolvedValue({ success: true, url: 'https://example.com/image.jpg' }),
}));

describe('EditProjectForm', () => {
  const mockProject: Project = {
    id: 'p1',
    name: 'Test Project',
    tagline: 'A test tagline',
    description: '# Test Description\nThis is a test description with markdown.',
    contributionNeeds: ['React', 'Node.js'],
    progress: 50,
    team: [],
    status: 'published',
    governance: {
      contributorsShare: 70,
      communityShare: 20,
      sustainabilityShare: 10,
    },
    tags: [],
    startDate: '2024-01-01' as any,
    endDate: '2024-03-31' as any,
    createdAt: '2024-01-01' as any,
    updatedAt: '2024-03-31' as any,
  };

  it('renders the form without crashing', () => {
    render(<EditProjectForm project={mockProject} users={[]} allTags={[]} />);
    // Basic smoke test — form renders without throwing
    expect(screen.getByText('Project Name')).toBeInTheDocument();
  });
});
