'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('Grievances', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING,
        defaultValue: 'General',
      },
      priority: {
        type: Sequelize.ENUM('Low', 'Medium', 'High', 'Critical'),
        defaultValue: 'Medium',
      },
      status: {
        type: Sequelize.ENUM('Open', 'In Progress', 'Resolved', 'Closed'),
        defaultValue: 'Open',
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assignedTo: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      attachments: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      resolutionNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('Grievances', ['userId']);
    await queryInterface.addIndex('Grievances', ['status']);
    await queryInterface.addIndex('Grievances', ['category']);
    await queryInterface.addIndex('Grievances', ['priority']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('Grievances');
  }
};
