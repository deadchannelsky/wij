/**
 * Chat Assistant Component
 * Uses NLUX library for chat UI, connects to /api/chat endpoint
 */

import React, { useCallback } from 'react';
import { AiChat, useAsStreamAdapter, StreamingAdapterObserver } from '@nlux/react';
import '@nlux/themes/nova.css';
import '../styles/chat.css';

export default function ChatAssistant() {
  /**
   * Adapter connects NLUX UI to the /api/chat endpoint
   * Uses StreamingAdapterObserver pattern to correctly parse SSE stream
   */
  const adapter = useAsStreamAdapter(
    useCallback(
      async (message: string, observer: StreamingAdapterObserver) => {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [], // In production, pass conversation history
              userMessage: message,
            }),
          });

          if (!response.ok) {
            throw new Error(`Chat failed: ${response.statusText}`);
          }

          // Parse SSE stream
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const lines = decoder.decode(value).split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const json = JSON.parse(line.slice(6));
                  if (json.type === 'text' && json.content) {
                    observer.next(json.content);
                  } else if (json.type === 'error') {
                    observer.next(`❌ Error: ${json.error}`);
                  } else if (json.type === 'tool_result') {
                    observer.next(`\n📌 ${json.toolName}: ${json.result}\n`);
                  }
                } catch {
                  // Ignore JSON parse errors on incomplete chunks
                }
              }
            }
          }

          observer.complete();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          observer.next(`❌ Connection error: ${errorMsg}`);
          observer.complete();
        }
      },
      []
    )
  );

  return (
    <div className="chat-assistant">
      <AiChat
        adapter={adapter}
        personaOptions={{
          assistant: {
            name: "Jason's Assistant",
            avatar: '🤖',
            tagline: 'Your scheduling & location expert',
          },
          user: {
            name: 'You',
            avatar: '👤',
          },
        }}
        conversationOptions={{
          layout: 'bubbles',
        }}
        displayOptions={{
          colorScheme: 'light',
          width: '100%',
          height: '100%',
        }}
        composerOptions={{
          placeholder: 'Ask about Jason\'s schedule or book a meeting...',
          autoFocus: true,
        }}
      />
    </div>
  );
}
