'use strict';

const { sendError } = require('../../utils/responseHelper');

const validateRequest = (schemas) => (req, res, next) => {
  for (const [key, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[key]);
    if (!result.success) {
      const issues = result.error.issues.map(({ path, message }) => ({
        field: path.join('.'),
        message,
      }));
      return sendError(res, 400, 'Dữ liệu gửi lên không hợp lệ.', { issues });
    }
    req.validated = req.validated || {};
    req.validated[key] = result.data;
  }
  return next();
};

module.exports = { validateRequest };
