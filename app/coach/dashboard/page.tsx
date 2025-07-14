"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Dumbbell, Calendar, DollarSign, Activity, ChevronRight } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase, type User, type WorkoutSession } from "@/lib/supabase"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"

export default function CoachDashboardPage() {
  const [coachId, setCoachId] = useState<string | null>(null)
  const [coachName, setCoachName] = useState<string | null>(null)
  const [metrics, setMetrics] = useState({
    totalClients: 0,
    activeClients: 0,
    activeTrainingPlans: 0,
    totalWorkoutsCompleted: 0,
    totalEarnings: 0,
  })
  const [recentClients, setRecentClients] = useState<User[]>([])
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<
    (WorkoutSession & { client: { name: string } | null; training_plan: { name: string } | null })[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem("userId")
    const name = localStorage.getItem("userName")
    if (id) {
      setCoachId(id)
      setCoachName(name)
      loadDashboardData(id)
    }
  }, [])

  const loadDashboardData = async (coachId: string) => {
    try {
      setIsLoading(true)

      /* ------------------------------------------------------------------
       * 1. Training plans (all plans for this coach)
       * -----------------------------------------------------------------*/
      const { data: plans, error: plansError } = await supabase
        .from("training_plans")
        .select("id,status,client_id")
        .eq("coach_id", coachId)

      if (plansError) throw plansError

      const allClientIds = Array.from(new Set(plans.map((p) => p.client_id)))
      const activePlans = plans.filter((p) => p.status === "Active")
      const activeClientIds = Array.from(new Set(activePlans.map((p) => p.client_id)))

      /* ------------------------------------------------------------------
       * 2. Workouts completed (for this coach’s clients)
       * -----------------------------------------------------------------*/
      let totalWorkoutsCompleted = 0
      if (allClientIds.length) {
        const { count: completedCount, error: wcError } = await supabase
          .from("workout_sessions")
          .select("*", { count: "exact", head: true })
          .in("client_id", allClientIds)
          .eq("status", "Completed")

        if (wcError) throw wcError
        totalWorkoutsCompleted = completedCount || 0
      }

      /* ------------------------------------------------------------------
       * 3. Earnings (all paid invoices for this coach)
       * -----------------------------------------------------------------*/
      const { data: paidInvoices, error: invError } = await supabase
        .from("invoices")
        .select("amount")
        .eq("coach_id", coachId)
        .eq("status", "Paid")

      if (invError) throw invError

      const totalEarnings = (paidInvoices ?? []).reduce((sum, inv) => sum + inv.amount, 0)

      /* ------------------------------------------------------------------
       * 4. Metrics state
       * -----------------------------------------------------------------*/
      setMetrics({
        totalClients: allClientIds.length,
        activeClients: activeClientIds.length,
        activeTrainingPlans: activePlans.length,
        totalWorkoutsCompleted,
        totalEarnings,
      })

      /* ------------------------------------------------------------------
       * 5. Recent clients (newest 5 among this coach’s clients)
       * -----------------------------------------------------------------*/
      const { data: recentClientsData, error: rcError } = await supabase
        .from("users")
        .select("id,name,email,profile_image_url")
        .in("id", allClientIds)
        .order("created_at", { ascending: false })
        .limit(5)

      if (rcError) throw rcError
      setRecentClients(recentClientsData ?? [])

      /* ------------------------------------------------------------------
       * 6. Upcoming workouts (next 5 sessions for this coach’s plans)
       * -----------------------------------------------------------------*/
      const today = new Date().toISOString().split("T")[0]

      const { data: upcomingData, error: upError } = await supabase
        .from("workout_sessions")
        .select(
          `
        *,
        training_plan:training_plans(name),
        client:users!workout_sessions_client_id_fkey(name)
      `,
        )
        .eq("training_plans.coach_id", coachId)
        .gte("scheduled_date", today)
        .in("status", ["Scheduled", "In Progress"])
        .order("scheduled_date", { ascending: true })
        .limit(5)

      if (upError) throw upError
      setUpcomingWorkouts(upcomingData ?? [])
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {coachName || "Coach"}!</h1>
          <p className="text-gray-600 mt-2">Here's an overview of your fitness empire.</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalClients}</div>
              <p className="text-xs text-gray-500">Total clients registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Activity className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeClients}</div>
              <p className="text-xs text-gray-500">Clients with active plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Training Plans</CardTitle>
              <Dumbbell className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeTrainingPlans}</div>
              <p className="text-xs text-gray-500">Currently active plans</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-gray-500">From paid invoices</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Clients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Clients</CardTitle>
              <CardDescription>Your newest additions to the team.</CardDescription>
            </CardHeader>
            <CardContent>
              {recentClients.length === 0 ? (
                <p className="text-gray-500 text-sm">No recent clients.</p>
              ) : (
                <div className="space-y-4">
                  {recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
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
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.email}</p>
                        </div>
                      </div>
                      <Link href={`/coach/clients?clientId=${client.id}`}>
                        <Button variant="ghost" size="sm">
                          View <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Workouts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Workouts</CardTitle>
              <CardDescription>Sessions scheduled for your clients.</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingWorkouts.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming workouts.</p>
              ) : (
                <div className="space-y-4">
                  {upcomingWorkouts.map((session) => (
                    <div key={session.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{session.client?.name || "N/A"}</p>
                          <p className="text-sm text-gray-500">
                            {session.training_plan?.name || "N/A"} •{" "}
                            {new Date(session.scheduled_date).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                      </div>
                      <Link href={`/coach/clients?clientId=${session.client_id}&tab=history`}>
                        <Button variant="ghost" size="sm">
                          View <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
