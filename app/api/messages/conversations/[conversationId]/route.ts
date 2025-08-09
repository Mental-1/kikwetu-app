
import { NextResponse } from 'next/server';
import { getSupabaseRouteHandler } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function DELETE(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  const { conversationId } = params;
  const supabase = await getSupabaseRouteHandler(cookies);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    // First, check if the user is a participant in the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, buyer_id, seller_id')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return new NextResponse(JSON.stringify({ error: 'Conversation not found' }), { status: 404 });
    }

    if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    // If the user is a participant, delete the conversation
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (deleteError) {
      throw deleteError;
    }

    console.log(`Conversation ${conversationId} deleted successfully`);

    return new NextResponse(JSON.stringify({ message: 'Conversation deleted successfully' }), { status: 200 });
  } catch (error: any) {
    console.error('Error deleting conversation:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
