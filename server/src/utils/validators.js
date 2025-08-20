exports.isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
exports.isStrongPassword = (str) => /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(str);
exports.isNonEmptyString = (str) => typeof str === 'string' && str.trim().length > 0;
exports.isPositiveInt = (num) => Number.isInteger(num) && num > 0;
