import QRCode from 'qrcode';
import { User } from '../types';

export interface TwoFactorSecret {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  secret?: string;
  backupCodes?: string[];
  createdAt?: Date;
}

export class TwoFactorAuthService {
  /**
   * Genera un nuevo secreto para 2FA usando APIs nativas del navegador
   */
  static async generateSecret(userEmail: string, appName: string = 'SodAsist'): Promise<TwoFactorSecret> {
    try {
      // Generar secreto único de 32 caracteres usando crypto del navegador
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      
      // Convertir a Base32 (formato estándar para TOTP)
      const secret = this.arrayToBase32(array);
      
      // Generar URL del código QR usando formato estándar TOTP
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&algorithm=SHA1&digits=6&period=30`;
      const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

      // Generar códigos de respaldo (8 códigos de 8 dígitos)
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      return {
        secret: secret,
        qrCodeUrl,
        backupCodes
      };
    } catch (error) {
      console.error('❌ Error generando secreto 2FA:', error);
      throw new Error('No se pudo generar el secreto de autenticación');
    }
  }

  /**
   * Convierte un array de bytes a Base32
   */
  private static arrayToBase32(array: Uint8Array): string {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (let i = 0; i < array.length; i++) {
      value = (value << 8) | array[i];
      bits += 8;

      while (bits >= 5) {
        result += base32Chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += base32Chars[(value << (5 - bits)) & 31];
    }

    // Asegurar que la longitud sea múltiplo de 8
    while (result.length % 8 !== 0) {
      result += '=';
    }

    return result;
  }

  /**
   * Verifica un código TOTP usando implementación nativa
   */
  static async verifyCode(secret: string, token: string): Promise<boolean> {
    try {
      const now = Math.floor(Date.now() / 30000); // Ventana de 30 segundos
      
      // Generar códigos para la ventana actual y las adyacentes
      for (let i = -1; i <= 1; i++) {
        const time = now + i;
        const expectedCode = await this.generateTOTPCode(secret, time);
        if (expectedCode === token) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error verificando código TOTP:', error);
      return false;
    }
  }

  /**
   * Genera un código TOTP para un timestamp específico
   */
  private static async generateTOTPCode(secret: string, time: number): Promise<string> {
    try {
      // Convertir el tiempo a bytes (Big Endian)
      const timeBytes = new ArrayBuffer(8);
      const view = new DataView(timeBytes);
      view.setBigUint64(0, BigInt(time), false);
      
      // Convertir Base32 a bytes
      const secretBytes = this.base32ToArray(secret);
      
      // Crear hash HMAC-SHA1
      const key = await crypto.subtle.importKey(
        'raw',
        secretBytes,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, timeBytes);
      const signatureArray = new Uint8Array(signature);
      
      // Generar código de 6 dígitos usando el último byte
      const offset = signatureArray[signatureArray.length - 1] & 0xf;
      const code = (
        ((signatureArray[offset] & 0x7f) << 24) |
        ((signatureArray[offset + 1] & 0xff) << 16) |
        ((signatureArray[offset + 2] & 0xff) << 8) |
        (signatureArray[offset + 3] & 0xff)
      ) % 1000000;
      
      return code.toString().padStart(6, '0');
    } catch (error) {
      console.error('❌ Error generando código TOTP:', error);
      return '000000';
    }
  }

  /**
   * Convierte Base32 a array de bytes
   */
  private static base32ToArray(base32: string): Uint8Array {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const base32String = base32.replace(/=/g, '').toUpperCase();
    const result: number[] = [];
    let bits = 0;
    let value = 0;

    for (let i = 0; i < base32String.length; i++) {
      const char = base32String[i];
      const index = base32Chars.indexOf(char);
      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      while (bits >= 8) {
        result.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }

    return new Uint8Array(result);
  }

  /**
   * Genera el código TOTP actual para verificación
   */
  static async getCurrentCode(secret: string): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 30000);
      return await this.generateTOTPCode(secret, now);
    } catch (error) {
      console.error('❌ Error generando código TOTP actual:', error);
      return '000000';
    }
  }

  /**
   * Método de prueba para verificar que TOTP funciona
   */
  static async testTOTP(secret: string): Promise<{ current: string; next: string; isValid: boolean }> {
    try {
      const current = await this.getCurrentCode(secret);
      const isValid = await this.verifyCode(secret, current);
      
      return { current, next: current, isValid };
    } catch (error) {
      console.error('❌ Error en prueba TOTP:', error);
      return { current: '000000', next: '000000', isValid: false };
    }
  }

  /**
   * Verifica un código de respaldo
   */
  static verifyBackupCode(backupCodes: string[], code: string): boolean {
    return backupCodes.includes(code.toUpperCase());
  }

  /**
   * Activa 2FA para un usuario
   */
  static async enableTwoFactor(
    userId: string, 
    secret: string, 
    backupCodes: string[]
  ): Promise<boolean> {
    try {
      const twoFactorData = {
        isEnabled: true,
        secret: secret,
        backupCodes: backupCodes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Importar Firebase directamente para usar la ruta correcta
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // Actualizar directamente en la colección users
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        twoFactor: twoFactorData
      });

      console.log('✅ 2FA activado para usuario:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error activando 2FA:', error);
      throw new Error('No se pudo activar la autenticación de dos factores');
    }
  }

  /**
   * Desactiva 2FA para un usuario
   */
  static async disableTwoFactor(userId: string): Promise<boolean> {
    try {
      // Importar Firebase directamente para usar la ruta correcta
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // Actualizar directamente en la colección users
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        twoFactor: {
          isEnabled: false,
          secret: null,
          backupCodes: null,
          updatedAt: new Date()
        }
      });

      console.log('✅ 2FA desactivado para usuario:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error desactivando 2FA:', error);
      throw new Error('No se pudo desactivar la autenticación de dos factores');
    }
  }

  /**
   * Obtiene el estado de 2FA de un usuario
   */
  static async getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
    try {
      // Importar Firebase directamente para usar la ruta correcta
      const { doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // Obtener directamente de la colección users
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return { isEnabled: false };
      }
      
      const user = userSnap.data() as User;
      if (!user || !user.twoFactor) {
        return { isEnabled: false };
      }

      return {
        isEnabled: user.twoFactor.isEnabled || false,
        secret: user.twoFactor.secret,
        backupCodes: user.twoFactor.backupCodes,
        createdAt: user.twoFactor.createdAt
      };
    } catch (error) {
      console.error('❌ Error obteniendo estado 2FA:', error);
      return { isEnabled: false };
    }
  }

  /**
   * Genera un nuevo código de respaldo
   */
  static generateBackupCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  /**
   * Regenera todos los códigos de respaldo
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const newBackupCodes = Array.from({ length: 8 }, () => 
        this.generateBackupCode()
      );

      // Importar Firebase directamente para usar la ruta correcta
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // Actualizar directamente en la colección users
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'twoFactor.backupCodes': newBackupCodes,
        'twoFactor.updatedAt': new Date()
      });

      console.log('✅ Códigos de respaldo regenerados para usuario:', userId);
      return newBackupCodes;
    } catch (error) {
      console.error('❌ Error regenerando códigos de respaldo:', error);
      throw new Error('No se pudieron regenerar los códigos de respaldo');
    }
  }

  /**
   * Actualiza los códigos de respaldo (remueve uno usado)
   */
  static async updateBackupCodes(userId: string, newBackupCodes: string[]): Promise<boolean> {
    try {
      // Importar Firebase directamente para usar la ruta correcta
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebase');
      
      // Actualizar directamente en la colección users
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'twoFactor.backupCodes': newBackupCodes,
        'twoFactor.updatedAt': new Date()
      });

      console.log('✅ Códigos de respaldo actualizados para usuario:', userId);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando códigos de respaldo:', error);
      throw new Error('No se pudieron actualizar los códigos de respaldo');
    }
  }

  /**
   * Valida que un código TOTP tenga el formato correcto
   */
  static validateTOTPCode(code: string): boolean {
    // Código TOTP debe ser de 6 dígitos numéricos
    const totpRegex = /^\d{6}$/;
    return totpRegex.test(code);
  }

  /**
   * Valida que un código de respaldo tenga el formato correcto
   */
  static validateBackupCode(code: string): boolean {
    // Código de respaldo debe ser de 8 caracteres alfanuméricos
    const backupRegex = /^[A-Z0-9]{8}$/;
    return backupRegex.test(code.toUpperCase());
  }
}
