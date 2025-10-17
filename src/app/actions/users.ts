
'use server';

import { findUsersByName, findUserById } from '@/lib/data.server';

export async function searchUsers(searchTerm: string) {
  if (!searchTerm) {
    return [];
  }
  return findUsersByName(searchTerm);
}

export async function findUsersByIds(ids: string[]) {
    if (!ids || ids.length === 0) {
        return [];
    }
    const userPromises = ids.map(findUserById);
    const users = await Promise.all(userPromises);
    return users.filter(user => user !== undefined);
}

