'use client';

import { useToast } from "@/hooks/use-toast";
import { Listing } from "@/lib/types/listing";
import { approveListing, rejectListing } from "@/app/admin/listings/actions";

const ListingActions = ({ listing }: { listing: Listing }) => {
  const { toast } = useToast();

  const handleApprove = async (formData: FormData) => {
    const result = await approveListing(formData);
    if (result && "error" in result) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else if (result && "success" in result) {
      toast({
        title: "Success",
        description: result.success,
      });
    }
  };

  const handleReject = async (formData: FormData) => {
    const result = await rejectListing(formData);
    if (result && "error" in result) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else if (result && "success" in result) {
      toast({
        title: "Success",
        description: result.success,
      });
    }
  };

  return (
    <div className="flex gap-2">
      <form action={handleApprove}>
        <input type="hidden" name="id" value={listing.id} />
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded"
        >
          Approve
        </button>
      </form>
      <form action={handleReject}>
        <input type="hidden" name="id" value={listing.id} />
        <button
          type="submit"
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded"
        >
          Reject
        </button>
      </form>
    </div>
  );
};

export default ListingActions;
