import { editDiscussionComment, deleteDiscussionComment } from '../../app/actions/projects';
import { adminDb, findProjectById } from '../data.server';
import { getAuthenticatedUser } from '../session.server';
import { createAndDispatchEvent } from '../events.server';

// Mock all external modules
jest.mock('../data.server', () => ({
  adminDb: {
    collection: jest.fn(),
  },
  findProjectById: jest.fn(),
}));

jest.mock('../session.server', () => ({
  getAuthenticatedUser: jest.fn(),
}));

jest.mock('../events.server', () => ({
  createAndDispatchEvent: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

jest.mock('firebase-admin', () => ({
  firestore: {
    FieldValue: {
      serverTimestamp: jest.fn(() => 'mock-timestamp'),
    },
  },
}));

describe('editDiscussionComment Server Action', () => {
  const mockUser = { id: 'user123', name: 'David' };
  const mockComment = {
    userId: 'user123',
    content: 'Original comment content',
    projectId: 'project789',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails if the user is not authenticated', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

    const result = await editDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
      content: 'Updated content',
    });

    expect(result).toEqual({ success: false, error: 'Authentication required' });
  });

  it('fails if the comment does not exist', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
    const mockDocGet = jest.fn().mockResolvedValue({ exists: false });
    const mockDoc = jest.fn().mockReturnValue({ get: mockDocGet });
    const mockCollection = jest.fn().mockReturnValue({ doc: mockDoc });
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue({ collection: mockCollection }) });

    // Nested mock for collection('projects').doc(projectId).collection('discussions').doc(commentId)
    const mockCommentDoc = { get: jest.fn().mockResolvedValue({ exists: false }) };
    const mockDiscussionsCol = { doc: jest.fn().mockReturnValue(mockCommentDoc) };
    const mockProjectDoc = { collection: jest.fn().mockReturnValue(mockDiscussionsCol) };
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(mockProjectDoc) });

    const result = await editDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
      content: 'Updated content',
    });

    expect(result).toEqual({ success: false, error: 'Comment not found' });
  });

  it('fails if the user is not the author of the comment', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
    
    const mockCommentDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ ...mockComment, userId: 'otherUser' }),
      }),
    };
    const mockDiscussionsCol = { doc: jest.fn().mockReturnValue(mockCommentDoc) };
    const mockProjectDoc = { collection: jest.fn().mockReturnValue(mockDiscussionsCol) };
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(mockProjectDoc) });

    const result = await editDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
      content: 'Updated content',
    });

    expect(result).toEqual({ success: false, error: 'You are not authorized to edit this comment.' });
  });

  it('successfully updates comment and dispatches DB event', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser);
    
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockCommentDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockComment,
      }),
      update: mockUpdate,
    };
    const mockDiscussionsCol = { doc: jest.fn().mockReturnValue(mockCommentDoc) };
    const mockProjectDoc = { collection: jest.fn().mockReturnValue(mockDiscussionsCol) };
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(mockProjectDoc) });

    const result = await editDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
      content: 'New content!',
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'New content!',
        editedAt: expect.any(String),
      })
    );
    expect(createAndDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'discussion-comment-edited',
        actorUserId: 'user123',
        projectId: 'project789',
      })
    );
  });
});

describe('deleteDiscussionComment Server Action', () => {
  const mockUser = { id: 'user123', name: 'David' };
  const mockComment = {
    userId: 'user123',
    content: 'Comment content',
    projectId: 'project789',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails if the user is not authenticated', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(null);

    const result = await deleteDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
    });

    expect(result).toEqual({ success: false, error: 'Authentication required' });
  });

  it('fails if unauthorized (not author and not project lead)', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'randomUser' });
    
    const mockCommentDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockComment, // Authored by 'user123'
      }),
    };
    const mockDiscussionsCol = { doc: jest.fn().mockReturnValue(mockCommentDoc) };
    const mockProjectDoc = { collection: jest.fn().mockReturnValue(mockDiscussionsCol) };
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(mockProjectDoc) });

    // Mock project where user is not a lead
    (findProjectById as jest.Mock).mockResolvedValue({
      id: 'project789',
      owner: { id: 'ownerId' },
      team: [],
    });

    const result = await deleteDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
    });

    expect(result).toEqual({ success: false, error: 'You are not authorized to delete this comment.' });
  });

  it('allows the author to delete and marks deletedBy as author', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue(mockUser); // 'user123'
    
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockCommentDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockComment,
      }),
      update: mockUpdate,
    };
    const mockDiscussionsCol = { doc: jest.fn().mockReturnValue(mockCommentDoc) };
    const mockProjectDoc = { collection: jest.fn().mockReturnValue(mockDiscussionsCol) };
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(mockProjectDoc) });

    (findProjectById as jest.Mock).mockResolvedValue({
      id: 'project789',
      owner: { id: 'ownerId' },
      team: [],
    });

    const result = await deleteDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedBy: 'author',
        deletedAt: expect.any(String),
      })
    );
  });

  it('allows project leads to delete other peoples comments and marks deletedBy as admin', async () => {
    (getAuthenticatedUser as jest.Mock).mockResolvedValue({ id: 'leadUser' });
    
    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockCommentDoc = {
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockComment, // Authored by 'user123'
      }),
      update: mockUpdate,
    };
    const mockDiscussionsCol = { doc: jest.fn().mockReturnValue(mockCommentDoc) };
    const mockProjectDoc = { collection: jest.fn().mockReturnValue(mockDiscussionsCol) };
    (adminDb.collection as jest.Mock).mockReturnValue({ doc: jest.fn().mockReturnValue(mockProjectDoc) });

    // Mock project where 'leadUser' is a lead
    (findProjectById as jest.Mock).mockResolvedValue({
      id: 'project789',
      owner: { id: 'ownerId' },
      team: [{ user: { id: 'leadUser' }, role: 'lead' }],
    });

    const result = await deleteDiscussionComment({
      projectId: 'project789',
      commentId: 'comment456',
    });

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedBy: 'admin',
        deletedAt: expect.any(String),
      })
    );
  });
});
