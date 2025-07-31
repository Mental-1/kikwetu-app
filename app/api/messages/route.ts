import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { MessageEncryption } from "@/lib/encryption";
import { z } from "zod";
import { cookies } from "next/headers";

const sendMessageSchema = z.object({
  listingId: z.string().uuid(),
  recipientId: z.string().uuid(),
  content: z.string().min(1).max(1000),
});

/**
 * Handles sending an encrypted message related to a listing.
 *
 * Authenticates the user, validates the request body, determines conversation roles, and ensures a conversation exists with an associated encryption key. Encrypts the message content and stores it in the database. Returns a success response with the new message ID or an appropriate error status.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId, recipientId, content } = sendMessageSchema.parse(body);

    // Get listing to determine buyer/seller roles
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("user_id")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      console.error("Error fetching listing:", listingError);
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const isSeller = listing.user_id === user.id;
    const buyerId = isSeller ? recipientId : user.id;
    const sellerId = isSeller ? user.id : recipientId;

    let { data: conversation, error: conversationFetchError } = await supabase
      .from("conversations")
      .select("*")
      .eq("listing_id", listingId)
      .eq("buyer_id", buyerId)
      .eq("seller_id", sellerId)
      .single();

    if (conversationFetchError && conversationFetchError.code !== "PGRST116") {
      console.error("Error fetching conversation:", conversationFetchError);
      return NextResponse.json(
        { error: "Failed to fetch conversation" },
        { status: 500 },
      );
    }

    if (!conversation) {
      const encryptionKey = await MessageEncryption.generateKey();
      const exportedKey = await MessageEncryption.exportKey(encryptionKey);

      const { data: newConversation, error: newConversationError } =
        await supabase
          .from("conversations")
          .insert({
            listing_id: listingId,
            buyer_id: buyerId,
            seller_id: sellerId,
            encryption_key: exportedKey,
          })
          .select()
          .single();

      if (newConversationError || !newConversation) {
        console.error("Error creating new conversation:", newConversationError);
        return NextResponse.json(
          { error: "Failed to create conversation" },
          { status: 500 },
        );
      }
      conversation = newConversation;
    }

    const key = await MessageEncryption.importKey(conversation.encryption_key);
    const { encrypted, iv } = await MessageEncryption.encrypt(content, key);

    const { data: message, error } = await supabase
      .from("encrypted_messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        encrypted_content: encrypted,
        iv: iv,
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving message:", error);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error("Message API error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: z.treeifyError(error) },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Retrieves and decrypts all messages for a specified conversation if the authenticated user is a participant.
 *
 * Returns a JSON response containing an array of decrypted messages with metadata, or appropriate error responses for unauthorized access, missing parameters, or not found conversations.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseRouteHandler(cookies);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 },
      );
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (conversationError) {
      console.error("Error fetching conversation for GET:", conversationError);
      return NextResponse.json(
        { error: "Failed to retrieve conversation" },
        { status: 500 },
      );
    }

    if (
      !conversation ||
      (conversation.buyer_id !== user.id && conversation.seller_id !== user.id)
    ) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 },
      );
    }

    const { data: encryptedMessages, error: messagesError } = await supabase
      .from("encrypted_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Error fetching encrypted messages:", messagesError);
      return NextResponse.json(
        { error: "Failed to retrieve messages" },
        { status: 500 },
      );
    }

    if (!encryptedMessages) {
      return NextResponse.json({ messages: [] });
    }

    const key = await MessageEncryption.importKey(conversation.encryption_key);
    const messages = await Promise.all(
      encryptedMessages.map(async (msg) => {
        const decryptedContent = await MessageEncryption.decrypt(
          msg.encrypted_content,
          msg.iv,
          key,
        );
        return {
          id: msg.id,
          senderId: msg.sender_id,
          content: decryptedContent,
          createdAt: msg.created_at,
          readAt: msg.read_at,
        };
      }),
    );

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
