function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error.code === 11000) {
    return res.status(409).json({
      error: { message: 'A record with that unique value already exists.' },
    });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: 'Validation failed.',
        details: Object.values(error.errors).map((item) => ({
          field: item.path,
          message: item.message,
        })),
      },
    });
  }

  if (error.name === 'CastError' || error.name === 'BSONError') {
    return res.status(400).json({
      error: { message: 'A supplied identifier or value is invalid.' },
    });
  }

  if (error.status) {
    return res.status(error.status).json({
      error: { message: error.message },
    });
  }

  console.error('Unhandled request error:', error);
  return res.status(500).json({
    error: { message: 'An unexpected server error occurred.' },
  });
}

module.exports = errorHandler;
