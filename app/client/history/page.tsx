"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, CheckCircle, Clock, TrendingUp, Eye } from "lucide-react"
import { ClientNavigation } from "@/components/client-navigation"
import { supabase } from "@/lib/supabase"

export default function ClientHistoryPage() {
  const [workoutHistory, setWorkoutHistory] = useState([])
  const [userId, setUserId] = useState("")

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadWorkoutHistory(id)
    }
  }, [])

  const loadWorkoutHistory = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(`
        *,
        training_plan:training_plans(name),
        exercise_feedback(feedback)
      `)
        .eq("client_id", clientId)
        .eq("status", "Completed")
        .order("completed_date", { ascending: false })

      if (error) throw error

      const processedHistory =
        data?.map((workout) => ({
          id: workout.id,
          name: workout.training_plan?.name || "Workout",
          date: workout.completed_date?.split("T")[0] || workout.scheduled_date,
          duration: workout.duration_minutes || 0,
          exercises: 0, // This could be calculated from plan_exercises
          completed: true,
          feedback: workout.exercise_feedback?.[0]?.feedback || "Completed workout",
        })) || []

      setWorkoutHistory(processedHistory)
    } catch (error) {
      console.error("Error loading workout history:", error)
    }
  }

  const totalWorkouts = workoutHistory.length
  const totalDuration = workoutHistory.reduce((sum, workout) => sum + workout.duration, 0)
  const averageDuration = Math.round(totalDuration / totalWorkouts)
  const currentStreak = 5 // Mock streak calculation

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workout History</h1>
          <p className="text-gray-600 mt-2">Track your fitness journey and progress</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Workouts</p>
                  <p className="text-2xl font-bold text-gray-900">{totalWorkouts}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Time</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(totalDuration / 60)}h</p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">{averageDuration}m</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900">{currentStreak}</p>
                </div>
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workout History List */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Workouts</CardTitle>
            <CardDescription>Your completed training sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workoutHistory.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{workout.name}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(workout.date).toLocaleDateString("en-GB")} • {workout.duration} min •{" "}
                        {workout.exercises} exercises
                      </p>
                      {workout.feedback && <p className="text-sm text-gray-500 italic mt-1">"{workout.feedback}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">Completed</Badge>
                    <Button size="icon" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
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
