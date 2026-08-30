export async function runAgentTools({
  ai,
  model = "gemini-2.5-flash",
  prompt,
  toolDeclarations,
  toolHandlers,
  toolContext,
  maxToolCalls = 3,
}) {
  const agentContents = [
    {
      role: "user",
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ];

  const usedToolNames = new Set();
  const toolsUsed = [];

  let toolCallsCount = 0;

  for (
    let round = 0;
    round < maxToolCalls;
    round++
  ) {
    const agentResponse =
      await ai.models.generateContent({
        model,

        contents: agentContents,

        config: {
          tools: [
            {
              functionDeclarations:
                toolDeclarations,
            },
          ],
        },
      });

    const modelContent =
      agentResponse.candidates?.[0]?.content;

    if (modelContent) {
      agentContents.push(modelContent);
    }

    const functionCalls =
      agentResponse.functionCalls || [];

    if (functionCalls.length === 0) {
      break;
    }

    const functionResponseParts = [];

    for (const functionCall of functionCalls) {
      if (toolCallsCount >= maxToolCalls) {
        break;
      }

      if (
        usedToolNames.has(functionCall.name)
      ) {
        const duplicateResponse = {
          name: functionCall.name,

          response: {
            result: {
              message:
                "This tool was already used. Choose another tool if needed, or finish.",
            },
          },
        };

        if (functionCall.id) {
          duplicateResponse.id =
            functionCall.id;
        }

        functionResponseParts.push({
          functionResponse:
            duplicateResponse,
        });

        continue;
      }

      const toolHandler =
        toolHandlers[functionCall.name];

      if (!toolHandler) {
        throw new Error(
          `Unknown agent tool: ${functionCall.name}`
        );
      }

      const toolData = await toolHandler(
        toolContext,
        functionCall.args || {}
      );

      usedToolNames.add(functionCall.name);
      toolsUsed.push(functionCall.name);

      toolCallsCount += 1;

      console.log(
        `🛠️ Agent used ${functionCall.name}`
      );

      const functionResponse = {
        name: functionCall.name,

        response: {
          result: toolData,
        },
      };

      if (functionCall.id) {
        functionResponse.id =
          functionCall.id;
      }

      functionResponseParts.push({
        functionResponse,
      });
    }

    if (functionResponseParts.length === 0) {
      break;
    }

    agentContents.push({
      role: "user",
      parts: functionResponseParts,
    });

    if (toolCallsCount >= maxToolCalls) {
      break;
    }
  }

  return {
    agentContents,
    toolsUsed,
  };
}