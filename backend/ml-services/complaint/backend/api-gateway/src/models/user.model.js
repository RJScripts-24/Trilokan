const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      trim: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [8, 100], // Minimum 8 chars for security
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'official', 'admin'),
      defaultValue: 'user',
      // 'user' = Regular citizen filing complaints
      // 'official' = Bank employee resolving complaints
      // 'admin' = System admin managing the App Registry
    },
    isIdentityVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // This flag is set to TRUE only after they pass the 
      // "Identity & Impersonation Fraud" check (Video/Voice/ID).
      // [cite: 24] "System dramatically raises the bar... by combining these layers"
    },
    preferredLanguage: {
      type: DataTypes.STRING,
      defaultValue: 'en',
      // Critical for "Inclusive Grievance Redressal"
      // We store 'en', 'hi', 'ta', etc. so the Chatbot knows which language to speak.
      // [cite: 58] "Multilingual NLP... tags and translates submissions"
    },
  }, {
    timestamps: true,
  });

  /**
   * Model Hook: Hash the password before saving
   * This ensures even if the DB is hacked, passwords are readable.
   */
  const hashPassword = async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  };

  User.beforeCreate(hashPassword);
  User.beforeUpdate(hashPassword);

  /**
   * Instance Method: Check if password matches
   * Used during Login.
   * @param {string} password - The plain text password
   * @returns {Promise<boolean>}
   */
  User.prototype.isPasswordMatch = async function (password) {
    return bcrypt.compare(password, this.password);
  };

  /**
   * Instance Method: Hide private fields in JSON response
   * When you send `res.send(user)`, this automatically removes the password.
   */
  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};