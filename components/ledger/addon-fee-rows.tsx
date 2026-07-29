'use client';

import { Bill, Member, Product, getMemberClass, getProductPrice } from '@/lib/types';

interface AddonFeeRowsProps {
  products: Product[];
  bill: Bill;
  member: Member | undefined;
  /** checkout summary ใช้ getProductPrice, return summary ใช้ priceIn ตรงๆ */
  variant: 'checkout' | 'return';
}

export function AddonFeeRows({ products, bill, member, variant }: AddonFeeRowsProps) {
  const memberClass = getMemberClass(member);
  const showHouse = memberClass === 'In' && member?.statusIn?.house;
  const showCar = memberClass === 'In' && member?.statusIn?.car;

  const houseProd = products.find((p) => p.type === 'House');
  const carProd = products.find((p) => p.type === 'Car');
  const dProduct = products.find((p) => p.type === 'D');
  const dItem = dProduct ? bill.items.find((item) => item.productId === dProduct.id) : null;
  const dQuantity = dItem?.totalStock || 0;

  const getHousePrice = () =>
    variant === 'checkout'
      ? getProductPrice(houseProd!, member)
      : houseProd!.priceIn;

  const getCarPrice = () =>
    variant === 'checkout' ? getProductPrice(carProd!, member) : carProd!.priceIn;

  const getDryIcePrice = () => {
    if (variant === 'checkout') return getProductPrice(dProduct!, member);
    if (memberClass === 'Out') return dProduct!.priceOut || 0;
    if (memberClass === 'WalkIn') return dProduct!.priceWalkIn || 0;
    return dProduct!.priceIn || 0;
  };

  return (
    <>
      {showHouse && houseProd && (
        <div className="flex justify-between items-center pt-2 border-t border-dashed border-border">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            🏠 <span>แพ็กเกจบ้าน</span>
          </span>
          <span className="text-sm font-semibold text-chart-2">
            +{getHousePrice().toLocaleString()} บาท
          </span>
        </div>
      )}

      {showCar && carProd && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            🚗 <span>แพ็กเกจรถ</span>
          </span>
          <span className="text-sm font-semibold text-chart-2">
            +{getCarPrice().toLocaleString()} บาท
          </span>
        </div>
      )}

      {dProduct && (variant === 'return' || dQuantity > 0) && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            🧊{' '}
            <span>
              น้ำแข็งแห้ง {getDryIcePrice()}
              {variant === 'return' ? ' * ' : ' × '}
              {dQuantity}
            </span>
          </span>
          <span className="text-sm font-semibold text-chart-2">
            +{(getDryIcePrice() * dQuantity).toLocaleString()} บาท
          </span>
        </div>
      )}
    </>
  );
}
