import ProductGrid from '@/components/ProductGrid'

export default function DeadstockPage() {
  return (
    <ProductGrid
      stockType="deadstock"
      title='BangStock <span class="text-orange-500">Deals</span>'
      subtitle="Clearance Sale — Limited Stock"
      accentColor="orange"
      linkHref="/shop"
      linkText="View Regular →"
      whatsappSuffix=" (Clearance)"
    />
  )
}
