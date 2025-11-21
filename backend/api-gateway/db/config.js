// Load environment variables from .env file
require('dotenv').config();

const config = {
  mongodb: {
    // Connection URL
    url: process.env.MONGODB_URL || 'mongodb://localhost:27017/digital-trust-db',

    // Database Name
    // If your MONGODB_URL includes the db name, you can leave this generic,
    // but explicit naming is safer for migrations.
    databaseName: process.env.DB_NAME || 'digital-trust-db',

    options: {
      // Connection options
      useNewUrlParser: true, // (Optional depending on driver version)
      useUnifiedTopology: true,
      // connectTimeoutMS: 3600000, // Increase timeout for long migrations
      // socketTimeoutMS: 3600000,
    }
  },

  // The migrations dir, can be an relative or absolute path
  migrationsDir: "db/migrations",

  // The mongodb collection where the applied changes are stored.
  // This prevents the system from running the same migration twice.
  changelogCollectionName: "changelog",

  // The file extension to create migrations and search for in migration dir 
  migrationFileExtension: ".js",

  // Enable hashing to detect if an applied migration file has been changed
  useFileHash: false,

  // Don't change this unless you know what you are doing
  moduleSystem: 'commonjs',
};

module.exports = config;