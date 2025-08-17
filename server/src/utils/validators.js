// Simple reusable validators

exports.isEmail = (str) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
};

exports.isStrongPassword = (str) => {
  // at least 6 chars, 1 number, 1 letter
  return /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(str);
};

exports.isNonEmptyString = (str) => {
  return typeof str === 'string' && str.trim().length > 0;
};

exports.isPositiveInt = (num) => {
  return Number.isInteger(num) && num > 0;
};
