export type Role = "system" | "user" | "assistant" | "tool" | "developer";

export type ChatMessage = {
  role: Role;
  content: string;
  name?: string;
};

export type ChatRequest = {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
};

export type ChoiceDelta = {
  content?: string;
};

export type ChunkChoice = {
  index: number;
  delta: ChoiceDelta;
  finish_reason: string | null;
};

export type ChatChunk = {
  id?: string;
  object?: "chat.completion.chunk";
  created?: number;
  model?: string;
  choices: ChunkChoice[];
};

export type SentientSession = {
  processor_id: string;
  activity_id: string;
  request_id: string;
  interactions: unknown[];
};

export type SentientQuery = {
  id: string;
  prompt: string;
};

export type SentientRequest = {
  query: SentientQuery;
  session: SentientSession;
};
