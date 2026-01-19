// secure-storage.js - Secure credential storage for ATS Tailor Extension
// Uses Chrome's encrypted storage with additional encryption layer

export class SecureStorage {
  static STORAGE_KEY = 'encrypted_credentials';
  static ENCRYPTION_KEY_NAME = 'ats_extension_key';

  // Initialize the secure storage system
  static async init() {
    try {
      // Check if we already have an encryption key
      const existingKey = await this.getEncryptionKey();
      if (!existingKey) {
        // Generate a new encryption key
        const key = await this.generateEncryptionKey();
        await this.setEncryptionKey(key);
        console.log('[SecureStorage] Initialized with new encryption key');
      }
    } catch (error) {
      console.error('[SecureStorage] Initialization failed:', error);
      throw error;
    }
  }

  // Generate a secure encryption key
  static async generateEncryptionKey() {
    // Generate a 256-bit key for AES-GCM
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // Export the key as base64
    const exported = await crypto.subtle.exportKey('raw', key);
    return this.arrayBufferToBase64(exported);
  }

  // Store encryption key in Chrome's secure storage
  static async setEncryptionKey(keyBase64) {
    await chrome.storage.session.set({
      [this.ENCRYPTION_KEY_NAME]: keyBase64
    });
  }

  // Retrieve encryption key from Chrome's secure storage
  static async getEncryptionKey() {
    const result = await chrome.storage.session.get([this.ENCRYPTION_KEY_NAME]);
    return result[this.ENCRYPTION_KEY_NAME];
  }

  // Encrypt sensitive data
  static async encrypt(plaintext) {
    try {
      const keyBase64 = await this.getEncryptionKey();
      if (!keyBase64) {
        throw new Error('Encryption key not found');
      }

      // Import the key
      const key = await crypto.subtle.importKey(
        'raw',
        this.base64ToArrayBuffer(keyBase64),
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Generate a random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Encrypt the data
      const encoded = new TextEncoder().encode(plaintext);
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encoded
      );

      // Return IV + encrypted data as base64
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      return this.arrayBufferToBase64(combined.buffer);
    } catch (error) {
      console.error('[SecureStorage] Encryption failed:', error);
      throw error;
    }
  }

  // Decrypt sensitive data
  static async decrypt(encryptedBase64) {
    try {
      const keyBase64 = await this.getEncryptionKey();
      if (!keyBase64) {
        throw new Error('Encryption key not found');
      }

      // Import the key
      const key = await crypto.subtle.importKey(
        'raw',
        this.base64ToArrayBuffer(keyBase64),
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );

      // Convert base64 to ArrayBuffer
      const combined = this.base64ToArrayBuffer(encryptedBase64);

      // Extract IV (first 12 bytes) and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('[SecureStorage] Decryption failed:', error);
      throw error;
    }
  }

  // Save credentials for a specific platform
  static async saveCredentials(platform, credentials) {
    try {
      // Validate input
      if (!platform || typeof platform !== 'string') {
        throw new Error('Platform is required and must be a string');
      }

      if (!credentials || typeof credentials !== 'object') {
        throw new Error('Credentials must be an object');
      }

      // Get existing credentials
      const existing = await this.getAllCredentials();

      // Encrypt sensitive fields
      const encryptedCredentials = {};
      for (const [key, value] of Object.entries(credentials)) {
        if (this.isSensitiveField(key)) {
          // Encrypt sensitive fields
          encryptedCredentials[key] = await this.encrypt(String(value));
        } else {
          // Store non-sensitive fields as-is
          encryptedCredentials[key] = value;
        }
      }

      // Update credentials
      existing[platform] = encryptedCredentials;

      // Save to Chrome's encrypted storage
      await chrome.storage.local.set({
        [this.STORAGE_KEY]: existing
      });

      console.log(`[SecureStorage] Credentials saved for platform: ${platform}`);
    } catch (error) {
      console.error('[SecureStorage] Failed to save credentials:', error);
      throw error;
    }
  }

  // Get credentials for a specific platform
  static async getCredentials(platform) {
    try {
      if (!platform || typeof platform !== 'string') {
        throw new Error('Platform is required and must be a string');
      }

      const allCredentials = await this.getAllCredentials();
      const encryptedCredentials = allCredentials[platform];

      if (!encryptedCredentials) {
        return null;
      }

      // Decrypt sensitive fields
      const decryptedCredentials = {};
      for (const [key, value] of Object.entries(encryptedCredentials)) {
        if (this.isSensitiveField(key) && typeof value === 'string') {
          try {
            decryptedCredentials[key] = await this.decrypt(value);
          } catch (error) {
            console.warn(`[SecureStorage] Failed to decrypt field ${key}:`, error);
            decryptedCredentials[key] = value; // Return encrypted value as fallback
          }
        } else {
          decryptedCredentials[key] = value;
        }
      }

      return decryptedCredentials;
    } catch (error) {
      console.error('[SecureStorage] Failed to get credentials:', error);
      throw error;
    }
  }

  // Get all credentials
  static async getAllCredentials() {
    try {
      const result = await chrome.storage.local.get([this.STORAGE_KEY]);
      return result[this.STORAGE_KEY] || {};
    } catch (error) {
      console.error('[SecureStorage] Failed to get all credentials:', error);
      throw error;
    }
  }

  // Delete credentials for a specific platform
  static async deleteCredentials(platform) {
    try {
      if (!platform || typeof platform !== 'string') {
        throw new Error('Platform is required and must be a string');
      }

      const allCredentials = await this.getAllCredentials();
      delete allCredentials[platform];

      await chrome.storage.local.set({
        [this.STORAGE_KEY]: allCredentials
      });

      console.log(`[SecureStorage] Credentials deleted for platform: ${platform}`);
    } catch (error) {
      console.error('[SecureStorage] Failed to delete credentials:', error);
      throw error;
    }
  }

  // Clear all credentials
  static async clear() {
    try {
      await chrome.storage.local.remove([this.STORAGE_KEY]);
      console.log('[SecureStorage] All credentials cleared');
    } catch (error) {
      console.error('[SecureStorage] Failed to clear credentials:', error);
      throw error;
    }
  }

  // Check if a field should be encrypted
  static isSensitiveField(fieldName) {
    const sensitiveFields = [
      'password',
      'token',
      'api_key',
      'apikey',
      'secret',
      'private_key',
      'access_token',
      'refresh_token',
      'email', // Consider email sensitive
      'phone'  // Consider phone sensitive
    ];

    const fieldLower = fieldName.toLowerCase();
    return sensitiveFields.some(sensitive => fieldLower.includes(sensitive));
  }

  // Utility: ArrayBuffer to Base64
  static arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Utility: Base64 to ArrayBuffer
  static base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Validate credentials structure
  static validateCredentials(credentials) {
    if (!credentials || typeof credentials !== 'object') {
      return { valid: false, error: 'Credentials must be an object' };
    }

    // Check for required fields (example)
    const requiredFields = ['email'];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true };
  }

  // Export credentials (for backup/migration)
  static async exportCredentials() {
    try {
      const allCredentials = await this.getAllCredentials();
      
      // Create a backup with metadata
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        credentials: allCredentials
      };

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('[SecureStorage] Failed to export credentials:', error);
      throw error;
    }
  }

  // Import credentials (from backup)
  static async importCredentials(backupJson) {
    try {
      const backup = JSON.parse(backupJson);
      
      // Validate backup structure
      if (!backup.version || !backup.credentials) {
        throw new Error('Invalid backup format');
      }

      // Import credentials
      for (const [platform, credentials] of Object.entries(backup.credentials)) {
        await this.saveCredentials(platform, credentials);
      }

      console.log('[SecureStorage] Credentials imported successfully');
    } catch (error) {
      console.error('[SecureStorage] Failed to import credentials:', error);
      throw error;
    }
  }
}

// Auto-initialize when module loads
if (typeof chrome !== 'undefined' && chrome.storage) {
  SecureStorage.init().catch(error => {
    console.error('[SecureStorage] Auto-initialization failed:', error);
  });
}

// Export for use in other modules
export default SecureStorage;
