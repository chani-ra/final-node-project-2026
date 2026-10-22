import assert from "node:assert/strict";
import test from "node:test";
import Review from "../models/review.model.js";
import ReviewController from "../controllers/review.controller.js";
import { errorHandling } from "../middlewares/errors.middleware.js";

test("review endpoint sends unexpected errors to the safe error middleware", async () => {
  const originalFind = Review.find;
  const originalEnv = process.env.NODE_ENV;
  const secret = "MongoDB internal host and credentials";
  let forwardedError;

  Review.find = () => {
    throw new Error(secret);
  };
  process.env.NODE_ENV = "production";

  try {
    await ReviewController.getApprovedReviews({}, {}, (error) => {
      forwardedError = error;
    });

    assert.ok(forwardedError instanceof Error);
    assert.equal(forwardedError.message, secret);

    let statusCode;
    let responseBody;
    const response = {
      headersSent: false,
      status(code) {
        statusCode = code;
        return this;
      },
      json(body) {
        responseBody = body;
        return this;
      },
    };

    errorHandling(forwardedError, {}, response, () => {
      throw new Error("Unexpected forwarding after error middleware");
    });

    assert.equal(statusCode, 500);
    assert.deepEqual(responseBody, {
      success: false,
      message: "אירעה שגיאה פנימית בשרת",
    });
    assert.ok(!JSON.stringify(responseBody).includes(secret));
  } finally {
    Review.find = originalFind;
    if (originalEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalEnv;
    }
  }
});
