"use client"

import { CardDescription } from "@/components/ui/card"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Dumbbell, Calendar, CheckCircle } from "lucide-react"
import Link from "next/link"
import { ClientNavigation } from "@/components/client-navigation"
import { supabase, type WorkoutSession } from "@/lib/supabase"

export default function ClientDashboard() {
  const [userName, setUserName] = useState("")
  const [userId, setUserId] = useState("")
  const [stats, setStats] = useState({
    activePlans: 0,
    completedPlans: 0,
    totalWorkouts: 0,
  })
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const name = localStorage.getItem("userName") || "Client"
    const id = localStorage.getItem("userId") || ""
    setUserName(name)
    setUserId(id)

    if (id) {
      loadDashboardData(id)
    }
  }, [])

  const loadDashboardData = async (clientId: string) => {
    try {
      setIsLoading(true)

      // Update expired active plans to 'Completed'
      const { data: activePlans, error: activePlansError } = await supabase
        .from("training_plans")
        .select("id, end_date")
        .eq("client_id", clientId)
        .eq("status", "Active")

      if (activePlansError) throw activePlansError

      const today = new Date().toISOString().split("T")[0]
      const expiredPlans = activePlans?.filter((plan) => plan.end_date && plan.end_date < today) || []

      if (expiredPlans.length > 0) {
        const { error: updateError } = await supabase
          .from("training_plans")
          .update({ status: "Completed" })
          .in(
            "id",
            expiredPlans.map((p) => p.id),
          )

        if (updateError) console.error("Error updating expired plans:", updateError)
      }

      // Load stats
      const { count: activePlansCount } = await supabase
        .from("training_plans")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "Active")

      const { count: completedPlansCount } = await supabase
        .from("training_plans")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "Completed")

      const { count: totalWorkoutsCount } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "Completed")

      setStats({
        activePlans: activePlansCount || 0,
        completedPlans: completedPlansCount || 0,
        totalWorkouts: totalWorkoutsCount || 0,
      })

      // Load recent completed workouts
      const { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select(
          `
          *,
          training_plan:training_plans(name)
        `,
        )
        .eq("client_id", clientId)
        .eq("status", "Completed")
        .order("completed_date", { ascending: false })
        .limit(4)

      if (sessionsError) throw sessionsError
      setRecentWorkouts(sessions || [])
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const statsDisplay = [
    { title: "Active Plans", value: stats.activePlans.toString(), icon: Calendar, color: "text-blue-600" },
    {
      title: "Completed Plans",
      value: stats.completedPlans.toString(),
      icon: CheckCircle,
      color: "text-green-600",
    },
    { title: "Total Workouts", value: stats.totalWorkouts.toString(), icon: Dumbbell, color: "text-purple-600" },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userName}!</h1>
          <p className="text-gray-600 mt-2">Here's an overview of your fitness journey.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statsDisplay.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>What would you like to do today?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/client/workouts">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Start Today's Workout
                </Button>
              </Link>
              <Link href="/client/history">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Workout History
                </Button>
              </Link>
              <Link href="/client/profile">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Update Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Workouts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Workouts</CardTitle>
              <CardDescription>Your latest completed sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWorkouts.length > 0 ? (
                  recentWorkouts.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{session.training_plan?.name || "N/A Plan"}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(session.completed_date!).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <Badge variant="default">Completed</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No completed workouts yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
