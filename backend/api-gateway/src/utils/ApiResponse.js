class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code (e.g., 200, 201)
   * @param {any} data - The payload to return (object, array, null, etc.)
   * @param {string} [message='Success'] - A short description of the response
   */
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; // Automatically determine success based on status code
  }
}

module.exports = ApiResponse;