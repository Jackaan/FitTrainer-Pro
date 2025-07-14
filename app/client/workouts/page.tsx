"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CheckCircle, MessageSquare, Trophy } from "lucide-react"
import { ClientNavigation } from "@/components/client-navigation"
import { supabase, type WorkoutSession, type PlanExercise, type ExerciseFeedback } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface ExerciseWithFeedback extends PlanExercise {
  feedback?: ExerciseFeedback
}

export default function ClientWorkoutsPage() {
  const [userId, setUserId] = useState("")
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null)
  const [exercises, setExercises] = useState<ExerciseWithFeedback[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithFeedback | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isFinishing, setIsFinishing] = useState(false)
  const [startTime] = useState(new Date())
  const router = useRouter()

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadCurrentWorkout(id)
    }
  }, [])

  const loadCurrentWorkout = async (clientId: string) => {
    try {
      setIsLoading(true)

      // Calculate 7 days from now for visibility check
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      const today = new Date().toISOString().split("T")[0]
      const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split("T")[0]

      // First, try to find an active workout session
      let { data: session, error: sessionError } = await supabase
        .from("workout_sessions")
        .select(`
        *,
        training_plan:training_plans(name, start_date, status)
      `)
        .eq("client_id", clientId)
        .in("status", ["Scheduled", "In Progress"])
        .order("scheduled_date", { ascending: true })
        .limit(1)
        .single()

      // If no active session, look for visible active training plans and create a session
      if (!session) {
        const { data: visiblePlans } = await supabase
          .from("training_plans")
          .select("*")
          .eq("client_id", clientId)
          .in("status", ["Active"]) // Only Active plans can have new workout sessions
          .or(`start_date.is.null,start_date.lte.${sevenDaysFromNowStr}`)
          .order("start_date", { ascending: true })

        // Find a plan that has already started (today or earlier)
        const activePlansToday = visiblePlans?.filter((plan) => !plan.start_date || plan.start_date <= today) || []

        if (activePlansToday.length > 0) {
          // Create a new workout session for today
          const { data: newSession, error: createError } = await supabase
            .from("workout_sessions")
            .insert([
              {
                client_id: clientId,
                plan_id: activePlansToday[0].id,
                scheduled_date: today,
                status: "In Progress",
              },
            ])
            .select(`
            *,
            training_plan:training_plans(name, start_date)
          `)
            .single()

          if (createError) throw createError
          session = newSession
        }
      } else {
        // Update status to In Progress if it was Scheduled
        if (session.status === "Scheduled") {
          await supabase.from("workout_sessions").update({ status: "In Progress" }).eq("id", session.id)
          session.status = "In Progress"
        }
      }

      if (!session) {
        setIsLoading(false)
        return
      }

      setCurrentSession(session)

      // Load exercises for this training plan
      const { data: planExercises, error: exercisesError } = await supabase
        .from("plan_exercises")
        .select(`
        *,
        exercise:exercises(*)
      `)
        .eq("plan_id", session.plan_id)
        .order("order_index", { ascending: true })

      if (exercisesError) throw exercisesError

      // Load existing feedback for this session
      const { data: existingFeedback, error: feedbackError } = await supabase
        .from("exercise_feedback")
        .select("*")
        .eq("session_id", session.id)

      if (feedbackError) throw feedbackError

      // Combine exercises with their feedback
      const exercisesWithFeedback = planExercises?.map((planEx) => {
        const feedback = existingFeedback?.find((fb) => fb.exercise_id === planEx.exercise_id)
        return {
          ...planEx,
          feedback,
        }
      })

      setExercises(exercisesWithFeedback || [])
    } catch (error) {
      console.error("Error loading workout:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExerciseComplete = async (exerciseId: string, planExerciseId: string) => {
    if (!currentSession) return

    try {
      const exercise = exercises.find((ex) => ex.id === planExerciseId)
      if (!exercise) return

      const isCurrentlyCompleted = exercise.feedback?.completed || false
      const newCompletedState = !isCurrentlyCompleted

      if (exercise.feedback) {
        // Update existing feedback
        const { error } = await supabase
          .from("exercise_feedback")
          .update({ completed: newCompletedState })
          .eq("id", exercise.feedback.id)

        if (error) throw error

        // Update local state
        setExercises(
          exercises.map((ex) =>
            ex.id === planExerciseId ? { ...ex, feedback: { ...ex.feedback!, completed: newCompletedState } } : ex,
          ),
        )
      } else {
        // Create new feedback record
        const { data: newFeedback, error } = await supabase
          .from("exercise_feedback")
          .insert([
            {
              session_id: currentSession.id,
              exercise_id: exerciseId,
              completed: newCompletedState,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Update local state
        setExercises(exercises.map((ex) => (ex.id === planExerciseId ? { ...ex, feedback: newFeedback } : ex)))
      }
    } catch (error) {
      console.error("Error updating exercise completion:", error)
    }
  }

  const saveFeedback = async () => {
    if (!selectedExercise || !currentSession) return

    try {
      if (selectedExercise.feedback) {
        // Update existing feedback
        const { error } = await supabase
          .from("exercise_feedback")
          .update({ feedback })
          .eq("id", selectedExercise.feedback.id)

        if (error) throw error

        // Update local state
        setExercises(
          exercises.map((ex) =>
            ex.id === selectedExercise.id ? { ...ex, feedback: { ...ex.feedback!, feedback } } : ex,
          ),
        )
      } else {
        // Create new feedback record
        const { data: newFeedback, error } = await supabase
          .from("exercise_feedback")
          .insert([
            {
              session_id: currentSession.id,
              exercise_id: selectedExercise.exercise_id,
              completed: false,
              feedback,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Update local state
        setExercises(exercises.map((ex) => (ex.id === selectedExercise.id ? { ...ex, feedback: newFeedback } : ex)))
      }

      setSelectedExercise(null)
      setFeedback("")
    } catch (error) {
      console.error("Error saving feedback:", error)
    }
  }

  const finishWorkout = async () => {
    if (!currentSession) return

    try {
      setIsFinishing(true)

      // Calculate workout duration
      const endTime = new Date()
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))

      // Update workout session to completed
      const { error } = await supabase
        .from("workout_sessions")
        .update({
          status: "Completed",
          completed_date: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq("id", currentSession.id)

      if (error) throw error

      // Show success message and redirect to dashboard
      alert("🎉 Workout completed! Great job!")
      router.push("/client/dashboard")
    } catch (error) {
      console.error("Error finishing workout:", error)
      alert("Failed to finish workout. Please try again.")
    } finally {
      setIsFinishing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading workout...</div>
        </div>
      </div>
    )
  }

  if (!currentSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Workout</h1>
            <p className="text-gray-600 mb-8">You don't have any scheduled workouts for today.</p>
            <Button onClick={() => router.push("/client/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    )
  }

  const completedCount = exercises.filter((ex) => ex.feedback?.completed).length
  const progressPercentage = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0
  const allExercisesCompleted = completedCount === exercises.length && exercises.length > 0

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Current Workout</h1>
          <p className="text-gray-600 mt-2">
            {currentSession.training_plan?.name} - {new Date(currentSession.scheduled_date).toLocaleDateString("en-GB")}
          </p>
        </div>

        {/* Workout Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Workout Progress</span>
              <Badge variant={allExercisesCompleted ? "default" : "secondary"}>
                {completedCount}/{exercises.length} Complete
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">{Math.round(progressPercentage)}% completed</p>
          </CardContent>
        </Card>

        {/* Exercise List */}
        <div className="space-y-6">
          {exercises.map((exercise, index) => (
            <Card key={exercise.id} className={`${exercise.feedback?.completed ? "bg-green-50 border-green-200" : ""}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={exercise.feedback?.completed || false}
                      onCheckedChange={() => toggleExerciseComplete(exercise.exercise_id, exercise.id)}
                    />
                    <div>
                      <CardTitle
                        className={`text-lg ${exercise.feedback?.completed ? "line-through text-gray-500" : ""}`}
                      >
                        {index + 1}. {exercise.exercise?.name}
                      </CardTitle>
                      {exercise.feedback?.completed && (
                        <Badge variant="default" className="mt-1">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedExercise(exercise)
                          setFeedback(exercise.feedback?.feedback || "")
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {exercise.feedback?.feedback ? "Edit" : "Add"} Feedback
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Exercise Feedback</DialogTitle>
                        <DialogDescription>How did {exercise.exercise?.name} feel? Add your notes.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="How did this exercise feel? Any challenges or improvements?"
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveFeedback} className="flex-1">
                            Save Feedback
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedExercise(null)
                              setFeedback("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">{exercise.sets}</div>
                    <div className="text-sm text-gray-600">Sets</div>
                  </div>
                  {exercise.reps && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-green-600">{exercise.reps}</div>
                      <div className="text-sm text-gray-600">Reps</div>
                    </div>
                  )}
                  {exercise.weight && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-purple-600">{exercise.weight}</div>
                      <div className="text-sm text-gray-600">kg</div>
                    </div>
                  )}
                  {exercise.time_minutes && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-lg font-bold text-orange-600">{exercise.time_minutes}</div>
                      <div className="text-sm text-gray-600">minutes</div>
                    </div>
                  )}
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-yellow-600">{exercise.rest_seconds}</div>
                    <div className="text-sm text-gray-600">sec rest</div>
                  </div>
                </div>

                {exercise.feedback?.feedback && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <p className="text-sm text-gray-700 italic">"{exercise.feedback.feedback}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Finish Workout Button */}
        <div className="mt-8 text-center">
          <Button size="lg" className="px-8" disabled={!allExercisesCompleted || isFinishing} onClick={finishWorkout}>
            <Trophy className="mr-2 h-5 w-5" />
            {isFinishing
              ? "Finishing..."
              : allExercisesCompleted
                ? "Finish Workout"
                : `Complete ${exercises.length - completedCount} more exercises`}
          </Button>
          {allExercisesCompleted && (
            <p className="text-sm text-green-600 mt-2">🎉 All exercises completed! Ready to finish your workout.</p>
          )}
        </div>
      </div>
    </div>
  )
}
