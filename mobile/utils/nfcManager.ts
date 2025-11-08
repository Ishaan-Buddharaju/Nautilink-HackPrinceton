// Unified NFC Manager Module
// Provides clean, shared functions for NFC operations with safe fallbacks

let NfcManager: any = null;
let NfcTech: any = null;

// Build flag for NFC support
const NFC_ENABLED = true; // Set to false to disable NFC entirely

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

  /**
   * Initialize NFC manager
   */
  async init(): Promise<NFCResult> {
    if (!NFC_ENABLED) {
      return { success: false, error: 'NFC disabled by build flag' };
    }

    if (!NfcManager) {
      return { success: false, error: 'NFC not available in this environment' };
    }

    try {
      this.isSupported = await NfcManager.isSupported();
      
      if (!this.isSupported) {
        return { success: false, error: 'NFC not supported on this device' };
      }

      await NfcManager.start();
      this.isInitialized = true;
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `NFC initialization failed: ${error}` };
    }
  }

  /**
   * Check if NFC is supported and enabled
   */
  isNFCAvailable(): boolean {
    return NFC_ENABLED && this.isSupported && this.isInitialized;
  }

  /**
   * Read NFC tag
   */
  async readTag(): Promise<NFCResult> {
    if (!this.isNFCAvailable()) {
      return { success: false, error: 'NFC not available' };
    }

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      
      return { 
        success: true, 
        data: {
          id: tag.id,
          techTypes: tag.techTypes,
          type: tag.type,
          maxSize: tag.maxSize,
          isWritable: tag.isWritable,
          ndefMessage: tag.ndefMessage
        } as NFCTag
      };
    } catch (error) {
      return { success: false, error: `NFC read failed: ${error}` };
    } finally {
      await this.cancelRequest();
    }
  }

  /**
   * Write to NFC tag
   */
  async writeTag(message: string): Promise<NFCResult> {
    if (!this.isNFCAvailable()) {
      return { success: false, error: 'NFC not available' };
    }

    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      const bytes = NfcManager.ndefHandler.buildTextRecord(message);
      await NfcManager.ndefHandler.writeNdefMessage([bytes]);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: `NFC write failed: ${error}` };
    } finally {
      await this.cancelRequest();
    }
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
export const readNFC = () => nfcManager.readTag();
export const writeNFC = (message: string) => nfcManager.writeTag(message);
export const isNFCAvailable = () => nfcManager.isNFCAvailable();
export const simulateNFC = () => nfcManager.simulateNFCTap();
export const cleanupNFC = () => nfcManager.cleanup();
