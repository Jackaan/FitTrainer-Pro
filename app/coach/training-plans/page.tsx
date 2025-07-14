"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Calendar, Users, Trash2 } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase, type TrainingPlan, type User } from "@/lib/supabase"
import Link from "next/link"

export default function TrainingPlansPage() {
  const [plans, setPlans] = useState<TrainingPlan[]>([])
  const [clients, setClients] = useState<User[]>([])
  const [userId, setUserId] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newPlan, setNewPlan] = useState({
    name: "",
    client_id: "",
    duration: "",
    start_date: "",
    status: "Draft",
  })

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
      const { data, error } = await supabase
        .from("training_plans")
        .select(`
          *,
          client:users!training_plans_client_id_fkey(name)
        `)
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setPlans(data || [])
    } catch (error) {
      console.error("Error loading training plans:", error)
    }
  }

  const loadClients = async () => {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("role", "client").order("name")

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error("Error loading clients:", error)
    }
  }

  const handleCreatePlan = async () => {
    if (newPlan.name && newPlan.client_id && newPlan.duration && userId) {
      try {
        const { data, error } = await supabase
          .from("training_plans")
          .insert([
            {
              coach_id: userId,
              client_id: newPlan.client_id,
              name: newPlan.name,
              duration: newPlan.duration,
              start_date: newPlan.start_date || null,
              status: newPlan.status,
            },
          ])
          .select(`
            *,
            client:users!training_plans_client_id_fkey(name)
          `)
          .single()

        if (error) throw error

        setPlans([data, ...plans])
        setNewPlan({ name: "", client_id: "", duration: "", start_date: "", status: "Draft" })
        setIsDialogOpen(false)
      } catch (error) {
        console.error("Error creating training plan:", error)
        alert("Failed to create training plan")
      }
    }
  }

  const handleDeletePlan = async (planId: string) => {
    if (confirm("Are you sure you want to delete this training plan?")) {
      try {
        const { error } = await supabase.from("training_plans").delete().eq("id", planId)

        if (error) throw error

        setPlans(plans.filter((plan) => plan.id !== planId))
      } catch (error) {
        console.error("Error deleting training plan:", error)
        alert("Failed to delete training plan")
      }
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
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Training Plan</DialogTitle>
                <DialogDescription>Start building a new training plan for your client</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="planName">Plan Name</Label>
                  <Input
                    id="planName"
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    placeholder="e.g., Beginner Full Body"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select onValueChange={(value) => setNewPlan({ ...newPlan, client_id: value })}>
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
                  <Label htmlFor="duration">Duration</Label>
                  <Select onValueChange={(value) => setNewPlan({ ...newPlan, duration: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2 weeks">2 weeks</SelectItem>
                      <SelectItem value="4 weeks">4 weeks</SelectItem>
                      <SelectItem value="6 weeks">6 weeks</SelectItem>
                      <SelectItem value="8 weeks">8 weeks</SelectItem>
                      <SelectItem value="12 weeks">12 weeks</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newPlan.start_date}
                    onChange={(e) => setNewPlan({ ...newPlan, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select onValueChange={(value) => setNewPlan({ ...newPlan, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreatePlan} className="w-full">
                  Create Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Button size="icon" variant="ghost" onClick={() => handleDeletePlan(plan.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {plan.client?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <Badge variant="outline">{plan.duration}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Badge
                    variant={
                      plan.status === "Active" ? "default" : plan.status === "Completed" ? "secondary" : "outline"
                    }
                  >
                    {plan.status}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Client Visibility:</span>
                  <Badge variant={plan.status === "Active" || plan.status === "Completed" ? "default" : "destructive"}>
                    {plan.status === "Active" || plan.status === "Completed" ? "Visible" : "Hidden"}
                  </Badge>
                </div>
                {plan.start_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Start Date:</span>
                    <span className="text-sm">{new Date(plan.start_date).toLocaleDateString("en-GB")}</span>
                  </div>
                )}
                <div className="pt-2">
                  <Link href={`/coach/training-plans/${plan.id}/builder`}>
                    <Button className="w-full bg-transparent" variant="outline">
                      <Calendar className="mr-2 h-4 w-4" />
                      Edit Plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No training plans yet. Create your first plan to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
