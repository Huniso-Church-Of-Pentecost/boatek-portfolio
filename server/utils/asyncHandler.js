/* ==========================================================================
   utils/asyncHandler.js — wraps an async route handler so a rejected
   promise is forwarded to Express's error middleware instead of becoming
   an unhandled rejection (which, in a serverless function, can leave the
   request hanging with no response at all).
   ========================================================================== */

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };
