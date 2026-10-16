const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadJwtSecret() {
  if (process.env.JWT_SECRET) {
    if (Buffer.byteLength(process.env.JWT_SECRET) < 32) {
      throw new Error('JWT_SECRET must contain at least 32 bytes.');
    }
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production.');
  }

  const secretPath = path.join(__dirname, '.auth-secret');
  try {
    const existingSecret = fs.readFileSync(secretPath, 'utf8').trim();
    if (Buffer.byteLength(existingSecret) < 32) {
      throw new Error('The local authentication secret is invalid.');
    }
    return existingSecret;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const newSecret = crypto.randomBytes(64).toString('base64url');
  try {
    fs.writeFileSync(secretPath, `${newSecret}\n`, { flag: 'wx', mode: 0o600 });
    return newSecret;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    return fs.readFileSync(secretPath, 'utf8').trim();
  }
}

module.exports = { jwtSecret: loadJwtSecret() };