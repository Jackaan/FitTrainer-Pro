"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Phone, Dumbbell, MessageSquare, CheckCircle, XCircle, Eye } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import {
  supabase,
  type User as UserType,
  type TrainingPlan,
  type WorkoutSession,
  type ExerciseFeedback,
  type PlanExercise,
} from "@/lib/supabase"
import { ClientProfileEditForm } from "@/components/client-profile-edit-form"
import { toast } from "@/hooks/use-toast"
import { Users } from "lucide-react" // Import Users component

interface ClientWithDetails extends UserType {
  active_plans: TrainingPlan[]
  total_workouts: number
  completed_workouts: number
  unpaid_invoices_count: number
}

interface WorkoutSessionWithDetails extends WorkoutSession {
  training_plan: { name: string } | null
  exercises: (PlanExercise & { exercise: { name: string } | null; feedback: ExerciseFeedback | null })[]
}

export default function CoachClientsPage() {
  const [clients, setClients] = useState<ClientWithDetails[]>([])
  const [userId, setUserId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null)
  const [clientWorkouts, setClientWorkouts] = useState<WorkoutSessionWithDetails[]>([])
  const [isWorkoutDetailsDialogOpen, setIsWorkoutDetailsDialogOpen] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSessionWithDetails | null>(null)

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadClients(id)
    }
  }, [])

  const loadClients = async (coachId: string) => {
    try {
      setIsLoading(true)
      const { data: clientsData, error: clientsError } = await supabase
        .from("users")
        .select(
          `
          *,
          active_plans:training_plans(id, name, status),
          workout_sessions(id, status),
          invoices(id, status)
        `,
        )
        .eq("role", "client")
        .order("name", { ascending: true })

      if (clientsError) throw clientsError

      const clientsWithAggregates: ClientWithDetails[] = clientsData.map((client) => {
        const activePlans = client.active_plans.filter((plan: any) => plan.status === "Active")
        const totalWorkouts = client.workout_sessions.length
        const completedWorkouts = client.workout_sessions.filter(
          (session: any) => session.status === "Completed",
        ).length
        const unpaidInvoicesCount = client.invoices.filter(
          (invoice: any) => invoice.status === "Pending" || invoice.status === "Overdue",
        ).length

        return {
          ...client,
          active_plans: activePlans,
          total_workouts: totalWorkouts,
          completed_workouts: completedWorkouts,
          unpaid_invoices_count: unpaidInvoicesCount,
        }
      })

      setClients(clientsWithAggregates)
    } catch (error) {
      console.error("Error loading clients:", error)
      toast({
        title: "Error",
        description: "Failed to load clients.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClientSelect = async (client: ClientWithDetails) => {
    setSelectedClient(client)
    // Load workout history for the selected client
    try {
      const { data: workouts, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          *,
          training_plan:training_plans(name),
          plan_exercises(
            *,
            exercise:exercises(name),
            feedback:exercise_feedback(completed, feedback)
          )
        `,
        )
        .eq("client_id", client.id)
        .order("scheduled_date", { ascending: false })

      if (error) throw error

      const formattedWorkouts: WorkoutSessionWithDetails[] = workouts.map((session) => ({
        ...session,
        exercises: session.plan_exercises.map((pe: any) => ({
          ...pe,
          exercise: pe.exercise,
          feedback: pe.feedback[0] || null, // Assuming one feedback per exercise per session
        })),
      }))

      setClientWorkouts(formattedWorkouts || [])
    } catch (error) {
      console.error("Error loading client workouts:", error)
      toast({
        title: "Error",
        description: "Failed to load client workout history.",
        variant: "destructive",
      })
    }
  }

  const handleClientUpdate = (updatedClient: UserType) => {
    setClients((prevClients) =>
      prevClients.map((client) => (client.id === updatedClient.id ? { ...client, ...updatedClient } : client)),
    )
    setSelectedClient((prev) => (prev ? { ...prev, ...updatedClient } : null))
  }

  const handleViewWorkoutDetails = (workout: WorkoutSessionWithDetails) => {
    setSelectedWorkout(workout)
    setIsWorkoutDetailsDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading clients...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
          <p className="text-gray-600 mt-2">Manage your clients and their training progress</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
              <p className="text-gray-500">Add your first client to get started!</p>
            </div>
          )}
          {clients.map((client) => (
            <Card
              key={client.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleClientSelect(client)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{client.name}</CardTitle>
                <Avatar className="h-9 w-9">
                  <AvatarImage src={client.profile_image_url || "/placeholder.svg"} alt={client.name} />
                  <AvatarFallback>
                    {client.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {client.email}
                </p>
                {client.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" /> {client.phone}
                  </p>
                )}
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Plans:</span>
                    <Badge variant="default">{client.active_plans.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Workouts Completed:</span>
                    <Badge variant="secondary">
                      {client.completed_workouts}/{client.total_workouts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Unpaid Invoices:</span>
                    <Badge variant={client.unpaid_invoices_count > 0 ? "destructive" : "outline"}>
                      {client.unpaid_invoices_count}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedClient && (
          <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedClient.name}'s Profile</DialogTitle>
                <DialogDescription>View and manage {selectedClient.name}'s details and progress.</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">Workout History</TabsTrigger>
                  <TabsTrigger value="edit-profile">Edit Profile</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="flex-1 overflow-auto p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" /> Personal Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <strong>Email:</strong> {selectedClient.email}
                        </p>
                        <p>
                          <strong>Phone:</strong> {selectedClient.phone || "N/A"}
                        </p>
                        <p>
                          <strong>Country:</strong> {selectedClient.country_name || "N/A"}
                        </p>
                        <p>
                          <strong>Date of Birth:</strong>{" "}
                          {selectedClient.date_of_birth
                            ? new Date(selectedClient.date_of_birth).toLocaleDateString("en-GB")
                            : "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Dumbbell className="h-5 w-5" /> Fitness Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <p>
                          <strong>Height:</strong> {selectedClient.height_cm ? `${selectedClient.height_cm} cm` : "N/A"}
                        </p>
                        <p>
                          <strong>Weight:</strong> {selectedClient.weight_kg ? `${selectedClient.weight_kg} kg` : "N/A"}
                        </p>
                        <p>
                          <strong>Workouts per Week:</strong> {selectedClient.workouts_per_week || "N/A"}
                        </p>
                        <p>
                          <strong>Fitness Goal:</strong> {selectedClient.fitness_goal || "N/A"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                <TabsContent value="history" className="flex-1 overflow-auto p-4">
                  <h3 className="text-xl font-semibold mb-4">Workout History</h3>
                  {clientWorkouts.length === 0 ? (
                    <p className="text-gray-500">No workout sessions recorded for this client yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {clientWorkouts.map((session) => (
                        <Card key={session.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{session.training_plan?.name || "N/A"}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(session.scheduled_date).toLocaleDateString("en-GB")} - {session.status}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleViewWorkoutDetails(session)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="edit-profile" className="flex-1 overflow-auto p-4">
                  {selectedClient && (
                    <ClientProfileEditForm
                      client={selectedClient}
                      onSave={handleClientUpdate}
                      onCancel={() => setSelectedClient(null)}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}

        {selectedWorkout && (
          <Dialog open={isWorkoutDetailsDialogOpen} onOpenChange={setIsWorkoutDetailsDialogOpen}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl">Workout Details</DialogTitle>
                <DialogDescription>
                  {selectedWorkout.training_plan?.name || "Workout"} on{" "}
                  {new Date(selectedWorkout.scheduled_date).toLocaleDateString("en-GB")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-auto p-4 space-y-6">
                {selectedWorkout.exercises.map((planExercise, index) => (
                  <Card key={planExercise.id}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {index + 1}. {planExercise.exercise?.name || "Unknown Exercise"}
                        {planExercise.feedback?.completed ? (
                          <Badge variant="default" className="ml-2">
                            <CheckCircle className="w-3 h-3 mr-1" /> Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            <XCircle className="w-3 h-3 mr-1" /> Not Completed
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-blue-600">{planExercise.sets}</div>
                          <div className="text-sm text-gray-600">Sets</div>
                        </div>
                        {planExercise.reps && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-green-600">{planExercise.reps}</div>
                            <div className="text-sm text-gray-600">Reps</div>
                          </div>
                        )}
                        {planExercise.weight && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-purple-600">{planExercise.weight}</div>
                            <div className="text-sm text-gray-600">kg</div>
                          </div>
                        )}
                        {planExercise.time_minutes && (
                          <div className="text-center p-3 bg-gray-50 rounded-lg">
                            <div className="text-lg font-bold text-orange-600">{planExercise.time_minutes}</div>
                            <div className="text-sm text-gray-600">minutes</div>
                          </div>
                        )}
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-bold text-yellow-600">{planExercise.rest_seconds}</div>
                          <div className="text-sm text-gray-600">sec rest</div>
                        </div>
                      </div>
                      {planExercise.feedback?.feedback && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                          <p className="text-sm text-gray-700 italic">
                            <MessageSquare className="inline-block h-4 w-4 mr-2" />"{planExercise.feedback.feedback}"
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
