"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, FileText, Download, Eye } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([
    {
      id: 1,
      client: "John Doe",
      amount: 400,
      sessions: 8,
      status: "Paid",
      dueDate: "2024-01-15",
      createdDate: "2024-01-01",
    },
    {
      id: 2,
      client: "Sarah Smith",
      amount: 600,
      sessions: 12,
      status: "Pending",
      dueDate: "2024-01-20",
      createdDate: "2024-01-05",
    },
    {
      id: 3,
      client: "Mike Johnson",
      amount: 300,
      sessions: 6,
      status: "Overdue",
      dueDate: "2024-01-10",
      createdDate: "2023-12-25",
    },
  ])

  const [newInvoice, setNewInvoice] = useState({
    client: "",
    sessions: 0,
    pricePerSession: 50,
    dueDate: "",
  })

  const handleCreateInvoice = () => {
    if (newInvoice.client && newInvoice.sessions && newInvoice.dueDate) {
      const invoice = {
        id: invoices.length + 1,
        client: newInvoice.client,
        amount: newInvoice.sessions * newInvoice.pricePerSession,
        sessions: newInvoice.sessions,
        status: "Pending",
        dueDate: newInvoice.dueDate,
        createdDate: new Date().toISOString().split("T")[0],
      }
      setInvoices([...invoices, invoice])
      setNewInvoice({ client: "", sessions: 0, pricePerSession: 50, dueDate: "" })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "default"
      case "Pending":
        return "secondary"
      case "Overdue":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2">Manage billing and payments for your clients</p>
          </div>

          <Dialog>
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
                  <Select onValueChange={(value) => setNewInvoice({ ...newInvoice, client: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="John Doe">John Doe</SelectItem>
                      <SelectItem value="Sarah Smith">Sarah Smith</SelectItem>
                      <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                      <SelectItem value="Emma Wilson">Emma Wilson</SelectItem>
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
              <div className="text-2xl font-bold text-green-600">
                ${invoices.filter((inv) => inv.status === "Paid").reduce((sum, inv) => sum + inv.amount, 0)}
              </div>
              <p className="text-sm text-gray-600">Total Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-yellow-600">
                ${invoices.filter((inv) => inv.status === "Pending").reduce((sum, inv) => sum + inv.amount, 0)}
              </div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-red-600">
                ${invoices.filter((inv) => inv.status === "Overdue").reduce((sum, inv) => sum + inv.amount, 0)}
              </div>
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

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                    <div>
                      <p className="font-medium">{invoice.client}</p>
                      <p className="text-sm text-gray-600">
                        {invoice.sessions} sessions • Created{" "}
                        {new Date(invoice.createdDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold">${invoice.amount}</p>
                      <p className="text-sm text-gray-600">
                        Due {new Date(invoice.dueDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <Badge variant={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                    <div className="flex gap-2">
                      <Button size="icon" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="outline">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
