import Link from "next/link";
import { listAccounts } from "@/lib/data/accounts";
import { listCategories } from "@/lib/data/categories";
import { listTransactions } from "@/lib/data/transactions";
import { listReceivables, listPayables, listReimbursements, getIouSnapshot } from "@/lib/data/iou";
import { GroupExpenseForm } from "@/components/iou/group-expense-form";
import { PayableForm } from "@/components/iou/payable-form";
import { IouEntryRow } from "@/components/iou/iou-entry-row";
import { FlagReimbursementForm } from "@/components/iou/flag-reimbursement-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">IOU &amp; Reimbursements</h1>
        <Link href="/" className="text-muted-foreground text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <Card>
        <CardContent className="flex justify-between pt-6 text-sm">
          <span>
            Net owed to you: <span className="font-mono font-medium">₹{snapshot.netReceivable}</span>
          </span>
          <span>
            Net you owe: <span className="font-mono font-medium">₹{snapshot.netPayable}</span>
          </span>
        </CardContent>
      </Card>

      <Tabs defaultValue="receivables">
        <TabsList>
          <TabsTrigger value="receivables">Receivables ({receivables.length})</TabsTrigger>
          <TabsTrigger value="payables">Payables ({payables.length})</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements ({reimbursements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <GroupExpenseForm accounts={accounts} leisureCategories={leisureCategories} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Who owes you</CardTitle>
            </CardHeader>
            <CardContent>
              {receivables.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing yet.</p>
              ) : (
                receivables.map((e) => <IouEntryRow key={e.id} entry={e} accounts={accounts} settlementKind="iou_repayment" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Someone fronted an expense</CardTitle>
            </CardHeader>
            <CardContent>
              <PayableForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Who you owe</CardTitle>
            </CardHeader>
            <CardContent>
              {payables.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing yet.</p>
              ) : (
                payables.map((e) => <IouEntryRow key={e.id} entry={e} accounts={accounts} settlementKind="iou_settlement" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reimbursements" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Flag an expense</CardTitle>
            </CardHeader>
            <CardContent>
              <FlagReimbursementForm recentExpenses={plainExpenses} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pending reimbursements</CardTitle>
            </CardHeader>
            <CardContent>
              {reimbursements.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing yet.</p>
              ) : (
                reimbursements.map((e) => <IouEntryRow key={e.id} entry={e} accounts={accounts} settlementKind="iou_repayment" />)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
