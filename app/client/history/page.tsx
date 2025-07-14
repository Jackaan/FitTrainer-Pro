"use client"

import Link from "next/link"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar, Dumbbell, Eye, MessageSquare } from "lucide-react"
import { ClientNavigation } from "@/components/client-navigation"
import { supabase, type WorkoutSession, type PlanExercise, type ExerciseFeedback } from "@/lib/supabase"

interface WorkoutSessionWithDetails extends WorkoutSession {
  training_plan?: { name: string }
  exercises?: (PlanExercise & {
    exercise: { name: string; type: string }
    feedback?: ExerciseFeedback
  })[]
}

export default function ClientHistoryPage() {
  const [userId, setUserId] = useState("")
  const [completedWorkouts, setCompletedWorkouts] = useState<WorkoutSessionWithDetails[]>([])
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutSessionWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadCompletedWorkouts(id)
    }
  }, [])

  const loadCompletedWorkouts = async (clientId: string) => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("workout_sessions")
        .select(
          `
          id,
          scheduled_date,
          completed_date,
          duration_minutes,
          status,
          training_plan:training_plans(name)
        `,
        )
        .eq("client_id", clientId)
        .eq("status", "Completed")
        .order("completed_date", { ascending: false })

      if (error) throw error
      setCompletedWorkouts(data || [])
    } catch (error) {
      console.error("Error loading completed workouts:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWorkoutDetails = async (sessionId: string, planId: string) => {
    try {
      // Fetch plan exercises for the workout's plan
      const { data: planExercises, error: planExercisesError } = await supabase
        .from("plan_exercises")
        .select(
          `
          *,
          exercise:exercises(name, type)
        `,
        )
        .eq("plan_id", planId)
        .order("order_index", { ascending: true })

      if (planExercisesError) throw planExercisesError

      // Fetch feedback for this specific session
      const { data: exerciseFeedback, error: feedbackError } = await supabase
        .from("exercise_feedback")
        .select("*")
        .eq("session_id", sessionId)

      if (feedbackError) throw feedbackError

      // Combine plan exercises with their feedback
      const exercisesWithFeedback = planExercises?.map((planEx) => {
        const feedback = exerciseFeedback?.find((fb) => fb.exercise_id === planEx.exercise_id)
        return {
          ...planEx,
          feedback,
        }
      })

      return exercisesWithFeedback || []
    } catch (error) {
      console.error("Error loading workout details:", error)
      return []
    }
  }

  const handleViewDetails = async (workout: WorkoutSessionWithDetails) => {
    if (workout.plan_id) {
      const exercises = await loadWorkoutDetails(workout.id, workout.plan_id)
      setSelectedWorkout({ ...workout, exercises })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading history...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Workout History</h1>
          <p className="text-gray-600 mt-2">Review your past training sessions and progress.</p>
        </div>

        <div className="space-y-6">
          {completedWorkouts.length > 0 ? (
            completedWorkouts.map((workout) => (
              <Card key={workout.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{workout.training_plan?.name || "Workout Session"}</CardTitle>
                      <p className="text-sm text-gray-600">
                        <Calendar className="inline-block h-4 w-4 mr-1 text-gray-500" />
                        {new Date(workout.completed_date!).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {workout.duration_minutes && (
                        <Badge variant="secondary">
                          <Dumbbell className="h-3 w-3 mr-1" />
                          {workout.duration_minutes} min
                        </Badge>
                      )}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="outline" onClick={() => handleViewDetails(workout)}>
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                        </DialogTrigger>
                        {selectedWorkout && selectedWorkout.id === workout.id && (
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                {selectedWorkout.training_plan?.name || "Workout Session"} Details
                              </DialogTitle>
                              <DialogDescription>
                                Completed on {new Date(selectedWorkout.completed_date!).toLocaleDateString("en-GB")}
                                {selectedWorkout.duration_minutes && ` (${selectedWorkout.duration_minutes} minutes)`}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              {selectedWorkout.exercises && selectedWorkout.exercises.length > 0 ? (
                                selectedWorkout.exercises.map((exercise, index) => (
                                  <Card key={exercise.id}>
                                    <CardHeader>
                                      <CardTitle className="text-base">
                                        {index + 1}. {exercise.exercise?.name}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                          <span className="font-medium">Sets:</span> {exercise.sets}
                                        </div>
                                        {exercise.reps && (
                                          <div>
                                            <span className="font-medium">Reps:</span> {exercise.reps}
                                          </div>
                                        )}
                                        {exercise.weight && (
                                          <div>
                                            <span className="font-medium">Weight:</span> {exercise.weight} kg
                                          </div>
                                        )}
                                        {exercise.time_minutes && (
                                          <div>
                                            <span className="font-medium">Time:</span> {exercise.time_minutes} min
                                          </div>
                                        )}
                                        <div>
                                          <span className="font-medium">Rest:</span> {exercise.rest_seconds} sec
                                        </div>
                                        {exercise.tempo && (
                                          <div>
                                            <span className="font-medium">Tempo:</span> {exercise.tempo}
                                          </div>
                                        )}
                                      </div>
                                      {exercise.feedback?.feedback && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                          <div className="flex items-center gap-1 text-sm text-gray-700 italic">
                                            <MessageSquare className="h-4 w-4" />"{exercise.feedback.feedback}"
                                          </div>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))
                              ) : (
                                <p className="text-center text-gray-500">No exercises found for this workout.</p>
                              )}
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No completed workouts yet</h3>
              <p className="text-gray-500">Start a workout to see your history here!</p>
              <Button asChild className="mt-4">
                <Link href="/client/workouts">Start Workout</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
