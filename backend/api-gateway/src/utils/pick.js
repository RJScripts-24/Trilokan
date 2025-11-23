/**
 * Create an object composed of the picked object properties
 * @param {Object} object - Source object
 * @param {string[]} keys - Array of property names to pick
 * @returns {Object} - New object with only the picked properties
 * 
 * Example:
 * pick({ a: 1, b: '2', c: 3 }, ['a', 'c']) // => { a: 1, c: 3 }
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      // eslint-disable-next-line no-param-reassign
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

module.exports = pick;
