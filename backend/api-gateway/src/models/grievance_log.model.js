module.exports = (sequelize, DataTypes) => {
  const GrievanceLog = sequelize.define('GrievanceLog', {
    grievanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // Links this log entry to a specific complaint
    },
    actorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Who made the change? (Bank Official ID, Admin ID, or NULL if it was the System AI)
      // This ensures "Accountability"[cite: 74].
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
      // e.g., "STATUS_UPDATE", "PRIORITY_CHANGE", "NOTE_ADDED", "AI_TRIAGE"
    },
    details: {
      type: DataTypes.TEXT,
      // Human-readable description for the timeline UI.
      // e.g., "Complaint status updated from 'Open' to 'In Progress' by Officer Sharma."
    },
    previousStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      // Snapshot of state before change
    },
    newStatus: {
      type: DataTypes.STRING,
      allowNull: true,
      // Snapshot of state after change
    },
  }, {
    timestamps: true, 
    updatedAt: false, // We only care about when the log was CREATED. Logs should be immutable.
    indexes: [
      {
        fields: ['grievanceId'], // Speed up fetching history for a specific ticket
      }
    ],
  });

  return GrievanceLog;
};