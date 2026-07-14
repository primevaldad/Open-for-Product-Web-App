
export class UserNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class RecentSignInRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecentSignInRequiredError';
  }
}

export class NotAuthenticatedError extends Error {
    constructor(message: string = 'User not authenticated') {
        super(message);
        this.name = 'NotAuthenticatedError';
    }
}
