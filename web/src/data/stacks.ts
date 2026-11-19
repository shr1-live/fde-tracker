export type StackId = "dotnet" | "mern" | "java" | "python";
export type Link = { title: string; url: string; note?: string };
export type StackInfo = { id: StackId; label: string; blurb: string; rows: { layer: string; tool: string; links: Link[] }[] };
// Only links that loaded when checked are included. Tool names without links are from general knowledge; check versions.
export const STACKS: StackInfo[] = [
  { id: "dotnet", label: ".NET (C#)", blurb: "Microsoft.Extensions.AI abstractions, Azure OpenAI or Ollama, official C# MCP SDK. This is the curated path.",
    rows: [
      { layer: "LLM client and abstraction", tool: "Microsoft.Extensions.AI (IChatClient, IEmbeddingGenerator); Azure OpenAI or OllamaSharp", links: [{ title: "Microsoft.Extensions.AI libraries", url: "https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai" }, { title: "Chat with a local model", url: "https://learn.microsoft.com/dotnet/ai/quickstarts/chat-local-model" }] },
      { layer: "Structured output", tool: "JSON schema response format", links: [{ title: "Structured outputs with Azure OpenAI", url: "https://learn.microsoft.com/azure/ai-foundry/openai/how-to/structured-outputs" }] },
      { layer: "Vector store and RAG", tool: "Microsoft.Extensions.VectorData; in-memory, Azure AI Search or pgvector", links: [{ title: "Vector databases for .NET AI apps", url: "https://learn.microsoft.com/en-us/dotnet/ai/conceptual/vector-databases" }, { title: "Build a vector search app", url: "https://learn.microsoft.com/en-us/dotnet/ai/quickstarts/build-vector-search-app" }] },
      { layer: "Agents and tools", tool: "Hand-written loop first; then Microsoft Agent Framework", links: [{ title: "Agents (.NET AI)", url: "https://learn.microsoft.com/en-us/dotnet/ai/conceptual/agents" }] },
      { layer: "MCP", tool: "Official C# SDK (ModelContextProtocol)", links: [{ title: "C# MCP SDK", url: "https://github.com/modelcontextprotocol/csharp-sdk" }, { title: "Build an MCP server", url: "https://learn.microsoft.com/en-us/dotnet/ai/quickstarts/build-mcp-server" }] },
      { layer: "Evaluation and tests", tool: "xUnit with a fake model; Microsoft.Extensions.AI.Evaluation", links: [{ title: "AI evaluation libraries", url: "https://learn.microsoft.com/en-us/dotnet/ai/evaluation/libraries" }] },
      { layer: "Deploy and monitor", tool: "Docker; App Service or Container Apps; OpenTelemetry", links: [{ title: "Docker .NET guide", url: "https://docs.docker.com/guides/dotnet/" }, { title: ".NET observability with OpenTelemetry", url: "https://learn.microsoft.com/en-us/dotnet/core/diagnostics/observability-with-otel" }] },
    ] },
  { id: "mern", label: "MERN / Node (TypeScript)", blurb: "TypeScript end to end: AI SDK for model calls, Zod for schemas, official TypeScript MCP SDK, Vitest for tests.",
    rows: [
      { layer: "LLM client and abstraction", tool: "AI SDK by Vercel, or a provider SDK", links: [{ title: "AI SDK documentation", url: "https://ai-sdk.dev/docs" }] },
      { layer: "Structured output", tool: "Zod schemas with the AI SDK", links: [{ title: "Zod", url: "https://zod.dev" }] },
      { layer: "Vector store and RAG", tool: "pgvector on Postgres, or MongoDB Atlas vector search (no link verified)", links: [{ title: "pgvector", url: "https://github.com/pgvector/pgvector" }] },
      { layer: "Agents and tools", tool: "Hand-written loop first; AI SDK tool calling", links: [{ title: "AI SDK documentation", url: "https://ai-sdk.dev/docs" }] },
      { layer: "MCP", tool: "Official TypeScript SDK", links: [{ title: "TypeScript MCP SDK", url: "https://github.com/modelcontextprotocol/typescript-sdk" }] },
      { layer: "Evaluation and tests", tool: "Vitest with a fake model", links: [{ title: "Vitest", url: "https://vitest.dev" }] },
      { layer: "Deploy and monitor", tool: "Vercel or a container; OpenTelemetry for Node (no link verified)", links: [] },
    ] },
  { id: "java", label: "Java / Spring Boot", blurb: "Spring AI for models, vector stores and tool calling, or LangChain4j; official Java MCP SDK; JUnit for tests.",
    rows: [
      { layer: "LLM client and abstraction", tool: "Spring AI or LangChain4j", links: [{ title: "Spring AI", url: "https://spring.io/projects/spring-ai" }, { title: "Spring AI reference", url: "https://docs.spring.io/spring-ai/reference/" }, { title: "LangChain4j", url: "https://docs.langchain4j.dev/" }] },
      { layer: "Structured output", tool: "Spring AI structured output converters (check reference for your version)", links: [{ title: "Spring AI reference", url: "https://docs.spring.io/spring-ai/reference/" }] },
      { layer: "Vector store and RAG", tool: "Spring AI vector stores; pgvector", links: [{ title: "pgvector", url: "https://github.com/pgvector/pgvector" }] },
      { layer: "Agents and tools", tool: "Hand-written loop first; Spring AI tool calling", links: [{ title: "Spring AI reference", url: "https://docs.spring.io/spring-ai/reference/" }] },
      { layer: "MCP", tool: "Official Java SDK (also supported in Spring AI)", links: [{ title: "Java MCP SDK", url: "https://github.com/modelcontextprotocol/java-sdk" }] },
      { layer: "Evaluation and tests", tool: "JUnit 5 with a fake model", links: [{ title: "JUnit 5", url: "https://junit.org/junit5/" }] },
      { layer: "Deploy and monitor", tool: "Docker; your cloud of choice; Micrometer or OpenTelemetry (no link verified)", links: [] },
    ] },
  { id: "python", label: "Python", blurb: "Provider SDKs plus Pydantic schemas, official Python MCP SDK, pytest. Same layers, least ceremony.",
    rows: [
      { layer: "LLM client and abstraction", tool: "Provider SDK (OpenAI, Anthropic, Google) or Ollama", links: [{ title: "Ollama", url: "https://ollama.com" }] },
      { layer: "Structured output", tool: "Pydantic models as schemas (no link verified)", links: [] },
      { layer: "Vector store and RAG", tool: "pgvector or a local vector library", links: [{ title: "pgvector", url: "https://github.com/pgvector/pgvector" }] },
      { layer: "Agents and tools", tool: "Hand-written loop first; a framework after", links: [] },
      { layer: "MCP", tool: "Official Python SDK", links: [{ title: "Python MCP SDK", url: "https://github.com/modelcontextprotocol/python-sdk" }] },
      { layer: "Evaluation and tests", tool: "pytest with a fake model", links: [{ title: "pytest", url: "https://docs.pytest.org" }] },
      { layer: "Deploy and monitor", tool: "Docker; your cloud of choice; OpenTelemetry (no link verified)", links: [] },
    ] },
];
export const stackById = (id: string) => STACKS.find((s) => s.id === id) ?? STACKS[0];
