"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Dumbbell, FileText, Plus, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase } from "@/lib/supabase"

export default function CoachDashboard() {
  const [userName, setUserName] = useState("")
  const [userId, setUserId] = useState("")
  const [stats, setStats] = useState({
    activeClients: 0,
    exercisesCount: 0,
    trainingPlans: 0,
    monthlyRevenue: 0,
  })
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
    const name = localStorage.getItem("userName") || "Coach"
    const id = localStorage.getItem("userId") || ""
    setUserName(name)
    setUserId(id)

    if (id) {
      loadDashboardData(id)
    }
  }, [])

  const loadDashboardData = async (coachId: string) => {
    try {
      // Load exercises count
      const { count: exercisesCount } = await supabase
        .from("exercises")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)

      // Load training plans count
      const { count: plansCount } = await supabase
        .from("training_plans")
        .select("*", { count: "exact", head: true })
        .eq("coach_id", coachId)

      // Load active clients count
      const { count: clientsCount } = await supabase
        .from("training_plans")
        .select("client_id", { count: "exact", head: true })
        .eq("coach_id", coachId)
        .eq("status", "Active")

      // Load monthly revenue
      const { data: invoices } = await supabase
        .from("invoices")
        .select("amount")
        .eq("coach_id", coachId)
        .eq("status", "Paid")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

      const monthlyRevenue = invoices?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0

      setStats({
        activeClients: clientsCount || 0,
        exercisesCount: exercisesCount || 0,
        trainingPlans: plansCount || 0,
        monthlyRevenue,
      })

      // Load recent workout sessions for activity
      const { data: sessions } = await supabase
        .from("workout_sessions")
        .select(`
          *,
          training_plan:training_plans(
            client:users!training_plans_client_id_fkey(name)
          )
        `)
        .eq("training_plans.coach_id", coachId)
        .order("updated_at", { ascending: false })
        .limit(4)

      if (sessions) {
        const activity = sessions.map((session) => ({
          client: session.training_plan?.client?.name || "Unknown",
          action: session.status === "Completed" ? "Completed workout" : "Updated workout",
          time: new Date(session.updated_at).toLocaleString(),
        }))
        setRecentActivity(activity)
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    }
  }

  const statsDisplay = [
    { title: "Active Clients", value: stats.activeClients.toString(), icon: Users, color: "text-blue-600" },
    { title: "Exercises in Library", value: stats.exercisesCount.toString(), icon: Dumbbell, color: "text-green-600" },
    { title: "Training Plans", value: stats.trainingPlans.toString(), icon: Calendar, color: "text-purple-600" },
    {
      title: "Monthly Revenue",
      value: `$${stats.monthlyRevenue.toFixed(0)}`,
      icon: DollarSign,
      color: "text-yellow-600",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userName}!</h1>
          <p className="text-gray-600 mt-2">Here's what's happening with your clients today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <CardDescription>Common tasks to get you started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/coach/exercises">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Exercise
                </Button>
              </Link>
              <Link href="/coach/training-plans">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Create Training Plan
                </Button>
              </Link>
              <Link href="/coach/invoices">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Invoice
                </Button>
              </Link>
              <Link href="/coach/clients">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Clients
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your clients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{activity.client}</p>
                        <p className="text-sm text-gray-600">{activity.action}</p>
                      </div>
                      <Badge variant="secondary">{activity.time}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
