const { tokenTypes } = require('../config/tokens'); // (We will define these constants later)

module.exports = (sequelize, DataTypes) => {
  const Token = sequelize.define('Token', {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      index: true, // Indexed for faster lookups during auth checks
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // References the User model
    },
    type: {
      type: DataTypes.ENUM('refresh', 'resetPassword', 'verifyEmail'),
      allowNull: false,
      // 'refresh' = Keeps user logged in
      // 'resetPassword' = Sent via email to recover account
      // 'verifyEmail' = Sent to confirm email ownership
    },
    expires: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    blacklisted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // If a user logs out, we set this to true.
      // This prevents "Replay Attacks" where a hacker steals an old token.
    },
  }, {
    timestamps: true,
  });

  /**
   * Instance Method: Check if token is valid
   * @returns {boolean}
   */
  Token.prototype.isValid = function () {
    // Check if token is not blacklisted AND not expired
    const hasExpired = new Date() > this.expires;
    return !this.blacklisted && !hasExpired;
  };

  return Token;
};