const { Sequelize } = require('sequelize');
const config = require('./config');
const logger = require('./logger'); // Using your custom logger for cleaner output

// 1. Create the Sequelize instance using config variables
const sequelize = new Sequelize(
  config.postgres.database,
  config.postgres.user,
  config.postgres.password,
  {
    host: config.postgres.host,
    port: config.postgres.port,
    dialect: config.postgres.dialect,
    pool: config.postgres.pool,
    
    // Use your custom logger to log SQL queries in development, 
    // or silence them in production to keep logs clean.
    logging: (msg) => config.env === 'development' ? logger.debug(msg) : false,
  }
);

// 2. Helper function to test the connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ PostgreSQL connected successfully via Sequelize');
    
    // Optional: Sync models (use strictly for dev/prototyping, not production)
    // await sequelize.sync({ alter: true }); 
    
  } catch (error) {
    logger.error('❌ Unable to connect to the database:', error);
    // If DB is down, the server shouldn't start.
    process.exit(1); 
  }
};

module.exports = {
  sequelize,
  connectDB,
};