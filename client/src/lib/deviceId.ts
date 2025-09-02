/**
 * Device fingerprinting for anonymous user tracking
 * Creates a stable device ID without requiring login
 */

class DeviceIdManager {
  private static readonly STORAGE_KEY = 'word_game_device_id';
  private static deviceId: string | null = null;

  /**
   * Get or create a stable device ID
   */
  static getDeviceId(): string {
    if (this.deviceId) {
      return this.deviceId;
    }

    // Try to get from localStorage first
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      this.deviceId = stored;
      return stored;
    }

    // Generate new device ID
    this.deviceId = this.generateDeviceId();
    localStorage.setItem(this.STORAGE_KEY, this.deviceId);
    return this.deviceId;
  }

  /**
   * Generate a unique device fingerprint
   */
  private static generateDeviceId(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Create a simple fingerprint using various browser properties
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      !!window.localStorage,
      !!window.sessionStorage,
      navigator.cookieEnabled,
    ].join('|');

    // Add canvas fingerprint
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Word Game Device ID', 2, 2);
      fingerprint + '|' + canvas.toDataURL();
    }

    // Create hash-like ID from fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Add random component to make it more unique
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    
    return `device_${Math.abs(hash).toString(36)}_${timestamp}_${randomPart}`;
  }

  /**
   * Reset device ID (for testing or user request)
   */
  static resetDeviceId(): string {
    localStorage.removeItem(this.STORAGE_KEY);
    this.deviceId = null;
    return this.getDeviceId();
  }

  /**
   * Check if user is returning (has existing device ID)
   */
  static isReturningUser(): boolean {
    return !!localStorage.getItem(this.STORAGE_KEY);
  }
}

export { DeviceIdManager };