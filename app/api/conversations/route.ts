import { NextRequest, NextResponse } from "next/server";
import { getSupabaseRouteHandler } from "@/utils/supabase/server";
import { MessageEncryption } from "@/lib/encryption";
import { z } from "zod";
import { cookies } from "next/headers";

const createConversationSchema = z.object({
  listingId: z.string().uuid(),
  sellerId: z.string().uuid(),
});

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
    const { listingId, sellerId } = createConversationSchema.parse(body);

    const buyerId = user.id;

    if (buyerId === sellerId) {
      return NextResponse.json(
        { error: "Cannot create a conversation with yourself" },
        { status: 400 },
      );
    }

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

    return NextResponse.json({ success: true, conversationId: conversation.id });
  } catch (error) {
    console.error("Conversation API error:", error);
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
