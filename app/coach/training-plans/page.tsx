"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect } from "react"
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
import { Plus, Search, Edit, Trash2, Calendar, ChevronDown, ChevronUp, Eye } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase, type TrainingPlan, type User } from "@/lib/supabase"
import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from "@/hooks/use-toast"

interface ClientWithPlans extends User {
  activePlans: TrainingPlan[]
  previousPlans: TrainingPlan[]
}

export default function TrainingPlansPage() {
  const [clientsWithPlans, setClientsWithPlans] = useState<ClientWithPlans[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [userId, setUserId] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newPlan, setNewPlan] = useState({
    client_id: "",
    name: "",
    duration: "",
    difficulty: "",
    estimated_duration: "",
    start_date: "",
    end_date: "",
    invoice_amount: 0, // New field for invoice amount
  })
  const [allClients, setAllClients] = useState<User[]>([])
  const [showPreviousPlans, setShowPreviousPlans] = useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadTrainingPlans(id)
      loadClients()
    }
  }, [])

  const loadTrainingPlans = async (coachId: string) => {
    try {
      setIsLoading(true)
      const { data: plans, error: plansError } = await supabase
        .from("training_plans")
        .select(
          `
          *,
          client:users!training_plans_client_id_fkey(id, name)
        `,
        )
        .eq("coach_id", coachId)
        .order("start_date", { ascending: false }) // Order by start date for grouping

      if (plansError) throw plansError

      const groupedPlans = new Map<string, ClientWithPlans>()

      plans?.forEach((plan) => {
        if (!plan.client) return

        if (!groupedPlans.has(plan.client.id)) {
          groupedPlans.set(plan.client.id, {
            ...plan.client,
            activePlans: [],
            previousPlans: [],
          })
        }

        const clientEntry = groupedPlans.get(plan.client.id)!
        if (plan.status === "Active") {
          clientEntry.activePlans.push(plan)
        } else {
          clientEntry.previousPlans.push(plan)
        }
      })

      // Sort active plans by start date ascending, previous plans by start date descending
      const sortedClientsWithPlans = Array.from(groupedPlans.values()).map((client) => ({
        ...client,
        activePlans: client.activePlans.sort(
          (a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime(),
        ),
        previousPlans: client.previousPlans.sort(
          (a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime(),
        ),
      }))

      // Sort clients by name
      sortedClientsWithPlans.sort((a, b) => a.name.localeCompare(b.name))

      setClientsWithPlans(sortedClientsWithPlans)
    } catch (error) {
      console.error("Error loading training plans:", error)
      toast({
        title: "Error",
        description: "Failed to load training plans.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      const { data, error } = await supabase.from("users").select("id, name").eq("role", "client").order("name")

      if (error) throw error
      setAllClients(data || [])
    } catch (error) {
      console.error("Error loading clients for new plan:", error)
      toast({
        title: "Error",
        description: "Failed to load clients for new plan creation.",
        variant: "destructive",
      })
    }
  }

  const handleCreatePlan = async () => {
    if (
      !newPlan.client_id ||
      !newPlan.name ||
      !newPlan.duration ||
      !newPlan.difficulty ||
      !newPlan.start_date ||
      !userId
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      const { data: createdPlan, error: planError } = await supabase
        .from("training_plans")
        .insert([
          {
            coach_id: userId,
            client_id: newPlan.client_id,
            name: newPlan.name,
            duration: newPlan.duration,
            difficulty: newPlan.difficulty as TrainingPlan["difficulty"],
            estimated_duration: newPlan.estimated_duration,
            start_date: newPlan.start_date,
            end_date: newPlan.end_date || null,
            status: "Active", // New plans are active by default
            invoice_amount: newPlan.invoice_amount || null, // Save invoice amount with the plan
          },
        ])
        .select()
        .single()

      if (planError) throw planError

      // Automatically create an invoice for the new plan
      if (newPlan.invoice_amount && newPlan.invoice_amount > 0) {
        const invoiceDueDate =
          newPlan.end_date ||
          new Date(new Date(newPlan.start_date).setDate(new Date(newPlan.start_date).getDate() + 30))
            .toISOString()
            .split("T")[0] // Default to 30 days after start if no end date

        const { error: invoiceError } = await supabase.from("invoices").insert([
          {
            coach_id: userId,
            client_id: newPlan.client_id,
            amount: newPlan.invoice_amount,
            sessions_count: 0, // Default to 0 sessions for now, can be updated later
            status: "Pending",
            due_date: invoiceDueDate,
          },
        ])

        if (invoiceError) {
          console.error("Error creating associated invoice:", invoiceError)
          toast({
            title: "Invoice Creation Warning",
            description: "Training plan created, but failed to create associated invoice.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Success!",
            description: "Training plan and invoice created successfully.",
          })
        }
      } else {
        toast({
          title: "Success!",
          description: "Training plan created successfully.",
        })
      }

      // Reload plans to reflect the new entry and correct grouping
      loadTrainingPlans(userId)
      setNewPlan({
        client_id: "",
        name: "",
        duration: "",
        difficulty: "",
        estimated_duration: "",
        start_date: "",
        end_date: "",
        invoice_amount: 0,
      })
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error("Error creating plan:", error)
      toast({
        title: "Error",
        description: `Failed to create plan: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (confirm("Are you sure you want to delete this training plan? This action cannot be undone.")) {
      try {
        const { error } = await supabase.from("training_plans").delete().eq("id", planId)

        if (error) throw error

        loadTrainingPlans(userId) // Reload plans to update the list
        toast({
          title: "Success!",
          description: "Training plan deleted successfully.",
        })
      } catch (error: any) {
        console.error("Error deleting plan:", error)
        toast({
          title: "Error",
          description: `Failed to delete plan: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      }
    }
  }

  const filteredClientsWithPlans = clientsWithPlans.filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "default"
      case "Completed":
        return "secondary"
      case "Paused":
        return "outline"
      case "Draft":
        return "outline"
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
            <h1 className="text-3xl font-bold text-gray-900">Training Plans</h1>
            <p className="text-gray-600 mt-2">Create and manage training plans for your clients</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Training Plan</DialogTitle>
                <DialogDescription>Assign a new training plan to a client</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select onValueChange={(value) => setNewPlan({ ...newPlan, client_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {allClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name</Label>
                  <Input
                    id="name"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="e.g., Beginner Strength"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select onValueChange={(value) => setNewPlan({ ...newPlan, duration: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4 weeks">4 Weeks</SelectItem>
                      <SelectItem value="8 weeks">8 Weeks</SelectItem>
                      <SelectItem value="12 weeks">12 Weeks</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select onValueChange={(value) => setNewPlan({ ...newPlan, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estimated_duration">Estimated Duration (e.g., 60-75 min)</Label>
                  <Input
                    id="estimated_duration"
                    value={newPlan.estimated_duration}
                    onChange={(e) => setNewPlan({ ...newPlan, estimated_duration: e.target.value })}
                    placeholder="e.g., 60-75 min"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newPlan.start_date}
                    onChange={(e) => setNewPlan({ ...newPlan, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newPlan.end_date}
                    onChange={(e) => setNewPlan({ ...newPlan, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_amount">Invoice Amount ($) (Optional)</Label>
                  <Input
                    id="invoice_amount"
                    type="number"
                    value={newPlan.invoice_amount}
                    onChange={(e) => setNewPlan({ ...newPlan, invoice_amount: Number.parseFloat(e.target.value) })}
                    placeholder="e.g., 500"
                  />
                  <p className="text-xs text-gray-500">An invoice will be automatically created with this amount.</p>
                </div>
                <Button onClick={handleCreatePlan} className="w-full">
                  Create Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients or plans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Training Plans by Client */}
        <div className="space-y-8">
          {filteredClientsWithPlans.length > 0 ? (
            filteredClientsWithPlans.map((client) => (
              <Card key={client.id}>
                <CardHeader>
                  <CardTitle className="text-xl font-bold">{client.name}</CardTitle>
                  <CardDescription>{client.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Active Plans */}
                  {client.activePlans.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-green-700">Active Plans</h3>
                      <div className="space-y-3">
                        {client.activePlans.map((plan) => (
                          <Card key={plan.id} className="border-l-4 border-green-500">
                            <CardContent className="p-4 flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{plan.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {plan.duration} • {plan.difficulty}
                                </p>
                                {plan.start_date && (
                                  <p className="text-sm text-gray-600">
                                    Starts: {new Date(plan.start_date).toLocaleDateString("en-GB")}
                                  </p>
                                )}
                                {plan.end_date && (
                                  <p className="text-sm text-gray-600">
                                    Ends: {new Date(plan.end_date).toLocaleDateString("en-GB")}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor(plan.status)}>{plan.status}</Badge>
                                <Link href={`/coach/training-plans/${plan.id}/builder`}>
                                  <Button size="sm" variant="outline">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Plan
                                  </Button>
                                </Link>
                                <Button size="sm" variant="destructive" onClick={() => handleDeletePlan(plan.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Previous Plans */}
                  {client.previousPlans.length > 0 && (
                    <Collapsible
                      open={showPreviousPlans[client.id]}
                      onOpenChange={(open) => setShowPreviousPlans((prev) => ({ ...prev, [client.id]: open }))}
                      className="group"
                    >
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-gray-700 hover:text-gray-900">
                          <span>Show Previous Plans ({client.previousPlans.length})</span>
                          {showPreviousPlans[client.id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 mt-4">
                        {client.previousPlans.map((plan) => (
                          <Card key={plan.id} className="border-l-4 border-gray-300">
                            <CardContent className="p-4 flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{plan.name}</h4>
                                <p className="text-sm text-gray-600">
                                  {plan.duration} • {plan.difficulty}
                                </p>
                                {plan.start_date && plan.end_date && (
                                  <p className="text-sm text-gray-600">
                                    {new Date(plan.start_date).toLocaleDateString("en-GB")} -{" "}
                                    {new Date(plan.end_date).toLocaleDateString("en-GB")}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={getStatusColor(plan.status)}>{plan.status}</Badge>
                                <Link href={`/coach/training-plans/${plan.id}/builder`}>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Plan
                                  </Button>
                                </Link>
                                <Button size="sm" variant="destructive" onClick={() => handleDeletePlan(plan.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {client.activePlans.length === 0 && client.previousPlans.length === 0 && (
                    <div className="text-center py-4 text-gray-500">No plans for this client yet.</div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No training plans found</h3>
              <p className="text-gray-500">
                {searchTerm
                  ? "No plans match your search criteria."
                  : "Create your first training plan to get started!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
