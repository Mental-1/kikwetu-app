import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { MessageEncryption } from "@/lib/encryption";
import { z } from "zod";
import { cookies } from "next/headers";
import { logger } from "@/lib/utils/logger";


const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

/**
 * Handles sending a message to an existing conversation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  const reqId = request.headers.get("x-request-id") ?? undefined;
  const baseLog = logger.child({ route: "messages:POST", conversationId: params?.conversationId, reqId });
  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;
    const body = await request.json();
    const { content } = sendMessageSchema.parse(body);

    const log = baseLog.child({ senderId: user.id });

    // 1. Fetch the conversation and verify the user is part of it
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("encryption_key, buyer_id, seller_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (user.id !== conversation.buyer_id && user.id !== conversation.seller_id) {
      return NextResponse.json(
        { error: "You are not a part of this conversation" },
        { status: 403 },
      );
    }

    // 2. Encrypt the message content
    const key = await MessageEncryption.importKey(conversation.encryption_key);
    const { encrypted, iv } = await MessageEncryption.encrypt(content, key);

    // 3. Insert the new message into the database
    const { data: message, error: messageError } = await supabase
      .from("encrypted_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        encrypted_content: encrypted,
        iv: iv,
      })
      .select("id, created_at")
      .single();

    if (messageError) {
      log.error({ error: messageError }, "Error saving message");
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 },
      );
    }

    // 4. Return the newly created message (or just a success status)
    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: content, // Return the original content for optimistic updates
        sender_id: user.id,
        created_at: message.created_at,
      },
    });
  } catch (error) {
    baseLog.error({ error: error }, "Message API error");
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Retrieves all messages for a specific conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } },
) {
  const reqId = request.headers.get("x-request-id") ?? undefined;
  const baseLog = logger.child({ route: "messages:GET", conversationId: params?.conversationId, reqId });
  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = params;

    const log = baseLog.child({ userId: user.id });

    // 1. Verify the user is part of this conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("encryption_key, buyer_id, seller_id")
      .eq("id", conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 },
      );
    }

    if (user.id !== conversation.buyer_id && user.id !== conversation.seller_id) {
      return NextResponse.json(
        { error: "You are not a part of this conversation" },
        { status: 403 },
      );
    }

    // 2. Fetch all messages for this conversation
    const { data: encryptedMessages, error: messagesError } = await supabase
      .from("encrypted_messages")
      .select("id, encrypted_content, iv, sender_id, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      log.error({ error: messagesError }, "Error fetching messages");
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 },
      );
    }

    // 3. Return encrypted messages (frontend will decrypt them)
    return NextResponse.json(encryptedMessages || []);
  } catch (error) {
    baseLog.error({ error: error }, "Get messages API error");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
