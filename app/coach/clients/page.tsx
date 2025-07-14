"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, MessageSquare, CheckCircle, XCircle, Eye, Users, User, Dumbbell, Trash2 } from "lucide-react"
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

/* ────────────────────────────────────────────────────────────
 *  Types
 * ────────────────────────────────────────────────────────────*/
interface ClientWithDetails extends UserType {
  active_plans: TrainingPlan[]
  total_workouts: number
  completed_workouts: number
  unpaid_invoices_count: number
}

interface WorkoutExerciseRow extends Partial<PlanExercise> /* sets, reps, … */ {
  exercise?: { name: string | null }
  feedback?: ExerciseFeedback | null
}

interface WorkoutSessionWithDetails extends WorkoutSession {
  training_plan: { name: string | null } | null
  exercises: WorkoutExerciseRow[]
}

/* ────────────────────────────────────────────────────────────
 *  Component
 * ────────────────────────────────────────────────────────────*/
export default function CoachClientsPage() {
  const [clients, setClients] = useState<ClientWithDetails[]>([])
  const [userId, setUserId] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null)
  const [clientWorkouts, setClientWorkouts] = useState<WorkoutSessionWithDetails[]>([])

  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSessionWithDetails | null>(null)
  const [isWorkoutDetailsDialogOpen, setIsWorkoutDetailsDialogOpen] = useState(false)

  /* ────────────────────────────────────────────────────────────
   *  Load coach ID and initial client list
   * ────────────────────────────────────────────────────────────*/
  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadClients(id)
    }
  }, [])

  /* ────────────────────────────────────────────────────────────
   *  Fetch clients with embedded data (legal relationships only)
   * ────────────────────────────────────────────────────────────*/
  const loadClients = async (coachId: string) => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          *,
          active_plans:training_plans!client_id(
            id,
            name,
            status,
            coach_id
          ),
          workout_sessions:workout_sessions!client_id(
            id,
            status
          ),
          invoices:invoices!client_id(
            id,
            status,
            amount,
            coach_id
          )
        `,
        )
        .eq("role", "client")
        .order("name", { ascending: true })

      if (error) throw error

      const mapped: ClientWithDetails[] = (data ?? []).map((c) => {
        const activePlans = c.active_plans.filter((p: any) => p.coach_id === coachId && p.status === "Active")

        const invoicesForCoach = c.invoices.filter((inv: any) => inv.coach_id === coachId)

        return {
          ...c,
          active_plans: activePlans,
          total_workouts: c.workout_sessions.length,
          completed_workouts: c.workout_sessions.filter((ws: any) => ws.status === "Completed").length,
          unpaid_invoices_count: invoicesForCoach.filter(
            (inv: any) => inv.status === "Pending" || inv.status === "Overdue",
          ).length,
        }
      })

      setClients(mapped)
    } catch (err) {
      console.error("Error loading clients:", err)
      toast({
        title: "Error",
        description: "Failed to load clients.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  /* ────────────────────────────────────────────────────────────
   *  When a client card is clicked – fetch their workouts
   * ────────────────────────────────────────────────────────────*/
  const handleClientSelect = async (client: ClientWithDetails) => {
    setSelectedClient(client)

    try {
      /* 1️⃣  Fetch workout sessions + exercise_feedback + exercises   */
      const { data: sessions, error } = await supabase
        .from("workout_sessions")
        .select(
          `
            *,
            training_plan:training_plans(name),
            exercise_feedback(
              *,
              exercise:exercises(name)
            )
          `,
        )
        .eq("client_id", client.id)
        .order("scheduled_date", { ascending: false })

      if (error) throw error

      /* 2️⃣  Collect plan-ids and fetch plan_exercises in bulk        */
      const planIds = [...new Set((sessions ?? []).map((s) => s.plan_id).filter(Boolean))]
      let planExercises: PlanExercise[] = []

      if (planIds.length) {
        const { data: peData, error: peErr } = await supabase.from("plan_exercises").select("*").in("plan_id", planIds)

        if (peErr) throw peErr
        planExercises = peData ?? []
      }

      /* 3️⃣  Merge – create the structure expected by the UI          */
      const formatted: WorkoutSessionWithDetails[] = (sessions ?? []).map((s) => {
        const exercises: WorkoutExerciseRow[] = (s.exercise_feedback ?? []).map((fb: any) => {
          const peMatch = planExercises.find((pe) => pe.plan_id === s.plan_id && pe.exercise_id === fb.exercise_id)

          return {
            ...(peMatch ?? {}), // sets, reps, weight, …
            exercise: fb.exercise,
            feedback: fb,
          }
        })

        return { ...s, exercises }
      })

      setClientWorkouts(formatted)
    } catch (err) {
      console.error("Error loading client workouts:", err)
      toast({
        title: "Error",
        description: "Failed to load client workout history.",
        variant: "destructive",
      })
    }
  }

  /* ────────────────────────────────────────────────────────────
   *  Helpers
   * ────────────────────────────────────────────────────────────*/
  const handleClientUpdate = (updated: UserType) => {
    setClients((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
    setSelectedClient((prev) => (prev ? { ...prev, ...updated } : null))
  }

  const handleViewWorkoutDetails = (workout: WorkoutSessionWithDetails) => {
    setSelectedWorkout(workout)
    setIsWorkoutDetailsDialogOpen(true)
  }

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete client "${clientName}" and all their associated data? This action cannot be undone.`,
      )
    ) {
      return
    }

    try {
      // Start a transaction or handle cascading deletes carefully
      // For simplicity, performing sequential deletes. In a real app, consider RLS policies or database cascade rules.

      // 1. Delete exercise feedback
      const { error: feedbackError } = await supabase
        .from("exercise_feedback")
        .delete()
        .in("session_id", supabase.from("workout_sessions").select("id").eq("client_id", clientId))

      if (feedbackError) throw feedbackError

      // 2. Delete workout sessions
      const { error: workoutError } = await supabase.from("workout_sessions").delete().eq("client_id", clientId)

      if (workoutError) throw workoutError

      // 3. Delete plan exercises (associated with client's plans)
      const { error: planExerciseError } = await supabase
        .from("plan_exercises")
        .delete()
        .in("plan_id", supabase.from("training_plans").select("id").eq("client_id", clientId))

      if (planExerciseError) throw planExerciseError

      // 4. Delete invoices
      const { error: invoiceError } = await supabase.from("invoices").delete().eq("client_id", clientId)

      if (invoiceError) throw invoiceError

      // 5. Delete training plans
      const { error: planError } = await supabase.from("training_plans").delete().eq("client_id", clientId)

      if (planError) throw planError

      // 6. Finally, delete the user
      const { error: userError } = await supabase.from("users").delete().eq("id", clientId)

      if (userError) throw userError

      toast({
        title: "Client Deleted",
        description: `Client "${clientName}" and all associated data have been successfully removed.`,
      })
      setSelectedClient(null) // Close the dialog
      loadClients(userId) // Reload the client list
    } catch (error) {
      console.error("Error deleting client:", error)
      toast({
        title: "Error",
        description: `Failed to delete client "${clientName}". Please try again.`,
        variant: "destructive",
      })
    }
  }

  /* ────────────────────────────────────────────────────────────
   *  UI
   * ────────────────────────────────────────────────────────────*/
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachNavigation />
        <div className="container mx-auto px-4 py-8 text-center">Loading clients…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">My Clients</h1>
        <p className="text-gray-600 mb-8">Manage your clients and their progress</p>

        {/* Clients Grid */}
        {clients.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients yet</h3>
            <p className="text-gray-500">Add your first client to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((c) => (
              <Card key={c.id} className="cursor-pointer hover:shadow-lg" onClick={() => handleClientSelect(c)}>
                <CardHeader className="flex items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={c.profile_image_url || "/placeholder.svg"} alt={c.name} />
                    <AvatarFallback>
                      {c.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {c.email}
                  </p>
                  {c.phone && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </p>
                  )}

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Active Plans</span>
                      <Badge>{c.active_plans.length}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Workouts Completed</span>
                      <Badge variant="secondary">
                        {c.completed_workouts}/{c.total_workouts}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Unpaid Invoices</span>
                      <Badge variant={c.unpaid_invoices_count ? "destructive" : "outline"}>
                        {c.unpaid_invoices_count}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ───────────────────────────────────────────
            Client Dialog (profile / history / edit)
            ─────────────────────────────────────────── */}
        {selectedClient && (
          <Dialog open onOpenChange={() => setSelectedClient(null)}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedClient.name}</DialogTitle>
                <DialogDescription>View and manage {selectedClient.name}&rsquo;s details</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">Workout History</TabsTrigger>
                  <TabsTrigger value="edit">Edit Profile</TabsTrigger>
                </TabsList>

                {/* Overview */}
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

                {/* Workout History */}
                <TabsContent value="history" className="flex-1 overflow-auto p-4">
                  {clientWorkouts.length === 0 ? (
                    <p className="text-gray-500">No workout sessions yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {clientWorkouts.map((ws) => (
                        <Card key={ws.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{ws.training_plan?.name ?? "Untitled Plan"}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(ws.scheduled_date).toLocaleDateString("en-GB")} – {ws.status}
                              </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => handleViewWorkoutDetails(ws)}>
                              <Eye className="w-4 h-4 mr-2" /> Details
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Edit */}
                <TabsContent value="edit" className="flex-1 overflow-auto p-4">
                  {selectedClient && (
                    <>
                      <ClientProfileEditForm
                        client={selectedClient}
                        onSave={handleClientUpdate}
                        onCancel={() => setSelectedClient(null)}
                      />
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <Button
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDeleteClient(selectedClient.id, selectedClient.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Client
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        )}

        {/* Workout Details Dialog */}
        {selectedWorkout && (
          <Dialog open={isWorkoutDetailsDialogOpen} onOpenChange={setIsWorkoutDetailsDialogOpen}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Workout Details</DialogTitle>
                <DialogDescription>
                  {selectedWorkout.training_plan?.name ?? "Workout"} on{" "}
                  {new Date(selectedWorkout.scheduled_date).toLocaleDateString("en-GB")}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-auto p-4 space-y-6">
                {selectedWorkout.exercises.map((ex, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {i + 1}. {ex.exercise?.name ?? "Exercise"}
                        {ex.feedback?.completed ? (
                          <Badge className="ml-2">
                            <CheckCircle className="w-3 h-3 mr-1" /> Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-2">
                            <XCircle className="w-3 h-3 mr-1" /> Skipped
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-center">
                        <Stat value={ex.sets} label="Sets" color="blue" />
                        {ex.reps !== undefined && <Stat value={ex.reps} label="Reps" color="green" />}
                        {ex.weight !== undefined && <Stat value={ex.weight} label="kg" color="purple" />}
                        {ex.time_minutes !== undefined && <Stat value={ex.time_minutes} label="min" color="orange" />}
                        <Stat value={ex.rest_seconds} label="sec rest" color="yellow" />
                      </div>

                      {ex.feedback?.feedback && (
                        <blockquote className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 italic text-sm text-gray-700">
                          <MessageSquare className="inline-block w-4 h-4 mr-1 -mt-0.5" />“{ex.feedback.feedback}”
                        </blockquote>
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

/* Helper component for stats boxes */
function Stat({
  value,
  label,
  color,
}: {
  value: number | string | undefined
  label: string
  color: "blue" | "green" | "purple" | "orange" | "yellow"
}) {
  if (value === undefined || value === null) return null
  const colorMap: Record<string, string> = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    yellow: "text-yellow-600",
  }
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className={`text-lg font-bold ${colorMap[color]}`}>{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}
