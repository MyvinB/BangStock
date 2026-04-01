import ProductGrid from '@/components/ProductGrid'

export default function ShopPage() {
  return (
    <ProductGrid
      stockType="regular"
      title="BangStock"
      subtitle="Live Inventory"
      accentColor="indigo"
      linkHref="/deadstock"
      linkText="Deals →"
    />
  )
}
