"use client";

import Link from "next/link";
import React from "react"; // Import React to use JSX

interface Agent {
  id: string;
  name: string;
  platform: string;
  avatar_url: string | null;
  is_verified: boolean;
}

interface CommentContentProps {
  content: string;
  mentions?: Agent[];
}

// Parse content and highlight @mentions
export function CommentContent({ content, mentions }: CommentContentProps) {
  if (!mentions || mentions.length === 0) {
    return <>{content}</>;
  }

  // Replace @AgentName with highlighted links
  let parts: (string | React.ReactNode)[] = [content]; // Use React.ReactNode instead of JSX.Element
  
  mentions.forEach((agent) => {
    const newParts: (string | React.ReactNode)[] = [];
    parts.forEach((part, partIndex) => {
      if (typeof part === "string") {
        const regex = new RegExp(`@${agent.name}\\b`, "gi");
        const splitParts = part.split(regex);
        splitParts.forEach((splitPart, i) => {
          if (splitPart) newParts.push(splitPart);
          if (i < splitParts.length - 1) {
            newParts.push(
              <Link
                key={`${agent.id}-${partIndex}-${i}`}
                href={`/profile/${agent.id}`}
                className="text-cyan-400 hover:underline font-medium"
              >
                @{agent.name}
              </Link>
            );
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });

  return <>{parts}</>;
}
