
import { NextResponse } from 'next/server';
import { getSupabaseRouteHandler } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import pino from 'pino';

const logger = pino();

export async function DELETE(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  const { conversationId } = params;
  const supabase = await getSupabaseRouteHandler(cookies);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // First, check if the user is a participant in the conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('id, buyer_id, seller_id')
      .eq('id', conversationId)
      .maybeSingle();

    if (conversationError) {
      logger.error({ err: conversationError, conversationId }, 'Error fetching conversation');
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.buyer_id !== user.id && conversation.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If the user is a participant, delete the conversation
    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (deleteError) {
      throw deleteError;
    }

    logger.info({ conversationId }, 'Conversation deleted successfully');
    return NextResponse.json({ message: 'Conversation deleted successfully' }, { status: 200 });
  } catch (error: any) {
    logger.error({ err: error, conversationId }, 'Error deleting conversation');
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
