const sanitizeValue = (value) => {
  if (value && typeof value === 'object') {
    Object.keys(value).forEach((key) => {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
      } else {
        value[key] = sanitizeValue(value[key]);
      }
    });
  }
  return value;
};

const sanitizeMiddleware = (req, res, next) => {
  try {
    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    if (req.params) {
      req.params = sanitizeValue(req.params);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { sanitizeMiddleware, sanitizeValue };