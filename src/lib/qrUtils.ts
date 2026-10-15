import QRCode from 'qrcode';

/**
 * Returns the canonical verification URL for a member UUID
 */
export function getVerificationUrl(memberId: string): string {
  // Check if explicit APP_URL or VITE_APP_URL is provided
  const envUrl = import.meta.env.VITE_APP_URL || import.meta.env.APP_URL;
  const baseUrl = (envUrl && envUrl.startsWith('http')) ? envUrl.replace(/\/$/, '') : window.location.origin;
  return `${baseUrl}/verify/${memberId}`;
}

/**
 * Generates a high-resolution QR code as a PNG data URL
 */
export async function generateQrDataUrl(
  text: string,
  options?: {
    width?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: options?.width || 360,
      margin: 1.5,
      errorCorrectionLevel: 'H',
      color: {
        dark: options?.darkColor || '#064e3b', // Dark green brand color
        light: options?.lightColor || '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    throw err;
  }
}

/**
 * Triggers browser download of QR code PNG
 */
export function downloadQrCode(dataUrl: string, memberNo: string): void {
  const link = document.createElement('a');
  link.download = `${memberNo}-Verification-QR.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
