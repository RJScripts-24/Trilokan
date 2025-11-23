'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const adminEmail = 'admin@digitaltrust.com';

    // Check if admin already exists to prevent duplicate errors
    const existingAdmin = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      {
        replacements: { email: adminEmail },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    if (existingAdmin.length > 0) {
      console.log('Admin user already exists. Skipping seed.');
      return;
    }

    // Hash the password
    // Default password: 'password123' (Change this immediately after login!)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    // Insert the Admin User
    await queryInterface.bulkInsert('users', [
      {
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        isIdentityVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    console.log(`Admin created: ${adminEmail} / password123`);
  },

  async down(queryInterface, Sequelize) {
    // Remove the seeded admin
    await queryInterface.bulkDelete('users', {
      email: 'admin@digitaltrust.com',
    });
  },
};