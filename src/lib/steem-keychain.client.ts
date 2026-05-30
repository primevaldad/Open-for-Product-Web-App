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
    return typeof window !== 'undefined' && (!!(window as any).hive_keychain || !!(window as any).steem_keychain);
  }

  private static getKeychain(): any {
    return (window as any).hive_keychain || (window as any).steem_keychain;
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
        resolve({ success: false, message: 'Steem Keychain extension is not installed or enabled in this browser.', result: null, error: 'NOT_FOUND' });
        return;
      }

      const metadataString = typeof json_metadata === 'object' ? JSON.stringify(json_metadata) : json_metadata;

      this.getKeychain().requestPost(
        account,
        title,
        body,
        parent_permlink,
        parent_author,
        metadataString,
        permlink,
        "", // comment_options is required as a string by the Steem Keychain fork
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
        resolve({ success: false, message: 'Steem Keychain extension is not installed or enabled in this browser.', result: null, error: 'NOT_FOUND' });
        return;
      }

      this.getKeychain().requestSignBuffer(
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
