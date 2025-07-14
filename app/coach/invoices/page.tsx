"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, FileText, Download, Pencil, ChevronDown } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase, type Invoice, type User } from "@/lib/supabase"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "@/hooks/use-toast" // Corrected import path

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<User[]>([])
  const [userId, setUserId] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [newInvoice, setNewInvoice] = useState({
    client_id: "",
    sessions: 0,
    pricePerSession: 50,
    dueDate: "",
  })
  const [editedAmount, setEditedAmount] = useState<number>(0)

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadInvoices(id)
      loadClients()
    }
  }, [])

  const loadInvoices = async (coachId: string) => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          `
          *,
          client:users!invoices_client_id_fkey(name)
        `,
        )
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setInvoices(data || [])
    } catch (error) {
      console.error("Error loading invoices:", error)
      toast({
        title: "Error",
        description: "Failed to load invoices.",
        variant: "destructive",
      })
    }
  }

  const loadClients = async () => {
    try {
      const { data, error } = await supabase.from("users").select("id, name").eq("role", "client").order("name")

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error("Error loading clients:", error)
      toast({
        title: "Error",
        description: "Failed to load clients for invoice creation.",
        variant: "destructive",
      })
    }
  }

  const handleCreateInvoice = async () => {
    if (!newInvoice.client_id || !newInvoice.sessions || !newInvoice.dueDate || !userId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("invoices")
        .insert([
          {
            coach_id: userId,
            client_id: newInvoice.client_id,
            amount: newInvoice.sessions * newInvoice.pricePerSession,
            sessions_count: newInvoice.sessions,
            status: "Pending",
            due_date: newInvoice.dueDate,
          },
        ])
        .select(
          `
            *,
            client:users!invoices_client_id_fkey(name)
          `,
        )
        .single()

      if (error) throw error

      setInvoices([data, ...invoices])
      setNewInvoice({ client_id: "", sessions: 0, pricePerSession: 50, dueDate: "" })
      setIsCreateDialogOpen(false)
      toast({
        title: "Success!",
        description: "Invoice created successfully.",
      })
    } catch (error: any) {
      console.error("Error creating invoice:", error)
      toast({
        title: "Error",
        description: `Failed to create invoice: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: newStatus, paid_date: newStatus === "Paid" ? new Date().toISOString() : null })
        .eq("id", invoiceId)

      if (error) throw error

      setInvoices(
        invoices.map((inv) =>
          inv.id === invoiceId
            ? {
                ...inv,
                status: newStatus as Invoice["status"],
                paid_date: newStatus === "Paid" ? new Date().toISOString() : null,
              }
            : inv,
        ),
      )
      toast({
        title: "Success!",
        description: `Invoice status updated to ${newStatus}.`,
      })
    } catch (error: any) {
      console.error("Error updating invoice status:", error)
      toast({
        title: "Error",
        description: `Failed to update invoice status: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setEditedAmount(invoice.amount)
    setIsEditDialogOpen(true)
  }

  const handleSaveEditedInvoice = async () => {
    if (!editingInvoice) return

    try {
      const { data, error } = await supabase
        .from("invoices")
        .update({ amount: editedAmount })
        .eq("id", editingInvoice.id)
        .select()
        .single()

      if (error) throw error

      setInvoices(invoices.map((inv) => (inv.id === data.id ? data : inv)))
      setIsEditDialogOpen(false)
      setEditingInvoice(null)
      toast({
        title: "Success!",
        description: "Invoice amount updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating invoice amount:", error)
      toast({
        title: "Error",
        description: `Failed to update invoice amount: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "Overdue":
        return "bg-red-100 text-red-800"
      case "Cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return ""
    }
  }

  const totalPaid = invoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + inv.amount, 0)
  const totalPending = invoices.filter((inv) => inv.status === "Pending").reduce((sum, inv) => sum + inv.amount, 0)
  const totalOverdue = invoices.filter((inv) => inv.status === "Overdue").reduce((sum, inv) => sum + inv.amount, 0)

  const pendingInvoices = invoices.filter((inv) => inv.status === "Pending")
  const paidInvoices = invoices.filter((inv) => inv.status === "Paid")
  const overdueInvoices = invoices.filter((inv) => inv.status === "Overdue")
  const cancelledInvoices = invoices.filter((inv) => inv.status === "Cancelled")

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2">Manage billing and payments for your clients</p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>Generate an invoice for your client's training sessions</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select onValueChange={(value) => setNewInvoice({ ...newInvoice, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessions">Number of Sessions</Label>
                  <Input
                    id="sessions"
                    type="number"
                    value={newInvoice.sessions}
                    onChange={(e) => setNewInvoice({ ...newInvoice, sessions: Number.parseInt(e.target.value) })}
                    placeholder="8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pricePerSession">Price per Session ($)</Label>
                  <Input
                    id="pricePerSession"
                    type="number"
                    value={newInvoice.pricePerSession}
                    onChange={(e) => setNewInvoice({ ...newInvoice, pricePerSession: Number.parseInt(e.target.value) })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                  />
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount:</span>
                    <span className="text-lg font-bold">${newInvoice.sessions * newInvoice.pricePerSession}</span>
                  </div>
                </div>
                <Button onClick={handleCreateInvoice} className="w-full">
                  Create Invoice
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-green-600">${totalPaid}</div>
              <p className="text-sm text-gray-600">Total Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">${totalPending}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">${totalOverdue}</div>
              <p className="text-sm text-gray-600">Overdue</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">{invoices.length}</div>
              <p className="text-sm text-gray-600">Total Invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Grouped by Status */}
        <div className="space-y-6">
          {/* Pending Invoices */}
          {pendingInvoices.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="w-full flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mb-4">
                <h2 className="text-xl font-bold text-yellow-700">Pending Invoices ({pendingInvoices.length})</h2>
                <ChevronDown className="h-5 w-5 text-gray-600 data-[state=open]:rotate-180 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 px-2 pb-4">
                {pendingInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">{invoice.client?.name || "N/A"}</p>
                        <p className="text-sm text-gray-600">
                          {invoice.sessions_count} sessions • Created{" "}
                          {new Date(invoice.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${invoice.amount}</p>
                        <p className="text-sm text-gray-600">
                          Due {new Date(invoice.due_date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <Select value={invoice.status} onValueChange={(value) => handleStatusChange(invoice.id, value)}>
                        <SelectTrigger className={`w-[120px] ${getStatusColorClass(invoice.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => handleEditInvoice(invoice)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Paid Invoices */}
          {paidInvoices.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="w-full flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mb-4">
                <h2 className="text-xl font-bold text-green-700">Paid Invoices ({paidInvoices.length})</h2>
                <ChevronDown className="h-5 w-5 text-gray-600 data-[state=open]:rotate-180 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 px-2 pb-4">
                {paidInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">{invoice.client?.name || "N/A"}</p>
                        <p className="text-sm text-gray-600">
                          {invoice.sessions_count} sessions • Paid{" "}
                          {new Date(invoice.paid_date || "").toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${invoice.amount}</p>
                        <p className="text-sm text-gray-600">
                          Due {new Date(invoice.due_date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <Select value={invoice.status} onValueChange={(value) => handleStatusChange(invoice.id, value)}>
                        <SelectTrigger className={`w-[120px] ${getStatusColorClass(invoice.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => handleEditInvoice(invoice)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Overdue Invoices */}
          {overdueInvoices.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="w-full flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mb-4">
                <h2 className="text-xl font-bold text-red-700">Overdue Invoices ({overdueInvoices.length})</h2>
                <ChevronDown className="h-5 w-5 text-gray-600 data-[state=open]:rotate-180 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 px-2 pb-4">
                {overdueInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">{invoice.client?.name || "N/A"}</p>
                        <p className="text-sm text-gray-600">
                          {invoice.sessions_count} sessions • Created{" "}
                          {new Date(invoice.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${invoice.amount}</p>
                        <p className="text-sm text-gray-600">
                          Due {new Date(invoice.due_date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <Select value={invoice.status} onValueChange={(value) => handleStatusChange(invoice.id, value)}>
                        <SelectTrigger className={`w-[120px] ${getStatusColorClass(invoice.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => handleEditInvoice(invoice)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Cancelled Invoices */}
          {cancelledInvoices.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="w-full flex justify-between items-center p-4 bg-white rounded-lg shadow-sm mb-4">
                <h2 className="text-xl font-bold text-gray-700">Cancelled Invoices ({cancelledInvoices.length})</h2>
                <ChevronDown className="h-5 w-5 text-gray-600 data-[state=open]:rotate-180 transition-transform" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 px-2 pb-4">
                {cancelledInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                    <div className="flex items-center gap-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">{invoice.client?.name || "N/A"}</p>
                        <p className="text-sm text-gray-600">
                          {invoice.sessions_count} sessions • Created{" "}
                          {new Date(invoice.created_at).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold">${invoice.amount}</p>
                        <p className="text-sm text-gray-600">
                          Due {new Date(invoice.due_date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <Select value={invoice.status} onValueChange={(value) => handleStatusChange(invoice.id, value)}>
                        <SelectTrigger className={`w-[120px] ${getStatusColorClass(invoice.status)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => handleEditInvoice(invoice)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {invoices.length === 0 && (
            <div className="text-center py-12 col-span-full">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-500">Create your first invoice to get started!</p>
            </div>
          )}
        </div>

        {editingInvoice && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Edit Invoice Amount</DialogTitle>
                <DialogDescription>Adjust the amount for this invoice.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editAmount">Amount ($)</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    value={editedAmount}
                    onChange={(e) => setEditedAmount(Number.parseFloat(e.target.value))}
                    placeholder="Enter new amount"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEditedInvoice} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
