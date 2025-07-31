"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MessageEncryption } from "@/lib/encryption";
import { useAuth } from "@/contexts/auth-context";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { ConversationListSkeleton } from "@/components/skeletons/conversations-skeleton";
import { ChatSkeleton } from "@/components/skeletons/chat-skeleton";
import Image from "next/image";
import { useSearchParams } from "next/navigation"; // Import useSearchParams

interface User {
  id: string;
  username: string;
  avatar_url: string;
}

interface Listing {
  id: string;
  title: string;
}

interface Conversation {
  id: string;
  encryption_key: string;
  seller: User;
  buyer: User;
  listing: Listing;
}

interface Message {
  id: string;
  encrypted_content: string;
  iv: string;
  sender_id: string;
  created_at: string;
}

async function fetchConversations() {
  const response = await fetch("/api/messages/conversations");
  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }
  return response.json();
}

// Modified fetchMessages to use Web Worker
async function fetchMessages(conversation: Conversation, worker: Worker): Promise<Message[]> {
  if (!conversation) return [];
  const response = await fetch(`/api/messages/${conversation.id}`);
  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }
  const data: Message[] = await response.json();

  const decryptedMessages: Message[] = [];
  const decryptionPromises: Promise<void>[] = [];

  for (const msg of data) {
    decryptionPromises.push(new Promise((resolve) => {
      const messageHandler = (event: MessageEvent) => {
        if (event.data.messageId === msg.id) {
          decryptedMessages.push({ ...msg, encrypted_content: event.data.decryptedContent });
          worker.removeEventListener('message', messageHandler);
          resolve();
        }
      };
      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        messageId: msg.id,
        encryptedContent: msg.encrypted_content,
        iv: msg.iv,
        encryptionKey: conversation.encryption_key,
      });
    }));
  }

  await Promise.all(decryptionPromises);
  return decryptedMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

async function sendMessage(
  conversationId: string,
  content: string,
): Promise<{ message: Message }> {
  const response = await fetch(`/api/messages/${conversationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    throw new Error("Failed to send message");
  }
  return response.json();
}

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const searchParams = useSearchParams();

  // Web Worker instance
  const decryptorWorker = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/message-decryptor.worker?worker')
        .then(({ default: WorkerConstructor }) => {
          decryptorWorker.current = new WorkerConstructor();
        })
        .catch(error => console.error("Failed to load worker:", error));
    }

    return () => {
      decryptorWorker.current?.terminate();
    };
  }, []);

  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: fetchConversations,
    enabled: !!user,
  });

  useEffect(() => {
    const conversationIdFromUrl = searchParams.get("conversationId");
    if (conversationIdFromUrl && conversations.length > 0) {
      const convoToSelect = conversations.find(
        (convo) => convo.id === conversationIdFromUrl,
      );
      if (convoToSelect) {
        setSelectedConversation(convoToSelect);
      }
    }
  }, [searchParams, conversations]);

  const {
    data: messages = [],
    isLoading: isLoadingMessages,
  } = useQuery<Message[]>({
    queryKey: ["messages", selectedConversation?.id],
    queryFn: () => selectedConversation && decryptorWorker.current ? fetchMessages(selectedConversation, decryptorWorker.current) : Promise.resolve([]),
    enabled: !!selectedConversation && !!decryptorWorker.current,
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ content }: { content: string }) => {
      if (!selectedConversation) throw new Error("No conversation selected");
      return sendMessage(selectedConversation.id, content);
    },
    onMutate: async ({ content }) => {
      if (!selectedConversation) return;
      await queryClient.cancelQueries({ queryKey: ["messages", selectedConversation.id] });
      const previousMessages = queryClient.getQueryData<Message[]>(["messages", selectedConversation.id]) || [];
      
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        encrypted_content: content,
        iv: "",
        sender_id: user?.id || "",
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(
        ["messages", selectedConversation.id],
        [...previousMessages, optimisticMessage],
      );

      return { previousMessages, optimisticMessage };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages && selectedConversation) {
        queryClient.setQueryData<Message[]>(
          ["messages", selectedConversation.id],
          context.previousMessages,
        );
      }
    },
    onSettled: () => {
      if (selectedConversation) {
        queryClient.invalidateQueries({ queryKey: ["messages", selectedConversation.id] });
      }
    },
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({ content: newMessage });
    setNewMessage("");
  };

  const renderConversationList = () => {
    if (isLoadingConversations) return <ConversationListSkeleton />;
    if (conversationsError) return <p className="text-red-500 p-4">{conversationsError.message}</p>;
    if (conversations.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">
            You have no conversations.
          </p>
        </div>
      );
    }

    return (
      <ul>
        {conversations.map((convo) => {
          const otherUser =
            user?.id === convo.seller.id ? convo.buyer : convo.seller;
          return (
            <li key={convo.id}>
              <button
                type="button"
                onClick={() => setSelectedConversation(convo)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedConversation(convo);
                  }
                }}
                className="w-full p-4 border-b cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
              >
                <div className="flex items-center">
                  <Image
                    src={otherUser.avatar_url || "/placeholder-user.jpg"}
                    alt={otherUser.username}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full mr-4"
                  />
                  <div>
                    <p className="font-semibold">{otherUser.username}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {convo.listing.title}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderChatView = () => {
    if (!selectedConversation) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">
            Select a conversation to start chatting
          </p>
        </div>
      );
    }

    if (isLoadingMessages) return <ChatSkeleton />;

    const otherUser =
      user?.id === selectedConversation.seller.id
        ? selectedConversation.buyer
        : selectedConversation.seller;
    return (
      <>
        <div className="p-4 border-b flex items-center">
          {!isDesktop && (
            <button
              type="button"
              onClick={() => setSelectedConversation(null)}
              className="mr-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              Back
            </button>
          )}
          <Image
            src={otherUser.avatar_url || "/placeholder-user.jpg"}
            alt={otherUser.username}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full mr-4"
          />
          <h2 className="text-xl font-bold">{otherUser.username}</h2>
        </div>
        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex mb-4 ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-md ${isMe ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}
                >
                  <p>{msg.encrypted_content}</p>
                  <p
                    className={`text-xs mt-1 ${isMe ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t bg-white dark:bg-black">
          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              disabled={!selectedConversation || sendMessageMutation.isPending}
            />
            <button type="submit" disabled={!selectedConversation || sendMessageMutation.isPending} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
              {sendMessageMutation.isPending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </>
    );
  };

  if (isDesktop) {
    return (
      <div className="px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex h-screen">
          <aside className="w-1/3 border-r dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold">Conversations</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderConversationList()}
            </div>
          </aside>
          <main className="w-2/3 flex flex-col">{renderChatView()}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <Link
        href="/dashboard"
        className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </Link>
      {selectedConversation ? (
        <div className="h-screen flex flex-col">{renderChatView()}</div>
      ) : (
        <div>
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold">Conversations</h2>
          </div>
          {renderConversationList()}
        </div>
      )}
    </div>
  );
}
