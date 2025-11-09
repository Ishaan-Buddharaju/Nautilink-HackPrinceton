// Unified NFC Manager Module
// Provides clean, shared functions for NFC operations with safe fallbacks

let NfcManager: any = null;
let NfcTech: any = null;

// Build flag for NFC support
const NFC_ENABLED = true;

// Initialize NFC modules
try {
  if (NFC_ENABLED) {
    const nfcModule = require('react-native-nfc-manager');
    NfcManager = nfcModule.default;
    NfcTech = nfcModule.NfcTech;
  }
} catch (e) {
  console.log('NFC Manager not available - using fallback mode');
}

export interface NFCResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface NFCTag {
  id: string;
  techTypes: string[];
  type: string;
  maxSize?: number;
  isWritable?: boolean;
  ndefMessage?: any[];
}

class UnifiedNFCManager {
  private isInitialized = false;
  private isSupported = false;
  private isEnabled = false;

  /**
   * Initialize NFC manager with better error handling
   */
  async init(): Promise<NFCResult> {
    if (!NFC_ENABLED) {
      console.log('NFC disabled by build configuration');
      return { success: false, error: 'NFC disabled by build flag' };
    }

    if (!NfcManager) {
      console.log('NFC not available in this environment - using fallback mode');
      return { success: false, error: 'NFC not available in this environment' };
    }

    try {
      // Check if NFC is supported
      this.isSupported = await NfcManager.isSupported();
      
      if (!this.isSupported) {
        console.log('NFC not supported on this device');
        return { success: false, error: 'NFC not supported on this device' };
      }

      // Check if NFC is enabled
      this.isEnabled = await NfcManager.isEnabled();
      
      if (!this.isEnabled) {
        console.log('NFC is disabled in device settings');
        return { success: false, error: 'NFC is disabled. Please enable NFC in device settings.' };
      }

      await NfcManager.start();
      this.isInitialized = true;
      
      console.log('NFC Manager initialized successfully');
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log('NFC init failed:', errorMsg);
      return { success: false, error: `NFC initialization failed: ${errorMsg}` };
    }
  }

  /**
   * Check if NFC is supported and enabled
   */
  isNFCAvailable(): boolean {
    return NFC_ENABLED && this.isSupported && this.isInitialized;
  }

  /**
   * Read NFC tag with timeout support
   */
  async readTag(timeoutMs: number = 30000): Promise<NFCResult> {
    if (!this.isNFCAvailable()) {
      return { success: false, error: 'NFC not available' };
    }

    try {
      console.log('Starting NFC read operation...');
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('NFC read timeout')), timeoutMs);
      });

      // Request NFC technology
      await Promise.race([
        NfcManager.requestTechnology(NfcTech.Ndef),
        timeoutPromise
      ]);

      const tag = await Promise.race([
        NfcManager.getTag(),
        timeoutPromise
      ]);
      
      console.log('NFC tag read successfully:', tag.id);
      
      return { 
        success: true, 
        data: {
          id: tag.id,
          techTypes: tag.techTypes || [],
          type: tag.type || 'unknown',
          maxSize: tag.maxSize,
          isWritable: tag.isWritable || false,
          ndefMessage: tag.ndefMessage || []
        } as NFCTag
      };
    } catch (error) {
      console.error('NFC read error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `NFC read failed: ${errorMessage}` };
    } finally {
      await this.cancelRequest();
    }
  }

  /**
   * Write to NFC tag with validation
   */
  async writeTag(message: string, timeoutMs: number = 30000): Promise<NFCResult> {
    if (!this.isNFCAvailable()) {
      return { success: false, error: 'NFC not available' };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Message cannot be empty' };
    }

    try {
      console.log('Starting NFC write operation...');
      
      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('NFC write timeout')), timeoutMs);
      });

      await Promise.race([
        NfcManager.requestTechnology(NfcTech.Ndef),
        timeoutPromise
      ]);
      
      // Check if tag is writable
      const tag = await NfcManager.getTag();
      if (!tag.isWritable) {
        return { success: false, error: 'NFC tag is not writable' };
      }
      
      const bytes = NfcManager.ndefHandler.buildTextRecord(message);
      await Promise.race([
        NfcManager.ndefHandler.writeNdefMessage([bytes]),
        timeoutPromise
      ]);
      
      console.log('NFC tag written successfully');
      return { success: true, data: { message, tagId: tag.id } };
    } catch (error) {
      console.error('NFC write error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: `NFC write failed: ${errorMessage}` };
    } finally {
      await this.cancelRequest();
    }
  }

  /**
   * Get comprehensive NFC status
   */
  async getStatus(): Promise<{
    enabled: boolean;
    supported: boolean;
    initialized: boolean;
    available: boolean;
    error?: string;
  }> {
    const status = {
      enabled: NFC_ENABLED,
      supported: false,
      initialized: this.isInitialized,
      available: false,
      error: undefined as string | undefined
    };

    if (!NFC_ENABLED) {
      status.error = 'NFC disabled by build configuration';
      return status;
    }

    if (!NfcManager) {
      status.error = 'NFC library not available';
      return status;
    }

    try {
      status.supported = await NfcManager.isSupported();
      if (status.supported) {
        const deviceEnabled = await NfcManager.isEnabled();
        if (!deviceEnabled) {
          status.error = 'NFC disabled in device settings';
        } else {
          status.available = this.isInitialized;
        }
      } else {
        status.error = 'NFC not supported on this device';
      }
    } catch (error) {
      status.error = `NFC status check failed: ${error}`;
    }

    return status;
  }

  /**
   * Start NFC scanning session
   */
  async startScanning(onTagDetected: (tag: NFCTag) => void): Promise<NFCResult> {
    if (!this.isNFCAvailable()) {
      return { success: false, error: 'NFC not available' };
    }

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      // Set up tag detection
      const tag = await NfcManager.getTag();
      onTagDetected({
        id: tag.id,
        techTypes: tag.techTypes,
        type: tag.type,
        maxSize: tag.maxSize,
        isWritable: tag.isWritable,
        ndefMessage: tag.ndefMessage
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `NFC scanning failed: ${error}` };
    }
  }

  /**
   * Stop NFC scanning
   */
  async stopScanning(): Promise<void> {
    await this.cancelRequest();
  }

  /**
   * Cancel current NFC request
   */
  async cancelRequest(): Promise<void> {
    if (NfcManager) {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('NFC cancel request error:', error);
      }
    }
  }

  /**
   * Cleanup NFC resources
   */
  async cleanup(): Promise<void> {
    await this.cancelRequest();
    this.isInitialized = false;
  }

  /**
   * Simulate NFC tap for development/testing
   */
  simulateNFCTap(): NFCResult {
    return {
      success: true,
      data: {
        id: 'simulated-tag-id',
        techTypes: ['android.nfc.tech.Ndef'],
        type: 'android.nfc.tech.Ndef',
        maxSize: 8192,
        isWritable: true,
        ndefMessage: []
      } as NFCTag
    };
  }
}

// Export singleton instance
export const nfcManager = new UnifiedNFCManager();

// Convenience functions
export const initNFC = () => nfcManager.init();
export const readNFC = (timeoutMs?: number) => nfcManager.readTag(timeoutMs);
export const writeNFC = (message: string, timeoutMs?: number) => nfcManager.writeTag(message, timeoutMs);
export const isNFCAvailable = () => nfcManager.isNFCAvailable();
export const getNFCStatus = () => nfcManager.getStatus();
export const simulateNFC = () => nfcManager.simulateNFCTap();
export const cleanupNFC = () => nfcManager.cleanup();
export const startNFCScanning = (onTagDetected: (tag: NFCTag) => void) => nfcManager.startScanning(onTagDetected);
export const stopNFCScanning = () => nfcManager.stopScanning();
