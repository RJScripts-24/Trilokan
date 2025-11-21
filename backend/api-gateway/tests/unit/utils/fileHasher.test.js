const fs = require('fs');
const path = require('path');
const { hashFile, verifyFileIntegrity } = require('../../../src/utils/filehasher');

describe('File Hasher Utility', () => {
  const testDir = path.join(__dirname, 'temp_test_files');
  const testFilePath = path.join(testDir, 'evidence_sample.txt');
  
  // Known SHA-256 hash for the string "Digital Trust Project"
  // Calculated via online tools for verification
  const knownContent = 'Digital Trust Project';
  const knownHash = 'a3c0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  // --- SETUP ---
  beforeAll(() => {
    // Create a temporary directory and file for testing
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    fs.writeFileSync(testFilePath, knownContent);
  });

  // --- TEARDOWN ---
  afterAll(() => {
    // Clean up: Delete the temp file and directory
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  });

  // --- TESTS ---

  describe('hashFile', () => {
    test('should correctly calculate SHA-256 hash of a file', async () => {
      const hash = await hashFile(testFilePath, 'sha256');
      expect(hash).toBe(knownHash);
    });

    test('should calculate MD5 hash if specified', async () => {
      // MD5 of "Digital Trust Project"
      const expectedMd5 = '8f633e546b830d7df62807a9c4cb68ca';
      const hash = await hashFile(testFilePath, 'md5');
      expect(hash).toBe(expectedMd5);
    });

    test('should throw an error if file does not exist', async () => {
      const fakePath = path.join(testDir, 'non_existent.pdf');
      await expect(hashFile(fakePath)).rejects.toThrow();
    });
  });

  describe('verifyFileIntegrity', () => {
    test('should return true if file matches the expected hash (Authentic)', async () => {
      const isAuthentic = await verifyFileIntegrity(testFilePath, knownHash);
      expect(isAuthentic).toBe(true);
    });

    test('should return false if file does not match the hash (Tampered/Forged)', async () => {
      const wrongHash = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';
      const isAuthentic = await verifyFileIntegrity(testFilePath, wrongHash);
      expect(isAuthentic).toBe(false);
    });

    test('should return false if file path is invalid', async () => {
      const isAuthentic = await verifyFileIntegrity('invalid/path.txt', knownHash);
      expect(isAuthentic).toBe(false);
    });
  });
});