module.exports = (sequelize, DataTypes) => {
  const Grievance = sequelize.define('Grievance', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      // This field holds the core complaint. 
      // If a user uses "Voice Complaint"[cite: 82], the AI transcription 
      // is stored here.
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'General',
      // "AI Categorization"[cite: 60]: The system automatically tags this 
      // (e.g., 'Fraud', 'Loan Dispute', 'Service Issue') using NLP.
    },
    priority: {
      type: DataTypes.ENUM('Low', 'Medium', 'High', 'Critical'),
      defaultValue: 'Medium',
      // "Prioritize urgency": Fraud cases are auto-flagged as 'High' 
      // or 'Critical' to alert officials immediately.
    },
    status: {
      type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
      defaultValue: 'Open',
      // "Real-time tracking"[cite: 68]: Updates to this field trigger 
      // email/SMS notifications to the user.
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // Links the complaint to the Citizen.
    },
    assignedTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      // Links to a Bank Official (User ID) who is handling the case.
      // Supports "route to the correct department".
    },
    attachments: {
      // PostgreSQL supports JSONB, which is perfect for storing an array of file paths
      // e.g., ["uploads/evidence-1.jpg", "uploads/statement.pdf"]
      type: DataTypes.JSONB, 
      defaultValue: [], 
    },
    resolutionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      // When an official closes the ticket, they write the final verdict here.
    },
  }, {
    timestamps: true, // Automatically manages createdAt and updatedAt
    indexes: [
      {
        fields: ['userId'], // Speed up "My Grievances" query
      },
      {
        fields: ['status'], // Speed up Admin Dashboard filtering
      },
    ],
  });

  return Grievance;
};