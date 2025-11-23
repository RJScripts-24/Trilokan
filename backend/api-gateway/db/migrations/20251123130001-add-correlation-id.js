'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add correlation_id to GrievanceLogs for distributed tracing
    await queryInterface.addColumn('GrievanceLogs', 'correlation_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      comment: 'Correlation ID for distributed tracing across gateway and ML services',
    });

    // Add index for faster lookups by correlation_id
    await queryInterface.addIndex('GrievanceLogs', ['correlation_id'], {
      name: 'grievance_logs_correlation_id_idx',
    });

    // Add correlation_id to Grievances table as well
    await queryInterface.addColumn('Grievances', 'correlation_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      comment: 'Correlation ID for the initial request that created this grievance',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove columns and indexes
    await queryInterface.removeIndex('GrievanceLogs', 'grievance_logs_correlation_id_idx');
    await queryInterface.removeColumn('GrievanceLogs', 'correlation_id');
    await queryInterface.removeColumn('Grievances', 'correlation_id');
  }
};

