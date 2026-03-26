#!/usr/bin/env node
/**
 * Quick JWT sanity check: same HS256 sign/verify as express-gateway (userJwt.js) and auth-docen.
 * Reads JWT_SECRET from ../express-gateway/.env (first JWT_SECRET= line).
 *
 * Usage (from auth-docen root): node scripts/jwt-self-check.mjs
 */
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import jwt from "jsonwebtoken"

function jwtSecretFingerprint(secret) {
  return crypto.createHash("sha256").update(secret, "utf8").digest("hex").slice(0, 16)
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, "../../express-gateway/.env")

function readJwtSecretFromEnvFile(file) {
  const raw = fs.readFileSync(file, "utf8")
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^JWT_SECRET=(.*)$/)
    if (!m) continue
    let v = m[1].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    return v
  }
  return ""
}

const secret = readJwtSecretFromEnvFile(envPath)
if (!secret) {
  console.error(`FAIL: JWT_SECRET not found in ${envPath}`)
  process.exit(1)
}

const payload = { sub: "jwt-self-check", email: "check@local.test" }
const token = jwt.sign(payload, secret, { expiresIn: "5m" })
const decoded = jwt.verify(token, secret)
if (decoded.sub !== payload.sub) {
  console.error("FAIL: payload mismatch after verify")
  process.exit(1)
}
console.log(`OK: HS256 sign+verify (${envPath})`)
console.log(`    fingerprint (sha256[:16]): ${jwtSecretFingerprint(secret)}`)
console.log("    Compare with auth-docen startup: JWT secret fingerprint must match.")
console.log("    auth-docen must use this same secret (YAML jwt-secret or env JWT_SECRET; YAML wins if set).")
