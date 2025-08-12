import React from 'react';
import { useSendMessage } from '@/hooks/useSendMessage';
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/components/ui/use-toast";

interface LazyMessageActionProps {
  sellerId: string;
  listingId?: string;
  renderButton: (onClick: () => void) => React.ReactNode;
}

const LazyMessageAction: React.FC<LazyMessageActionProps> = ({ sellerId, listingId, renderButton }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage } = useSendMessage({ sellerId, listingId });

  const handleSendMessage = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to send messages.",
        variant: "destructive",
      });
      return;
    }

    if (user.id === sellerId) {
      toast({
        title: "Cannot Message Yourself",
        description: "You cannot send a message to your own profile.",
        variant: "destructive",
      });
      return;
    }

    sendMessage();
  };

  return (
    <>
      {renderButton(handleSendMessage)}
    </>
  );
};

export default LazyMessageAction;
