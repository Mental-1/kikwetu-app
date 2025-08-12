import React, { Suspense } from 'react';

const SellerProfile = React.lazy(() => import('@/components/seller/SellerProfile'));

const SellerPage = ({ params }: { params: { id: string } }) => {
  // In the future, we will fetch seller data here based on the id
  const seller = { id: params.id }; // Changed username to id

  return (
    <Suspense fallback={<div>Loading seller profile...</div>}>
      <SellerProfile seller={seller} />
    </Suspense>
  );
};

export default SellerPage;