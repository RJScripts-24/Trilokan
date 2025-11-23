const Sequelize = require('sequelize');
const config = require('../config/config');
const logger = require('../config/logger');

// 1. Initialize Sequelize Instance
const sequelize = new Sequelize(
  config.postgres.database,
  config.postgres.user,
  config.postgres.password,
  {
    host: config.postgres.host,
    port: config.postgres.port,
    dialect: config.postgres.dialect,
    pool: config.postgres.pool,
    logging: (msg) => config.env === 'development' ? logger.debug(msg) : false,
  }
);

const db = {};

// 2. Import Models
// We pass the 'sequelize' instance and 'Sequelize' library to each model file
db.User = require('./user.model')(sequelize, Sequelize);
db.Token = require('./token.model')(sequelize, Sequelize);
db.App = require('./app.model')(sequelize, Sequelize);
db.Grievance = require('./grievance.model')(sequelize, Sequelize);
db.GrievanceLog = require('./grievance_log.model')(sequelize, Sequelize);
db.FileUpload = require('./fileupload.model')(sequelize, Sequelize);

// 3. Define Associations (Relationships)

// --- Auth Relationships ---
// A User has many Tokens (Refresh tokens for multiple devices)
db.User.hasMany(db.Token, { foreignKey: 'userId', onDelete: 'CASCADE' });
db.Token.belongsTo(db.User, { foreignKey: 'userId' });

// --- Grievance Relationships ---
// A User creates many Grievances
db.User.hasMany(db.Grievance, { foreignKey: 'userId', as: 'grievances' });
db.Grievance.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

// A Grievance has many Logs (History of status changes)
// "Transparency" requirement: Users can see the history of their complaint.
db.Grievance.hasMany(db.GrievanceLog, { foreignKey: 'grievanceId', as: 'history' });
db.GrievanceLog.belongsTo(db.Grievance, { foreignKey: 'grievanceId' });

// --- App Relationships ---
// A User (Reporter) might report a suspicious App
db.User.hasMany(db.App, { foreignKey: 'reporterId', as: 'reportedApps' });
db.App.belongsTo(db.User, { foreignKey: 'reporterId', as: 'reporter' });

// --- File Upload Relationships ---
// A User can upload many files
db.User.hasMany(db.FileUpload, { foreignKey: 'uploadedBy', as: 'uploads' });
db.FileUpload.belongsTo(db.User, { foreignKey: 'uploadedBy', as: 'uploader' });

// 4. Export
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;