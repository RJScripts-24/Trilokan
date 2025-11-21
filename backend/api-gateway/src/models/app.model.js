module.exports = (sequelize, DataTypes) => {
  const App = sequelize.define('App', {
    appName: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    packageName: {
      type: DataTypes.STRING,
      allowNull: false,
      // e.g., "com.trustguard.bank"
      // This is unique for Official apps, but duplicates might exist in reports
      // so we don't enforce unique: true globally here, but you might index it.
    },
    fileHash: {
      type: DataTypes.STRING,
      // SHA-256 Checksum
      // This is the CRITICAL field. If an APK uploaded by a user matches 
      // this hash, we know 100% it is safe.
    },
    version: {
      type: DataTypes.STRING,
      // e.g., "1.0.4"
    },
    publisher: {
      type: DataTypes.STRING,
      // e.g., "TrustGuard Financial Services Ltd."
    },
    storeUrl: {
      type: DataTypes.STRING,
      validate: {
        isUrl: true,
      },
      // Link to the official Google Play / App Store page
    },
    status: {
      type: DataTypes.ENUM('verified', 'suspicious', 'malicious'),
      defaultValue: 'suspicious',
      // 'verified'   = Added by Admin. Safe.
      // 'suspicious' = Reported by User/Crawler. Needs review.
      // 'malicious'  = Confirmed fake/malware.
    },
    description: {
      type: DataTypes.TEXT,
      // Used for user reports: "Found this on a Facebook ad..."
    },
    reporterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // If a user reported this, we link to them. 
      // If verified/added by admin, this is null.
    },
  }, {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['packageName', 'version', 'fileHash'], 
        // Prevent duplicate entries for the exact same app version
      },
      {
        fields: ['fileHash'], // Faster lookups during APK scans
      }
    ],
  });

  return App;
};