"use client";

import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import ProductCategoryForm from "@/modules/master-data/forms/ProductCategoryForm";
import type { MasterDataConfig, ProductCategory } from "@/types/master.types";

const config: MasterDataConfig<ProductCategory> = {
  endpoint: "/api/master/product-categories",
  titleKey: "productCategories.title",
  columns: [
    { key: "name", dataIndex: "name", title: "Name" },
  ],
  FormComponent: ProductCategoryForm,
};

export default function ProductCategoriesPage() {
  return <MasterDataTable config={config} />;
}
