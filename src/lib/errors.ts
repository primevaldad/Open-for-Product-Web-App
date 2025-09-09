/**
 * @fileoverview This file defines custom error classes for the application.
 */

/**
 * Represents an error thrown when a user is authenticated with Firebase
 * but their corresponding record is not found in the Firestore database.
 */
export class UserNotFoundError extends Error {
  constructor(message = 'User not found in the database.') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}
