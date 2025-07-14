"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Users, DollarSign, Calendar, Phone, Mail, MapPin, Target } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase, type User, type TrainingPlan, type Invoice } from "@/lib/supabase"

interface ClientWithDetails extends User {
  unpaidInvoices: Invoice[]
  activeWorkoutPlans: TrainingPlan[]
  previousWorkoutPlans: TrainingPlan[]
  totalUnpaid: number
}

function ExerciseProgressView({ clientId }: { clientId: string }) {
  const [progressData, setProgressData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadProgressData()
  }, [clientId])

  const loadProgressData = async () => {
    try {
      setIsLoading(true)

      // Get all workout sessions for this client with exercise feedback
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select(`
          id,
          completed_date,
          training_plan:training_plans(name),
          exercise_feedback(
            id,
            exercise_id,
            actual_sets,
            actual_reps,
            actual_weight,
            completed,
            created_at,
            exercise:exercises(name, type)
          )
        `)
        .eq("client_id", clientId)
        .eq("status", "Completed")
        .not("completed_date", "is", null)
        .order("completed_date", { ascending: false })

      if (sessionsError) throw sessionsError

      // Process the data to group by exercise and track progress
      const exerciseProgress = new Map()

      sessions?.forEach((session) => {
        session.exercise_feedback?.forEach((feedback) => {
          if (!feedback.completed || !feedback.exercise) return

          const exerciseId = feedback.exercise_id
          const exerciseName = feedback.exercise.name
          const exerciseType = feedback.exercise.type

          if (!exerciseProgress.has(exerciseId)) {
            exerciseProgress.set(exerciseId, {
              exerciseId,
              exerciseName,
              exerciseType,
              sessions: [],
            })
          }

          exerciseProgress.get(exerciseId).sessions.push({
            date: session.completed_date,
            planName: session.training_plan?.name,
            sets: feedback.actual_sets,
            reps: feedback.actual_reps,
            weight: feedback.actual_weight,
            sessionDate: session.completed_date,
          })
        })
      })

      // Convert to array and sort sessions by date for each exercise
      const progressArray = Array.from(exerciseProgress.values()).map((exercise) => {
        const sortedSessions = exercise.sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        const firstSession = sortedSessions[0]
        const latestSession = sortedSessions[sortedSessions.length - 1]

        return {
          ...exercise,
          sessions: sortedSessions,
          firstSession,
          latestSession,
          totalSessions: sortedSessions.length,
          progressMade: calculateProgress(firstSession, latestSession, exercise.exerciseType),
        }
      })

      // Sort by latest session date
      progressArray.sort((a, b) => new Date(b.latestSession.date).getTime() - new Date(a.latestSession.date).getTime())

      setProgressData(progressArray)
    } catch (error) {
      console.error("Error loading progress data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateProgress = (first: any, latest: any, exerciseType: string) => {
    if (!first || !latest) return null

    if (exerciseType === "Weighted") {
      const firstTotal = (first.weight || 0) * (first.reps || 0) * (first.sets || 1)
      const latestTotal = (latest.weight || 0) * (latest.reps || 0) * (latest.sets || 1)

      if (firstTotal === 0) return null

      const improvement = ((latestTotal - firstTotal) / firstTotal) * 100
      return {
        type: "weight",
        improvement: improvement.toFixed(1),
        firstWeight: first.weight,
        latestWeight: latest.weight,
        firstReps: first.reps,
        latestReps: latest.reps,
      }
    } else if (exerciseType === "Bodyweight") {
      const firstReps = (first.reps || 0) * (first.sets || 1)
      const latestReps = (latest.reps || 0) * (latest.sets || 1)

      if (firstReps === 0) return null

      const improvement = ((latestReps - firstReps) / firstReps) * 100
      return {
        type: "reps",
        improvement: improvement.toFixed(1),
        firstReps,
        latestReps,
      }
    }

    return null
  }

  const formatProgressText = (progress: any, exerciseType: string) => {
    if (!progress) return "No progress data"

    if (exerciseType === "Weighted") {
      return `${progress.firstWeight}kg × ${progress.firstReps} → ${progress.latestWeight}kg × ${progress.latestReps}`
    } else if (exerciseType === "Bodyweight") {
      return `${progress.firstReps} reps → ${progress.latestReps} reps`
    }

    return "Progress tracked"
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading progress data...</div>
  }

  if (progressData.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No exercise progress data available yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Progress will be tracked once the client completes workouts with exercise feedback.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Exercise Progress</h3>
        <Badge variant="outline">{progressData.length} exercises tracked</Badge>
      </div>

      <div className="space-y-4">
        {progressData.map((exercise) => (
          <Card key={exercise.exerciseId}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{exercise.exerciseName}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline">{exercise.exerciseType}</Badge>
                    <Badge variant="secondary">{exercise.totalSessions} sessions</Badge>
                  </div>
                </div>
                {exercise.progressMade && Number.parseFloat(exercise.progressMade.improvement) > 0 && (
                  <Badge variant="default" className="bg-green-600">
                    +{exercise.progressMade.improvement}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Summary */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-700 font-medium">First Performance</div>
                  <div className="text-lg font-bold text-blue-900">
                    {exercise.exerciseType === "Weighted" && exercise.firstSession.weight && exercise.firstSession.reps
                      ? `${exercise.firstSession.weight}kg × ${exercise.firstSession.reps} reps`
                      : exercise.exerciseType === "Bodyweight" && exercise.firstSession.reps
                        ? `${exercise.firstSession.reps} reps`
                        : "No data"}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {new Date(exercise.firstSession.date).toLocaleDateString("en-GB")}
                  </div>
                </div>

                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm text-green-700 font-medium">Latest Performance</div>
                  <div className="text-lg font-bold text-green-900">
                    {exercise.exerciseType === "Weighted" &&
                    exercise.latestSession.weight &&
                    exercise.latestSession.reps
                      ? `${exercise.latestSession.weight}kg × ${exercise.latestSession.reps} reps`
                      : exercise.exerciseType === "Bodyweight" && exercise.latestSession.reps
                        ? `${exercise.latestSession.reps} reps`
                        : "No data"}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {new Date(exercise.latestSession.date).toLocaleDateString("en-GB")}
                  </div>
                </div>
              </div>

              {/* Progress Details */}
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Last seen in program:</span>
                  <span className="font-medium">{exercise.latestSession.planName}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">
                    {formatProgressText(exercise.progressMade, exercise.exerciseType)}
                  </span>
                </div>
              </div>

              {/* Recent Sessions */}
              {exercise.sessions.length > 2 && (
                <details className="border-t pt-3">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    View all {exercise.sessions.length} sessions
                  </summary>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                    {exercise.sessions
                      .slice()
                      .reverse()
                      .map((session, index) => (
                        <div key={index} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                          <span>{new Date(session.date).toLocaleDateString("en-GB")}</span>
                          <span>
                            {exercise.exerciseType === "Weighted" && session.weight && session.reps
                              ? `${session.weight}kg × ${session.reps}`
                              : exercise.exerciseType === "Bodyweight" && session.reps
                                ? `${session.reps} reps`
                                : "Completed"}
                          </span>
                          <span className="text-gray-500">{session.planName}</span>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithDetails[]>([])
  const [selectedClient, setSelectedClient] = useState<ClientWithDetails | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [userId, setUserId] = useState("")
  const [isLoading, setIsLoading] = useState(true)

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

      // Get all clients who have training plans with this coach
      const { data: clientIds, error: clientIdsError } = await supabase
        .from("training_plans")
        .select("client_id")
        .eq("coach_id", coachId)

      if (clientIdsError) throw clientIdsError

      const uniqueClientIds = [...new Set(clientIds?.map((plan) => plan.client_id) || [])]

      if (uniqueClientIds.length === 0) {
        setClients([])
        setIsLoading(false)
        return
      }

      // Get client details
      const { data: clientsData, error: clientsError } = await supabase
        .from("users")
        .select("*")
        .in("id", uniqueClientIds)
        .eq("role", "client")

      if (clientsError) throw clientsError

      // For each client, get their training plans and invoices
      const clientsWithDetails = await Promise.all(
        (clientsData || []).map(async (client) => {
          // Get training plans
          const { data: trainingPlans } = await supabase
            .from("training_plans")
            .select("*")
            .eq("client_id", client.id)
            .eq("coach_id", coachId)
            .order("created_at", { ascending: false })

          // Get unpaid invoices
          const { data: invoices } = await supabase
            .from("invoices")
            .select("*")
            .eq("client_id", client.id)
            .eq("coach_id", coachId)
            .in("status", ["Pending", "Overdue"])

          const activeWorkoutPlans = trainingPlans?.filter((plan) => plan.status === "Active") || []
          const previousWorkoutPlans = trainingPlans?.filter((plan) => plan.status !== "Active") || []
          const unpaidInvoices = invoices || []
          const totalUnpaid = unpaidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)

          return {
            ...client,
            activeWorkoutPlans,
            previousWorkoutPlans,
            unpaidInvoices,
            totalUnpaid,
          }
        }),
      )

      setClients(clientsWithDetails)
    } catch (error) {
      console.error("Error loading clients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const calculateBMI = (height: number, weight: number) => {
    if (!height || !weight) return null
    const heightM = height / 100
    return (weight / (heightM * heightM)).toFixed(1)
  }

  const calculatePlanTimeRemaining = (plan: TrainingPlan) => {
    if (!plan.start_date || !plan.duration || plan.status !== "Active") return null

    const startDate = new Date(plan.start_date)
    const today = new Date()

    // Check if plan hasn't started yet
    if (startDate > today) {
      const timeDiff = startDate.getTime() - today.getTime()
      const daysUntilStart = Math.ceil(timeDiff / (1000 * 3600 * 24))

      if (daysUntilStart === 1) {
        return { status: "starting-soon", text: "Starts tomorrow", color: "text-blue-600" }
      } else if (daysUntilStart <= 7) {
        return { status: "starting-soon", text: `Starts in ${daysUntilStart} days`, color: "text-blue-600" }
      } else {
        const weeksUntilStart = Math.floor(daysUntilStart / 7)
        const extraDays = daysUntilStart % 7
        if (extraDays === 0) {
          return { status: "starting-later", text: `Starts in ${weeksUntilStart} weeks`, color: "text-blue-600" }
        } else {
          return {
            status: "starting-later",
            text: `Starts in ${weeksUntilStart}w ${extraDays}d`,
            color: "text-blue-600",
          }
        }
      }
    }

    // Plan has started - show time remaining until end
    const durationMatch = plan.duration.match(/(\d+)\s*weeks?/i)
    if (!durationMatch) return null

    const durationWeeks = Number.parseInt(durationMatch[1])
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + durationWeeks * 7)

    const timeDiff = endDate.getTime() - today.getTime()
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

    if (daysRemaining < 0) {
      return { status: "overdue", text: `${Math.abs(daysRemaining)} days overdue`, color: "text-red-600" }
    } else if (daysRemaining === 0) {
      return { status: "ending", text: "Ends today", color: "text-orange-600" }
    } else if (daysRemaining <= 7) {
      return { status: "ending-soon", text: `${daysRemaining} days left`, color: "text-orange-600" }
    } else {
      const weeksRemaining = Math.floor(daysRemaining / 7)
      const extraDays = daysRemaining % 7
      if (extraDays === 0) {
        return { status: "active", text: `${weeksRemaining} weeks left`, color: "text-green-600" }
      } else {
        return { status: "active", text: `${weeksRemaining}w ${extraDays}d left`, color: "text-green-600" }
      }
    }
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
            <p className="text-gray-600 mt-2">Manage your client relationships and track their progress</p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={client.profile_image_url || "/placeholder.svg"} alt={client.name} />
                    <AvatarFallback>
                      {client.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <CardDescription>{client.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>{client.activeWorkoutPlans.length} Active Plans</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-red-600" />
                    <span>${client.totalUnpaid} Unpaid</span>
                  </div>
                </div>

                {/* Show plan status for active plans */}
                {client.activeWorkoutPlans.length > 0 && (
                  <div className="space-y-1">
                    {client.activeWorkoutPlans.slice(0, 2).map((plan) => {
                      const timeRemaining = calculatePlanTimeRemaining(plan)
                      return timeRemaining ? (
                        <div key={plan.id} className="text-xs">
                          <span className="text-gray-600">{plan.name}: </span>
                          <span className={timeRemaining.color}>{timeRemaining.text}</span>
                        </div>
                      ) : null
                    })}
                    {client.activeWorkoutPlans.length > 2 && (
                      <div className="text-xs text-gray-500">+{client.activeWorkoutPlans.length - 2} more plans</div>
                    )}
                  </div>
                )}

                {client.totalUnpaid > 0 && (
                  <Badge variant="destructive" className="w-full justify-center">
                    {client.unpaidInvoices.length} Unpaid Invoice{client.unpaidInvoices.length !== 1 ? "s" : ""}
                  </Badge>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full bg-transparent"
                      variant="outline"
                      onClick={() => setSelectedClient(client)}
                    >
                      View Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={client.profile_image_url || "/placeholder.svg"} alt={client.name} />
                          <AvatarFallback>
                            {client.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {client.name}
                      </DialogTitle>
                      <DialogDescription>Client profile and training overview</DialogDescription>
                    </DialogHeader>

                    {selectedClient && (
                      <Tabs defaultValue="profile" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="profile">Profile</TabsTrigger>
                          <TabsTrigger value="plans">Training Plans</TabsTrigger>
                          <TabsTrigger value="invoices">Invoices</TabsTrigger>
                          <TabsTrigger value="progress">Progress</TabsTrigger>
                        </TabsList>

                        <TabsContent value="profile" className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            {/* Personal Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Users className="h-5 w-5" />
                                  Personal Information
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-gray-500" />
                                  <span className="text-sm">{selectedClient.email}</span>
                                </div>
                                {selectedClient.phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm">{selectedClient.phone}</span>
                                  </div>
                                )}
                                {selectedClient.country_name && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    <span className="text-sm">{selectedClient.country_name}</span>
                                  </div>
                                )}
                                {selectedClient.date_of_birth && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Age:</span>
                                    <span className="text-sm font-medium">
                                      {calculateAge(selectedClient.date_of_birth)} years
                                    </span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Physical Information */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Physical Stats</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                {selectedClient.height_cm && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Height:</span>
                                    <span className="text-sm font-medium">{selectedClient.height_cm} cm</span>
                                  </div>
                                )}
                                {selectedClient.weight_kg && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Weight:</span>
                                    <span className="text-sm font-medium">{selectedClient.weight_kg} kg</span>
                                  </div>
                                )}
                                {selectedClient.height_cm && selectedClient.weight_kg && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">BMI:</span>
                                    <Badge variant="outline">
                                      {calculateBMI(selectedClient.height_cm, selectedClient.weight_kg)}
                                    </Badge>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Weekly Goal:</span>
                                  <span className="text-sm font-medium">
                                    {selectedClient.workouts_per_week || 3} workouts
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Fitness Goal */}
                          {selectedClient.fitness_goal && (
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                  <Target className="h-5 w-5" />
                                  Fitness Goal
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm italic">"{selectedClient.fitness_goal}"</p>
                              </CardContent>
                            </Card>
                          )}

                          {/* Emergency Contact */}
                          {(selectedClient.emergency_contact_name || selectedClient.emergency_contact_phone) && (
                            <Card>
                              <CardHeader>
                                <CardTitle>Emergency Contact</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {selectedClient.emergency_contact_name && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Name:</span>
                                    <span className="text-sm font-medium">{selectedClient.emergency_contact_name}</span>
                                  </div>
                                )}
                                {selectedClient.emergency_contact_phone && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Phone:</span>
                                    <span className="text-sm font-medium">
                                      {selectedClient.emergency_contact_phone}
                                    </span>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </TabsContent>

                        <TabsContent value="plans" className="space-y-4">
                          {/* Active Plans */}
                          {selectedClient.activeWorkoutPlans.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 text-green-700">Active Training Plans</h3>
                              <div className="space-y-3">
                                {selectedClient.activeWorkoutPlans.map((plan) => {
                                  const timeRemaining = calculatePlanTimeRemaining(plan)
                                  return (
                                    <Card key={plan.id}>
                                      <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <h4 className="font-medium">{plan.name}</h4>
                                            <p className="text-sm text-gray-600">Duration: {plan.duration}</p>
                                            {plan.start_date && (
                                              <p className="text-sm text-gray-600">
                                                Started: {new Date(plan.start_date).toLocaleDateString("en-GB")}
                                              </p>
                                            )}
                                            {timeRemaining && (
                                              <p className={`text-sm font-medium ${timeRemaining.color}`}>
                                                {timeRemaining.text}
                                              </p>
                                            )}
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <Badge variant="default">{plan.status}</Badge>
                                            {timeRemaining?.status === "overdue" && (
                                              <Badge variant="destructive" className="text-xs">
                                                Needs New Plan
                                              </Badge>
                                            )}
                                            {timeRemaining?.status === "ending-soon" && (
                                              <Badge variant="secondary" className="text-xs">
                                                Plan Ending Soon
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Previous Plans */}
                          {selectedClient.previousWorkoutPlans.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 text-gray-700">Previous Training Plans</h3>
                              <div className="space-y-3">
                                {selectedClient.previousWorkoutPlans.map((plan) => (
                                  <Card key={plan.id}>
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="font-medium">{plan.name}</h4>
                                          <p className="text-sm text-gray-600">Duration: {plan.duration}</p>
                                          {plan.start_date && plan.end_date && (
                                            <p className="text-sm text-gray-600">
                                              {new Date(plan.start_date).toLocaleDateString("en-GB")} -{" "}
                                              {new Date(plan.end_date).toLocaleDateString("en-GB")}
                                            </p>
                                          )}
                                        </div>
                                        <Badge variant={plan.status === "Completed" ? "secondary" : "outline"}>
                                          {plan.status}
                                        </Badge>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {selectedClient.activeWorkoutPlans.length === 0 &&
                            selectedClient.previousWorkoutPlans.length === 0 && (
                              <div className="text-center py-8">
                                <p className="text-gray-500">No training plans found for this client.</p>
                              </div>
                            )}
                        </TabsContent>

                        <TabsContent value="invoices" className="space-y-4">
                          {selectedClient.unpaidInvoices.length > 0 && (
                            <div>
                              <h3 className="text-lg font-semibold mb-3 text-red-700">Unpaid Invoices</h3>
                              <div className="space-y-3">
                                {selectedClient.unpaidInvoices.map((invoice) => (
                                  <Card key={invoice.id}>
                                    <CardContent className="p-4">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <h4 className="font-medium">${invoice.amount}</h4>
                                          <p className="text-sm text-gray-600">{invoice.sessions_count} sessions</p>
                                          <p className="text-sm text-gray-600">
                                            Due: {new Date(invoice.due_date).toLocaleDateString("en-GB")}
                                          </p>
                                        </div>
                                        <Badge variant={invoice.status === "Overdue" ? "destructive" : "secondary"}>
                                          {invoice.status}
                                        </Badge>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                              <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-red-800">Total Unpaid:</span>
                                  <span className="text-lg font-bold text-red-800">${selectedClient.totalUnpaid}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {selectedClient.unpaidInvoices.length === 0 && (
                            <div className="text-center py-8">
                              <div className="text-green-600 mb-2">✓</div>
                              <p className="text-gray-500">All invoices are paid up to date!</p>
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="progress" className="space-y-4">
                          <ExerciseProgressView clientId={selectedClient.id} />
                        </TabsContent>
                      </Tabs>
                    )}
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredClients.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-500">
              {searchTerm ? "No clients match your search criteria." : "You don't have any clients yet."}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
