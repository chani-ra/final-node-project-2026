export const coachPlanSchema = {
  type: "object",

  properties: {
    focus: {
      type: "string",
    },

    summary: {
      type: "string",
    },

    steps: {
      type: "array",
      items: {
        type: "string",
      },
      minItems: 3,
      maxItems: 3,
    },

    tip: {
      type: "string",
    },

    encouragement: {
      type: "string",
    },

    estimatedMinutes: {
      type: "integer",
      minimum: 5,
      maximum: 60,
    },
  },

  required: [
    "focus",
    "summary",
    "steps",
    "tip",
    "encouragement",
    "estimatedMinutes",
  ],
};