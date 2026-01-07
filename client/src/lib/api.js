const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
    data = text;
  }

  if (!res.ok) {
    const err = new Error(
      data?.detail || data?.error || res.statusText || "Request failed"
    );
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data;
}

export async function healthCheck() {
  return request("/health");
}

export async function createChat(user_id, title = "New Chat") {
    return request("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, title }),
    });
}

export async function getChats(user_id) {
    return request(`/api/chats?user_id=${encodeURIComponent(user_id)}`);
}

export async function deleteChat(chat_id) {
    return request(`/api/chats/${encodeURIComponent(chat_id)}`, {
        method: "DELETE",
    });
}

export async function chat(query, chat_id, user_id) {
  return request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, chat_id, user_id }),
  });
}

export async function* chatStream(query, chatId, userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, chat_id: chatId, user_id: userId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // Normalize line endings to \n only
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      
      // Split by double newline (SSE message separator)
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;
        
        console.log("Stream Line (raw):", JSON.stringify(line));
        console.log("Starts with 'data: '?", line.startsWith("data: "));
        
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          console.log("Extracted data:", data);
          
          if (data === "[DONE]") {
            yield { done: true };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            console.log("Parsed SSE:", parsed);
            
            if (parsed.content && typeof parsed.content === 'string' && parsed.content.trim().startsWith('data: {')) {
              console.warn("Detected double-wrapped SSE, unwrapping...");
              try {
                const innerData = parsed.content.trim().slice(6).trim();
                const innerParsed = JSON.parse(innerData);
                console.log("Unwrapped inner data:", innerParsed);
                
                if (innerParsed.status) {
                  console.log("Yielding unwrapped status:", innerParsed.status);
                  yield { status: innerParsed.status };
                  continue;
                } else if (innerParsed.content) {
                  console.log("Yielding unwrapped content");
                  yield { content: innerParsed.content };
                } else if (innerParsed.error) {
                  yield { error: innerParsed.error, done: true };
                }
                continue;
              } catch (unwrapError) {
                console.error("Failed to unwrap, treating as normal content:", unwrapError);
              }
            }
            
            if (parsed.status) {
              console.log("Yielding status:", parsed.status);
              yield { status: parsed.status };
              continue;
            } else if (parsed.content) {
              console.log("Yielding content chunk");
              yield { content: parsed.content };
            } else if (parsed.error) {
              yield { error: parsed.error, done: true };
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e, "Raw data:", data);
          }
        } else {
          console.warn("Line does NOT start with 'data: ', treating as raw content:", line);
        }
      }
    }
    
    // Signal completion if we exit normally
    yield { done: true };
  } catch (error) {
    console.error("Stream error:", error);
    yield { error: error.message, done: true };
  }
}

export async function getHistory(chat_id) {
  return request(`/api/history/${encodeURIComponent(chat_id)}`);
}
