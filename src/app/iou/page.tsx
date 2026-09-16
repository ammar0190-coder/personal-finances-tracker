import { AppShell } from "@/components/shell/app-shell";
import { SECTION_LABEL } from "@/components/shell/section";
import { listAccounts } from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { listReceivables, listPayables, listReimbursements, getIouSnapshot } from "@/lib/data/iou";
import { GroupExpenseForm } from "@/components/iou/group-expense-form";
import { PayableForm } from "@/components/iou/payable-form";
import { IouEntryRow } from "@/components/iou/iou-entry-row";
import { FlagReimbursementForm } from "@/components/iou/flag-reimbursement-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatMoney } from "@/lib/ledger/format";

/** PRD §7: kept as a fully separate module from the Expense Log. */
export default async function IouPage() {
  const [accounts, categories, expenses, receivables, payables, reimbursements, snapshot] = await Promise.all([
    listAccounts(),
    listCategories({ kind: "expense" }),
    listTransactions({ limit: 30 }),
    listReceivables(),
    listPayables(),
    listReimbursements(),
    getIouSnapshot(),
  ]);

  const leisureCategories = categories.filter((c) => c.name === "Leisure" || !c.parent_id);
  const plainExpenses = expenses.filter((t) => t.type === "expense");

  return (
    <AppShell title="IOU &amp; Reimbursements">

      {/* A position, not a period figure — what stands right now, with
          written-off entries excluded (PRD §7). */}
      <section aria-label="Net position" className="flex items-center gap-8 border-y border-border py-4">
        <div className="flex flex-col gap-1">
          <span className={SECTION_LABEL}>Owed to you</span>
          <span aria-label="Net owed to you" className="text-lg tabular-nums">
            {formatMoney(snapshot.netReceivable)}
          </span>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex flex-col gap-1">
          <span className={SECTION_LABEL}>You owe</span>
          <span aria-label="Net you owe" className="text-lg tabular-nums">
            {formatMoney(snapshot.netPayable)}
          </span>
        </div>
      </section>

      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">Receivables ({receivables.length})</TabsTrigger>
          <TabsTrigger value="payables">Payables ({payables.length})</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements ({reimbursements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="flex flex-col gap-8 pt-6">
          <section aria-label="Group Expense" className="flex flex-col">
            <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Group Expense</h2>
            <div className="pt-4">
              <GroupExpenseForm accounts={accounts} leisureCategories={leisureCategories} />
            </div>
          </section>
          <section aria-label="Who owes you" className="flex flex-col">
            <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Who owes you</h2>
            <div className="pt-4">
              {receivables.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              ) : (
                receivables.map((e) => <IouEntryRow key={e.id} entry={e} accounts={accounts} settlementKind="iou_repayment" />)
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="payables" className="flex flex-col gap-8 pt-6">
          <section aria-label="Someone fronted an expense" className="flex flex-col">
            <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Someone fronted an expense</h2>
            <div className="pt-4">
              <PayableForm />
            </div>
          </section>
          <section aria-label="Who you owe" className="flex flex-col">
            <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Who you owe</h2>
            <div className="pt-4">
              {payables.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              ) : (
                payables.map((e) => <IouEntryRow key={e.id} entry={e} accounts={accounts} settlementKind="iou_settlement" />)
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="reimbursements" className="flex flex-col gap-8 pt-6">
          <section aria-label="Flag an expense" className="flex flex-col">
            <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Flag an expense</h2>
            <div className="pt-4">
              <FlagReimbursementForm recentExpenses={plainExpenses} />
            </div>
          </section>
          <section aria-label="Pending reimbursements" className="flex flex-col">
            <h2 className={`${SECTION_LABEL} border-b border-border pb-3`}>Pending reimbursements</h2>
            <div className="pt-4">
              {reimbursements.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              ) : (
                reimbursements.map((e) => <IouEntryRow key={e.id} entry={e} accounts={accounts} settlementKind="iou_repayment" />)
              )}
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
