import { generateSecret, generateURI, verify } from "otplib"
import QRCode from "qrcode"

export function createSecret() {
  return generateSecret()
}

export function createURI(email, secret) {
  return generateURI({ issuer: "Nilspineda", label: email, secret, strategy: "totp" })
}

export function verifyToken(token, secret) {
  try {
    return verify({ token, secret })
  } catch {
    return false
  }
}

export function generateQR(uri) {
  return QRCode.toDataURL(uri, { width: 200, margin: 2 })
}
