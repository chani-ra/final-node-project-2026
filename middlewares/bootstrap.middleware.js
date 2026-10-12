import crypto from "crypto";

export const requireAdminSetupKey = (req, res, next) => {
  const expectedKey = process.env.ADMIN_SETUP_KEY;
  const providedKey = req.get("x-admin-setup-key");

  if (!expectedKey) {
    return res.status(503).json({
      success: false,
      message: "Admin setup is disabled",
    });
  }

  if (!providedKey) {
    return res.status(401).json({
      success: false,
      message: "Admin setup key is required",
    });
  }

  const expectedBuffer = Buffer.from(expectedKey);
  const providedBuffer = Buffer.from(providedKey);

  const isValid =
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer);

  if (!isValid) {
    return res.status(403).json({
      success: false,
      message: "Invalid admin setup key",
    });
  }

  return next();
};