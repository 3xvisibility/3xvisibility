import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, FolderTree, Tag, DollarSign, Globe, Palette } from "lucide-react";

interface Product {
  name: string;
  price: number | string;
  description?: string;
  category?: string;
  image?: string;
  seo_title?: string;
  seo_description?: string;
}

interface Category {
  name: string;
  description?: string;
}

interface StorePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  niche: string;
  categories: Category[];
  products: Product[];
  tone?: string;
  language?: string;
}

export default function StorePreviewDialog({
  open,
  onOpenChange,
  niche,
  categories,
  products,
  tone,
  language,
}: StorePreviewDialogProps) {
  const grouped: Record<string, Product[]> = {};
  for (const p of products) {
    const cat = p.category || "Uncategorized";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Store Header */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 px-6 py-5 border-b border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{niche} Store</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FolderTree className="h-3 w-3" />
              {categories.length} categories
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {products.length} products
            </span>
            {tone && (
              <span className="flex items-center gap-1">
                <Palette className="h-3 w-3" />
                {tone}
              </span>
            )}
            {language && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {language.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Store Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Category Navigation */}
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground mb-2">Categories</p>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat, i) => (
                <Badge key={i} variant="secondary" className="text-xs cursor-default">
                  {cat.name}
                  <span className="ml-1 text-muted-foreground">
                    ({grouped[cat.name]?.length || 0})
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Products by Category */}
          <div className="px-6 py-4 space-y-6">
            {Object.entries(grouped).map(([catName, catProducts]) => (
              <div key={catName}>
                <div className="flex items-center gap-2 mb-3">
                  <FolderTree className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{catName}</h3>
                  <span className="text-xs text-muted-foreground">({catProducts.length})</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {catProducts.map((product, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-background overflow-hidden hover:shadow-md transition-shadow group"
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-muted relative overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-2.5 space-y-1">
                        <h4 className="text-xs font-medium leading-tight line-clamp-2">
                          {product.name}
                        </h4>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">
                            ${Number(product.price).toFixed(2)}
                          </span>
                        </div>
                        {product.seo_title && (
                          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                            <Tag className="h-2.5 w-2.5 shrink-0" />
                            {product.seo_title}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="mt-4" />
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
