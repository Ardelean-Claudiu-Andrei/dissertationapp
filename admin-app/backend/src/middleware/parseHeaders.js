// Extracts device-id and app-version from request headers
// and attaches them to the request object for downstream use.
function parseHeaders(req, res, next) {
  req.deviceId = req.headers['x-device-id'] || null;
  req.appVersion = req.headers['x-app-version'] || '1.0.0';
  next();
}

module.exports = parseHeaders;
