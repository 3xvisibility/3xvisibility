import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type WebsiteType = Database["public"]["Enums"]["website_type"];

interface SiteTypeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function SiteTypeFilter({ value, onChange }: SiteTypeFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="All platforms" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All platforms</SelectItem>
        <SelectItem value="wordpress">WordPress</SelectItem>
        <SelectItem value="shopify">Shopify</SelectItem>
        <SelectItem value="prestashop">PrestaShop</SelectItem>
        <SelectItem value="woocommerce">WooCommerce</SelectItem>
      </SelectContent>
    </Select>
  );
}
