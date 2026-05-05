/**
 * Utility for interacting with the Steem Keychain browser extension.
 * Documentation: https://github.com/MattyIce/steem-keychain
 */

export interface KeychainResponse {
  success: boolean;
  message: string;
  result: any;
  error?: string;
}

export class SteemKeychain {
  static isAvailable(): boolean {
    return typeof window !== 'undefined' && !!(window as any).steem_keychain;
  }

  /**
   * Requests a post (or comment) to be signed and broadcasted.
   */
  static requestPost(
    account: string,
    title: string,
    body: string,
    parent_permlink: string,
    parent_author: string,
    json_metadata: string,
    permlink: string
  ): Promise<KeychainResponse> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, message: 'Steem Keychain not found.', result: null, error: 'NOT_FOUND' });
        return;
      }

      (window as any).steem_keychain.requestPost(
        account,
        title,
        body,
        parent_permlink,
        parent_author,
        json_metadata,
        permlink,
        (response: any) => {
          resolve(response);
        }
      );
    });
  }

  /**
   * Requests a buffer to be signed (used for identity verification).
   */
  static requestSignBuffer(
    account: string,
    message: string,
    role: 'Posting' | 'Active' | 'Memo' = 'Posting'
  ): Promise<KeychainResponse> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ success: false, message: 'Steem Keychain not found.', result: null, error: 'NOT_FOUND' });
        return;
      }

      (window as any).steem_keychain.requestSignBuffer(
        account,
        message,
        role,
        (response: any) => {
          resolve(response);
        }
      );
    });
  }
}
