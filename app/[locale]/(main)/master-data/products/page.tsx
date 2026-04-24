"use client";

import { Tag } from "antd";
import { Divider } from "antd";
import MasterDataTable from "@/modules/master-data/components/MasterDataTable";
import ProductCategoryForm from "@/modules/master-data/forms/ProductCategoryForm";
import ProductForm from "@/modules/master-data/forms/ProductForm";
import type { MasterDataConfig, ProductCategory, Product } from "@/types/master.types";

const categoryConfig: MasterDataConfig<ProductCategory> = {
  endpoint: "/api/master/product-categories",
  titleKey: "productCategories.title",
  columns: [
    { key: "name", dataIndex: "name", title: "Name" },
  ],
  FormComponent: ProductCategoryForm,
};

const productConfig: MasterDataConfig<Product> = {
  endpoint: "/api/master/products",
  titleKey: "products.title",
  columns: [
    { key: "name", dataIndex: "name", title: "Name", sorter: (a: Product, b: Product) => a.name.localeCompare(b.name) },
    {
      key: "sku",
      dataIndex: "sku",
      title: "SKU",
      sorter: (a: Product, b: Product) => a.sku?.localeCompare(b.sku ?? "") || 0,
      render: (v: string | null) => v ?? "—",
    },
    { key: "unit", dataIndex: "unit", title: "Unit", width: 100, sorter: (a: Product, b: Product) => a.unit?.localeCompare(b.unit ?? "") || 0 },
    {
      key: "category",
      title: "Category",
      width: 160,
      sorter: (a: Product, b: Product) => a.category?.name.localeCompare(b.category?.name ?? "") || 0,
      render: (_: unknown, record: Product) => record.category?.name ?? "—",
    },
  ],
  FormComponent: ProductForm,
};

export default function ProductsPage() {
  return (
    <div>
      <div>
        <MasterDataTable config={categoryConfig} tableType="category" />
      </div>
      <Divider style={{margin: "10px"}}/>
      <div>
        <MasterDataTable config={productConfig} tableType="product" />
      </div>
    </div>
  );
}
