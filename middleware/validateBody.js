function validateBody({ allowedFields, requiredFields = [] }) {
  return (req, res, next) => {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({
        error: { message: 'Request body must be a JSON object.' },
      });
    }

    const unknownFields = Object.keys(body).filter((field) => !allowedFields.includes(field));
    if (unknownFields.length > 0) {
      return res.status(400).json({
        error: {
          message: 'Request contains unsupported fields.',
          details: unknownFields,
        },
      });
    }

    const missingFields = requiredFields.filter(
      (field) => body[field] === undefined || body[field] === null || body[field] === '',
    );
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: {
          message: 'Request is missing required fields.',
          details: missingFields,
        },
      });
    }

    if (Object.keys(body).length === 0) {
      return res.status(400).json({
        error: { message: 'Request body must contain at least one field.' },
      });
    }

    next();
  };
}

module.exports = validateBody;
