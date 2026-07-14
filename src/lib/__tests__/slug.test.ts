/**
 * Tests for slug.ts — validates the hybrid URL model used by mentions.
 *
 * Critical question being tested: extractId stops at the first dash.
 * If Firebase UIDs or Firestore document IDs contain dashes, this is unsafe.
 * Firebase Auth UIDs are alphanumeric (Base64-url-safe: [a-zA-Z0-9]).
 * Firestore auto-generated document IDs are 20 alphanumeric chars (no dashes).
 * Both are safe for the first-dash delimiter.
 */
import { toSlug, buildHybridUrl, extractId } from '../slug';

describe('toSlug', () => {
  it('converts spaces to hyphens', () => {
    expect(toSlug('Open for Product')).toBe('open-for-product');
  });

  it('handles multiple spaces and underscores', () => {
    expect(toSlug('My   Fancy   Project')).toBe('my-fancy-project');
    expect(toSlug('my_project_name')).toBe('my-project-name');
  });

  it('strips special characters', () => {
    expect(toSlug('Wyng It!')).toBe('wyng-it');
    expect(toSlug("Café Möven")).toBe('caf-mven');
  });

  it('trims leading and trailing hyphens', () => {
    expect(toSlug('  --hello-- ')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(toSlug('')).toBe('');
  });

  it('handles single word', () => {
    expect(toSlug('Wyng')).toBe('wyng');
  });
});

describe('buildHybridUrl', () => {
  it('builds project URL with id and slug', () => {
    expect(buildHybridUrl('/projects', 'cfp4u8pI1d339Wg54fuS', 'Open for Product'))
      .toBe('/projects/cfp4u8pI1d339Wg54fuS-open-for-product');
  });

  it('builds profile URL with uid and slug', () => {
    expect(buildHybridUrl('/profile', 'abc123XYZ', 'John Doe'))
      .toBe('/profile/abc123XYZ-john-doe');
  });

  it('falls back to id-only when slug is empty', () => {
    expect(buildHybridUrl('/profile', 'abc123', ''))
      .toBe('/profile/abc123');
  });

  it('handles names with special characters', () => {
    expect(buildHybridUrl('/projects', 'id123', 'Wyng It!'))
      .toBe('/projects/id123-wyng-it');
  });
});

describe('extractId', () => {
  it('extracts id from hybrid slug', () => {
    expect(extractId('cfp4u8pI1d339Wg54fuS-open-for-product'))
      .toBe('cfp4u8pI1d339Wg54fuS');
  });

  it('returns full param when no dash', () => {
    expect(extractId('abc123XYZ')).toBe('abc123XYZ');
  });

  it('returns empty string for empty input', () => {
    expect(extractId('')).toBe('');
  });

  it('handles slug with multiple dashes (stops at first)', () => {
    expect(extractId('abc123-open-for-product'))
      .toBe('abc123');
  });

  // CRITICAL: Firebase UIDs are alphanumeric, no dashes.
  // This test documents the assumption.
  it('correctly handles a typical Firebase UID (no dashes in UID)', () => {
    expect(extractId('a1B2c3D4e5F6g7H8i9J0-john-doe'))
      .toBe('a1B2c3D4e5F6g7H8i9J0');
  });

  // CRITICAL: Firestore auto-IDs are 20 alphanumeric chars, no dashes.
  it('correctly handles a typical Firestore document ID (no dashes)', () => {
    expect(extractId('cfp4u8pI1d339Wg54fuS-my-project'))
      .toBe('cfp4u8pI1d339Wg54fuS');
  });
});

describe('round-trip: buildHybridUrl → extractId', () => {
  const cases = [
    { prefix: '/projects', id: 'cfp4u8pI1d339Wg54fuS', name: 'Open for Product' },
    { prefix: '/profile', id: 'abc123XYZ', name: 'John Doe' },
    { prefix: '/projects', id: 'id123', name: 'Wyng It!' },
    { prefix: '/profile', id: 'uid789', name: 'A' },
    { prefix: '/projects', id: 'proj1', name: '' },
  ];

  cases.forEach(({ prefix, id, name }) => {
    it(`round-trips for ${prefix}/${id} ("${name}")`, () => {
      const url = buildHybridUrl(prefix, id, name);
      const segment = url.split('/').pop()!;
      expect(extractId(segment)).toBe(id);
    });
  });
});
