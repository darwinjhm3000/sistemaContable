// Utilidades para encriptación de credenciales DIAN
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // Para AES, siempre es 16 bytes

/**
 * Obtiene la clave de encriptación desde variables de entorno o usa una por defecto
 * NOTA: En producción, SIEMPRE usar una variable de entorno segura
 */
function getEncryptionKey(): string {
  const key = process.env.DIAN_ENCRYPTION_KEY || 'default-key-change-in-production-32chars';
  
  // La clave debe tener exactamente 32 caracteres para AES-256
  if (key.length !== 32) {
    console.warn('⚠️  DIAN_ENCRYPTION_KEY debe tener 32 caracteres. Usando clave por defecto (NO SEGURO para producción)');
    return 'default-key-change-in-production-32chars'.substring(0, 32);
  }
  
  return key;
}

/**
 * Encripta un texto usando AES-256-CBC
 */
export function encrypt(text: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'utf8');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prefijo el IV al texto encriptado (se necesita para desencriptar)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error al encriptar:', error);
    throw new Error('Error al encriptar datos');
  }
}

/**
 * Desencripta un texto encriptado con AES-256-CBC
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'utf8');
    const parts = encryptedText.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Formato de texto encriptado inválido');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error al desencriptar:', error);
    throw new Error('Error al desencriptar datos');
  }
}

/**
 * Genera un hash SHA-256 de un texto (útil para comparar sin revelar el original)
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
