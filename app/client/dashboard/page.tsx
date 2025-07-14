"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, CheckCircle, Clock, Dumbbell, TrendingUp } from "lucide-react"
import Link from "next/link"
import { ClientNavigation } from "@/components/client-navigation"
import { supabase, type WorkoutSession, type TrainingPlan } from "@/lib/supabase"

export default function ClientDashboard() {
  const [userName, setUserName] = useState("")
  const [userId, setUserId] = useState("")
  const [currentPlan, setCurrentPlan] = useState<TrainingPlan | null>(null)
  const [planProgress, setPlanProgress] = useState(0)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutSession[]>([])
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutSession[]>([])
  const [stats, setStats] = useState({
    workoutsThisWeek: 0,
    targetWorkouts: 3,
    currentStreak: 5,
    completedPlans: 0,
  })

  useEffect(() => {
    const name = localStorage.getItem("userName") || "Client"
    const id = localStorage.getItem("userId") || ""
    setUserName(name)
    setUserId(id)

    if (id) {
      loadClientData(id)
    }
  }, [])

  const calculatePlanProgress = (plan: TrainingPlan, completedSessions: number, totalSessions: number) => {
    if (!plan.start_date || !plan.duration) return 0

    // Calculate progress based on time elapsed and sessions completed
    const startDate = new Date(plan.start_date)
    const today = new Date()

    // Extract duration in weeks
    const durationMatch = plan.duration.match(/(\d+)\s*weeks?/i)
    if (!durationMatch) return 0

    const durationWeeks = Number.parseInt(durationMatch[1])
    const totalDays = durationWeeks * 7
    const daysElapsed = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Calculate progress based on both time and sessions
    const timeProgress = Math.min(100, (daysElapsed / totalDays) * 100)
    const sessionProgress = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0

    // Use the higher of the two progress indicators, but cap at 100%
    return Math.min(100, Math.max(timeProgress, sessionProgress))
  }

  const loadClientData = async (clientId: string) => {
    try {
      // Load user profile to get workout preferences
      const { data: userProfile } = await supabase.from("users").select("workouts_per_week").eq("id", clientId).single()

      const targetWorkouts = userProfile?.workouts_per_week || 3

      // Load current and upcoming training plans (only show Active or Completed plans)
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

      const today = new Date().toISOString().split("T")[0]
      const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split("T")[0]

      // Include plans that started yesterday or earlier (not just today) and are Active or Completed
      const { data: visiblePlans } = await supabase
        .from("training_plans")
        .select("*")
        .eq("client_id", clientId)
        .in("status", ["Active", "Completed"])
        .or(`start_date.is.null,start_date.lte.${sevenDaysFromNowStr}`)
        .order("start_date", { ascending: true })

      // Set the first visible plan as current plan (prioritize plans that have already started)
      if (visiblePlans && visiblePlans.length > 0) {
        // Find plans that have already started (today or earlier)
        const startedPlans = visiblePlans.filter((plan) => !plan.start_date || plan.start_date <= today)
        const currentActivePlan = startedPlans.length > 0 ? startedPlans[0] : visiblePlans[0]

        setCurrentPlan(currentActivePlan)

        // Calculate actual progress for the current plan
        if (currentActivePlan) {
          // Get total completed sessions for this plan
          const { count: completedSessionsCount } = await supabase
            .from("workout_sessions")
            .select("*", { count: "exact", head: true })
            .eq("client_id", clientId)
            .eq("plan_id", currentActivePlan.id)
            .eq("status", "Completed")

          // Get total planned sessions (estimate based on plan duration and target workouts per week)
          const durationMatch = currentActivePlan.duration.match(/(\d+)\s*weeks?/i)
          const durationWeeks = durationMatch ? Number.parseInt(durationMatch[1]) : 4
          const estimatedTotalSessions = durationWeeks * targetWorkouts

          const actualProgress = calculatePlanProgress(
            currentActivePlan,
            completedSessionsCount || 0,
            estimatedTotalSessions,
          )
          setPlanProgress(Math.round(actualProgress))
        }
      }

      // Load upcoming workout sessions for visible plans
      if (visiblePlans && visiblePlans.length > 0) {
        const planIds = visiblePlans.map((plan) => plan.id)

        const { data: upcoming } = await supabase
          .from("workout_sessions")
          .select(`
          *,
          training_plan:training_plans(name, start_date)
        `)
          .eq("client_id", clientId)
          .in("plan_id", planIds)
          .in("status", ["Scheduled", "In Progress"])
          .gte("scheduled_date", today)
          .order("scheduled_date", { ascending: true })
          .limit(3)

        setUpcomingWorkouts(upcoming || [])

        // If no scheduled sessions exist, create one for today for plans that have started
        if (!upcoming || upcoming.length === 0) {
          const activePlansToday = visiblePlans.filter((plan) => !plan.start_date || plan.start_date <= today)

          if (activePlansToday.length > 0) {
            // Create a workout session for today for the first active plan
            const { data: newSession, error: createError } = await supabase
              .from("workout_sessions")
              .insert([
                {
                  client_id: clientId,
                  plan_id: activePlansToday[0].id,
                  scheduled_date: today,
                  status: "Scheduled",
                },
              ])
              .select(`
              *,
              training_plan:training_plans(name, start_date)
            `)
              .single()

            if (!createError && newSession) {
              setUpcomingWorkouts([newSession])
            }
          }
        }
      }

      // Load recent completed workouts
      const { data: recent } = await supabase
        .from("workout_sessions")
        .select(`
        *,
        training_plan:training_plans(name),
        exercise_feedback(feedback)
      `)
        .eq("client_id", clientId)
        .eq("status", "Completed")
        .order("completed_date", { ascending: false })
        .limit(3)

      // Process recent workouts to get feedback
      const processedRecent =
        recent?.map((workout) => ({
          ...workout,
          feedback: workout.exercise_feedback?.[0]?.feedback || "Great workout!",
        })) || []

      setRecentWorkouts(processedRecent)

      // Calculate stats
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())

      const { count: weeklyCount } = await supabase
        .from("workout_sessions")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "Completed")
        .gte("completed_date", weekStart.toISOString())

      const { count: completedPlansCount } = await supabase
        .from("training_plans")
        .select("*", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("status", "Completed")

      setStats({
        workoutsThisWeek: weeklyCount || 0,
        targetWorkouts: targetWorkouts,
        currentStreak: 5, // This would need more complex calculation
        completedPlans: completedPlansCount || 0,
      })
    } catch (error) {
      console.error("Error loading client data:", error)
    }
  }

  const statsDisplay = [
    {
      title: "Workouts This Week",
      value: `${stats.workoutsThisWeek}/${stats.targetWorkouts}`,
      icon: Dumbbell,
      color: "text-blue-600",
    },
    { title: "Current Streak", value: `${stats.currentStreak} days`, icon: TrendingUp, color: "text-green-600" },
    { title: "Next Session", value: upcomingWorkouts[0] ? "Today" : "None", icon: Clock, color: "text-purple-600" },
    { title: "Completed Plans", value: stats.completedPlans.toString(), icon: CheckCircle, color: "text-yellow-600" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {userName}!</h1>
          <p className="text-gray-600 mt-2">Ready for your next workout? Let's keep the momentum going!</p>
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

        {/* Current Plan Progress */}
        {currentPlan && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Training Plan Progress</CardTitle>
              <CardDescription>
                {currentPlan.name} - {currentPlan.duration}
                {currentPlan.start_date && (
                  <span className="ml-2 text-sm">
                    (Started: {new Date(currentPlan.start_date).toLocaleDateString("en-GB")})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm text-gray-600">{planProgress}%</span>
                </div>
                <Progress value={planProgress} className="w-full" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{recentWorkouts.length}</div>
                    <div className="text-sm text-gray-600">Workouts Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{upcomingWorkouts.length}</div>
                    <div className="text-sm text-gray-600">Workouts Scheduled</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{currentPlan.duration.split(" ")[0]}</div>
                    <div className="text-sm text-gray-600">Week Duration</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Workouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Workouts
              </CardTitle>
              <CardDescription>Your scheduled training sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingWorkouts.length > 0 ? (
                  upcomingWorkouts.map((workout, index) => (
                    <div key={workout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{workout.training_plan?.name}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(workout.scheduled_date).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <Badge variant="outline">{workout.status}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No upcoming workouts scheduled</p>
                )}
              </div>
              <div className="mt-4">
                <Link href="/client/workouts">
                  <Button className="w-full">View All Workouts</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Recent Workouts
              </CardTitle>
              <CardDescription>Your latest training sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWorkouts.length > 0 ? (
                  recentWorkouts.map((workout, index) => (
                    <div key={workout.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-gray-900">{workout.training_plan?.name}</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-600">
                            {workout.completed_date
                              ? new Date(workout.completed_date).toLocaleDateString("en-GB")
                              : "Recently"}
                          </span>
                        </div>
                      </div>
                      {workout.duration_minutes && (
                        <p className="text-sm text-gray-600">Duration: {workout.duration_minutes} minutes</p>
                      )}
                      {workout.feedback && <p className="text-sm text-gray-500 italic mt-1">"{workout.feedback}"</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No completed workouts yet</p>
                )}
              </div>
              <div className="mt-4">
                <Link href="/client/history">
                  <Button variant="outline" className="w-full bg-transparent">
                    View Full History
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
