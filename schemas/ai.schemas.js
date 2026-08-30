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

export const dailyGuideSchema = {
  type: "object",

  properties: {
    focus: {
      type: "string",
    },

    reason: {
      type: "string",
    },

    steps: {
      type: "array",

      items: {
        type: "object",

        properties: {
          title: {
            type: "string",
          },

          description: {
            type: "string",
          },

          action: {
            type: "string",

            enum: [
              "OPEN_CHAT",
              "OPEN_DICTIONARY",
              "OPEN_TASKS",
              "OPEN_COURSES",
              "OPEN_WRITING",
            ],
          },

          estimatedMinutes: {
            type: "integer",
            minimum: 5,
            maximum: 30,
          },
        },

        required: [
          "title",
          "description",
          "action",
          "estimatedMinutes",
        ],
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
      minimum: 10,
      maximum: 60,
    },
  },

  required: [
    "focus",
    "reason",
    "steps",
    "tip",
    "encouragement",
    "estimatedMinutes",
  ],
};