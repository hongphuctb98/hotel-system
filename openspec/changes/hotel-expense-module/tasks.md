## 1. Database Schema

- [x] 1.1 Add `ExpenseCategory` model to `prisma/schema.prisma`
- [x] 1.2 Add `ExpenseItem` model to `prisma/schema.prisma`
- [x] 1.3 Add `ExpenseDocumentType` enum (SERVICE, INVENTORY, INVENTORY_ADJUSTMENT) to `prisma/schema.prisma`
- [x] 1.4 Add `ExpenseDocument` model
- [x] 1.5 Add `ServiceExpenseLine` model
- [x] 1.6 Add `InventoryReceiptLine` model
- [x] 1.7 Add back-relations to existing models
- [x] 1.8 Run `npm run db:generate` to generate Prisma client
- [x] 1.9 Run `npm run db:migrate` to create the migration

## 2. Seed Data

- [x] 2.1 Add `ExpenseCategory` upserts to `prisma/seed.ts`
- [x] 2.2 Add `ExpenseItem` upserts with correct `categoryId` FK and recurring-bill flags

## 3. Permissions & Navigation

- [x] 3.1 Add `EXPENSES_VIEW`, `EXPENSES_CREATE`, `EXPENSES_EDIT`, `EXPENSES_DELETE` to `common/constants/permissions.ts`
- [x] 3.2 Grant all four to ADMIN and MANAGER in `ROLE_PERMISSIONS`
- [x] 3.3 Add `FINANCE_VIEW` permission constant; grant to ADMIN and MANAGER
- [x] 3.4 Add expenses navigation entry in `configs/navigation.config.ts` (MANAGER/ADMIN)
- [x] 3.5 Add finance navigation entry in `configs/navigation.config.ts` (MANAGER/ADMIN)
- [x] 3.6 Add route constants `/expenses` and `/finance` to `common/constants/routes.ts`

## 4. i18n Strings

- [x] 4.1 Add expense and finance keys to `messages/en.json`
- [x] 4.2 Mirror all keys to `messages/vi.json` with Vietnamese translations

## 5. Expense Category API

- [x] 5.1 Create `app/api/master/expense-categories/route.ts`
- [x] 5.2 Create `app/api/master/expense-categories/[id]/route.ts`
- [x] 5.3 Add `expenseCategories` to `common/services/masterDataService.ts`

## 6. Expense Item API

- [x] 6.1 Create `app/api/master/expense-items/route.ts`
- [x] 6.2 Create `app/api/master/expense-items/[id]/route.ts`
- [x] 6.3 Add `expenseItems` to `common/services/masterDataService.ts`

## 7. Expense Document API

- [x] 7.1 Create `app/api/expense-documents/route.ts`
- [x] 7.2 Create `app/api/expense-documents/[id]/route.ts`
- [x] 7.3 Create `app/api/expense-documents/summary/route.ts`
- [x] 7.4 Create `app/api/expense-documents/vendors/route.ts`
- [x] 7.5 Create `common/services/expenseDocumentService.ts`

## 8. Expense Category Master Data UI

- [x] 8.1 Create `MasterDataConfig<ExpenseCategory>` config with columns and `ExpenseCategoryForm` component
- [x] 8.2 Create `app/[locale]/(main)/master-data/expense-categories/page.tsx`
- [x] 8.3 Add expense-categories entry to master-data navigation (ADMIN only)

## 9. Expense Item Master Data UI

- [x] 9.1 Create `MasterDataConfig<ExpenseItem>` config with columns
- [x] 9.2 Create `ExpenseItemForm` component
- [x] 9.3 Create `app/[locale]/(main)/master-data/expense-items/page.tsx`
- [x] 9.4 Add expense-items entry to master-data navigation (ADMIN only)

## 10. Expense Module — Hooks

- [x] 10.1 Create `modules/expenses/hooks/useExpenseItems.ts`
- [x] 10.2 Create `modules/expenses/hooks/useRecurringExpenseItems.ts`
- [x] 10.3 Create `modules/expenses/hooks/useExpenseDocuments.ts`
- [x] 10.4 Create `modules/expenses/hooks/useExpenseDocument.ts`
- [x] 10.5 Create `modules/expenses/hooks/useExpenseDocumentMutations.ts`
- [x] 10.6 Create `modules/expenses/hooks/useVendorSuggestions.ts`

## 11. Expense Module — Drawer Components

- [x] 11.1 Create `modules/expenses/components/TypeSelector.tsx`
- [x] 11.2 Create `modules/expenses/components/DocumentHeaderFields.tsx`
- [x] 11.3 Create `modules/expenses/components/ServiceLinesEditor.tsx`
- [x] 11.4 Create `modules/expenses/components/InventoryLinesEditor.tsx`
- [x] 11.5 Create `modules/expenses/components/DocumentTotalFooter.tsx`
- [x] 11.6 Create `modules/expenses/components/ExpenseDocumentDrawer.tsx`
- [x] 11.7 Create `modules/expenses/components/StockConflictModal.tsx`

## 12. Expense Module — List Components

- [x] 12.1 Create `modules/expenses/components/RecurringBillsPanel.tsx`
- [x] 12.2 Create `modules/expenses/components/ExpenseDocumentFilters.tsx`
- [x] 12.3 Create `modules/expenses/components/ExpenseDocumentTable.tsx`

## 13. Expense Page

- [x] 13.1 Create `app/[locale]/(main)/expenses/page.tsx`

## 14. Finance Summary — Hooks

- [x] 14.1 Create `modules/finance/hooks/useRevenueSummary.ts`
- [x] 14.2 Create `modules/finance/hooks/useExpenseSummaryQuery.ts`
- [x] 14.3 Create `modules/finance/hooks/useFinanceSummary.ts`

## 15. Finance Summary — UI Components

- [x] 15.1 Create `modules/finance/components/FinanceKpiCards.tsx`
- [x] 15.2 Create `modules/finance/components/ServiceExpenseBreakdown.tsx`
- [x] 15.3 Create `modules/finance/components/InventoryBreakdown.tsx`
- [x] 15.4 Create `modules/finance/components/PeriodSelector.tsx`

## 16. Finance Summary Page

- [x] 16.1 Create `app/[locale]/(main)/finance/page.tsx`

## 17. Dashboard Integration

- [x] 17.1 Create `modules/dashboard/components/NetProfitCard.tsx`
- [x] 17.2 Add `NetProfitCard` to the existing dashboard page layout
