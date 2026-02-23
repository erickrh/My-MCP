import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create MCP server
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
  description: "An MCP tool to fetch the weather for a given city.",
});

// Register tools
server.registerTool(
  "fetch-weather",
  {
    title: "fetch-weather",
    description: "Fetch the weather for a given city",
    inputSchema: z.object({
      city: z.string().describe("The city to fetch the weather for"),
    }),
  },
  async ({ city }) => {
    try {
      const name = encodeURIComponent(city);
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${name}&count=10&language=en&format=json`
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error de geocoding: ${response.status} ${response.statusText}`,
            },
          ],
        };
      }

      const data = await response.json();
      const results = data?.results ?? [];

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No se encontró la ciudad ${city}`,
            },
          ],
        };
      }

      const { latitude, longitude } = results[0];
      const weatherResponse = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&current=temperature_2m,is_day,precipitation,rain&forecast_days=1`
      );

      if (!weatherResponse.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error del servicio del clima: ${weatherResponse.status} ${weatherResponse.statusText}`,
            },
          ],
        };
      }

      const weatherData = await weatherResponse.json();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(weatherData, null, 2),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Error de fetch/red: ${message}`,
          },
        ],
      };
    }
  }
);

// Listen for client connections
const transport = new StdioServerTransport();
server.connect(transport);