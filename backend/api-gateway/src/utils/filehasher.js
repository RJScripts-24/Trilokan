const crypto = require('crypto');
const fs = require('fs');

/**
 * Generates a hash for a file using streams.
 * This is memory-efficient and can handle large files (GBs in size).
 *
 * @param {string} filePath - The absolute or relative path to the file
 * @param {string} [algorithm='sha256'] - The hashing algorithm (sha256, md5, sha1)
 * @returns {Promise<string>} - The hexadecimal hash string
 */
const hashFile = (filePath, algorithm = 'sha256') => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`File not found: ${filePath}`));
    }

    const hash = crypto.createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on('error', (err) => reject(err));

    // Update hash as data flows in
    stream.on('data', (chunk) => hash.update(chunk));

    // Finalize hash when stream ends
    stream.on('end', () => resolve(hash.digest('hex')));
  });
};

/**
 * Verifies if a file matches a specific hash.
 * Useful for integrity checks after file uploads.
 *
 * @param {string} filePath - Path to the file
 * @param {string} expectedHash - The hash string to compare against
 * @param {string} [algorithm='sha256']
 * @returns {Promise<boolean>} - True if matches, False otherwise
 */
const verifyFileIntegrity = async (filePath, expectedHash, algorithm = 'sha256') => {
  try {
    const calculatedHash = await hashFile(filePath, algorithm);
    return calculatedHash === expectedHash;
  } catch (error) {
    // If file doesn't exist or access is denied, integrity check fails
    return false;
  }
};

module.exports = {
  hashFile,
  verifyFileIntegrity,
};