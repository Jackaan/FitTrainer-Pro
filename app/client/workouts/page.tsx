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
import { toast } from "@/hooks/use-toast" // Corrected import path

interface ExerciseWithFeedback extends PlanExercise {
  feedback?: ExerciseFeedback
}

interface WorkoutSessionWithExercises extends WorkoutSession {
  exercises: ExerciseWithFeedback[]
}

export default function ClientWorkoutsPage() {
  const [userId, setUserId] = useState("")
  const [currentSessions, setCurrentSessions] = useState<WorkoutSessionWithExercises[]>([])
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
      loadCurrentWorkouts(id)
    }
  }, [])

  const loadCurrentWorkouts = async (clientId: string) => {
    try {
      setIsLoading(true)
      const today = new Date().toISOString().split("T")[0]

      // Fetch all active workout sessions for today
      let { data: sessions, error: sessionsError } = await supabase
        .from("workout_sessions")
        .select(
          `
          *,
          training_plan:training_plans(id, name, start_date, status)
        `,
        )
        .eq("client_id", clientId)
        .in("status", ["Scheduled", "In Progress"])
        .eq("scheduled_date", today)
        .order("scheduled_date", { ascending: true })

      if (sessionsError) throw sessionsError

      // If no sessions for today, check for active plans and create one session for each active plan
      if (!sessions || sessions.length === 0) {
        const { data: activePlans } = await supabase
          .from("training_plans")
          .select("id, name, start_date")
          .eq("client_id", clientId)
          .eq("status", "Active")
          .order("start_date", { ascending: true })

        const plansToCreateSessionsFor =
          activePlans?.filter((plan) => !plan.start_date || plan.start_date <= today) || []

        const newSessionsData = []
        for (const plan of plansToCreateSessionsFor) {
          const { data: newSession, error: createError } = await supabase
            .from("workout_sessions")
            .insert([
              {
                client_id: clientId,
                plan_id: plan.id,
                scheduled_date: today,
                status: "In Progress",
              },
            ])
            .select(
              `
              *,
              training_plan:training_plans(id, name, start_date)
            `,
            )
            .single()

          if (createError) {
            console.error("Error creating new session:", createError)
            continue
          }
          newSessionsData.push(newSession)
        }
        sessions = newSessionsData
      } else {
        // Update status to In Progress if it was Scheduled
        for (const session of sessions) {
          if (session.status === "Scheduled") {
            await supabase.from("workout_sessions").update({ status: "In Progress" }).eq("id", session.id)
            session.status = "In Progress"
          }
        }
      }

      if (!sessions || sessions.length === 0) {
        setIsLoading(false)
        return
      }

      const sessionsWithExercises: WorkoutSessionWithExercises[] = []

      for (const session of sessions) {
        // Load exercises for this training plan
        const { data: planExercises, error: exercisesError } = await supabase
          .from("plan_exercises")
          .select(
            `
            *,
            exercise:exercises(*)
          `,
          )
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

        sessionsWithExercises.push({
          ...session,
          exercises: exercisesWithFeedback || [],
        })
      }

      setCurrentSessions(sessionsWithExercises)
    } catch (error) {
      console.error("Error loading workout:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExerciseComplete = async (
    sessionId: string,
    exerciseId: string,
    planExerciseId: string,
    sessionIndex: number,
    exerciseIndex: number,
  ) => {
    try {
      const sessionToUpdate = currentSessions[sessionIndex]
      if (!sessionToUpdate) return

      const exerciseToUpdate = sessionToUpdate.exercises[exerciseIndex]
      if (!exerciseToUpdate) return

      const isCurrentlyCompleted = exerciseToUpdate.feedback?.completed || false
      const newCompletedState = !isCurrentlyCompleted

      if (exerciseToUpdate.feedback) {
        // Update existing feedback
        const { error } = await supabase
          .from("exercise_feedback")
          .update({ completed: newCompletedState })
          .eq("id", exerciseToUpdate.feedback.id)

        if (error) throw error

        // Update local state
        setCurrentSessions((prevSessions) =>
          prevSessions.map((s, sIdx) =>
            sIdx === sessionIndex
              ? {
                  ...s,
                  exercises: s.exercises.map((ex, exIdx) =>
                    exIdx === exerciseIndex
                      ? { ...ex, feedback: { ...ex.feedback!, completed: newCompletedState } }
                      : ex,
                  ),
                }
              : s,
          ),
        )
      } else {
        // Create new feedback record
        const { data: newFeedback, error } = await supabase
          .from("exercise_feedback")
          .insert([
            {
              session_id: sessionId,
              exercise_id: exerciseId,
              completed: newCompletedState,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Update local state
        setCurrentSessions((prevSessions) =>
          prevSessions.map((s, sIdx) =>
            sIdx === sessionIndex
              ? {
                  ...s,
                  exercises: s.exercises.map((ex, exIdx) =>
                    exIdx === exerciseIndex ? { ...ex, feedback: newFeedback } : ex,
                  ),
                }
              : s,
          ),
        )
      }
    } catch (error) {
      console.error("Error updating exercise completion:", error)
    }
  }

  const saveFeedback = async () => {
    if (!selectedExercise) return

    try {
      const sessionId = currentSessions.find((s) => s.exercises.some((ex) => ex.id === selectedExercise.id))?.id
      if (!sessionId) return

      if (selectedExercise.feedback) {
        // Update existing feedback
        const { error } = await supabase
          .from("exercise_feedback")
          .update({ feedback })
          .eq("id", selectedExercise.feedback.id)

        if (error) throw error

        // Update local state
        setCurrentSessions((prevSessions) =>
          prevSessions.map((s) => ({
            ...s,
            exercises: s.exercises.map((ex) =>
              ex.id === selectedExercise.id ? { ...ex, feedback: { ...ex.feedback!, feedback } } : ex,
            ),
          })),
        )
      } else {
        // Create new feedback record
        const { data: newFeedback, error } = await supabase
          .from("exercise_feedback")
          .insert([
            {
              session_id: sessionId,
              exercise_id: selectedExercise.exercise_id,
              completed: false,
              feedback,
            },
          ])
          .select()
          .single()

        if (error) throw error

        // Update local state
        setCurrentSessions((prevSessions) =>
          prevSessions.map((s) => ({
            ...s,
            exercises: s.exercises.map((ex) => (ex.id === selectedExercise.id ? { ...ex, feedback: newFeedback } : ex)),
          })),
        )
      }

      setSelectedExercise(null)
      setFeedback("")
    } catch (error) {
      console.error("Error saving feedback:", error)
    }
  }

  const finishWorkout = async (sessionId: string) => {
    const sessionToFinish = currentSessions.find((s) => s.id === sessionId)
    if (!sessionToFinish) return

    try {
      setIsFinishing(true)

      // Calculate workout duration (using the global startTime for simplicity, could be per session)
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
        .eq("id", sessionId)

      if (error) throw error

      // Remove the finished session from the list
      setCurrentSessions((prevSessions) => prevSessions.filter((s) => s.id !== sessionId))

      // Show success message
      toast({
        title: "Workout Completed!",
        description: `${sessionToFinish.training_plan?.name || "Your workout"} has been successfully completed.`,
      })

      // If no more sessions, redirect to dashboard
      if (currentSessions.length === 1) {
        router.push("/client/dashboard")
      }
    } catch (error) {
      console.error("Error finishing workout:", error)
      toast({
        title: "Error",
        description: "Failed to finish workout. Please try again.",
        variant: "destructive",
      })
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

  if (currentSessions.length === 0) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Current Workouts</h1>
          <p className="text-gray-600 mt-2">Your scheduled training sessions for today.</p>
        </div>

        {currentSessions.map((session, sessionIndex) => {
          const completedCount = session.exercises.filter((ex) => ex.feedback?.completed).length
          const progressPercentage =
            session.exercises.length > 0 ? (completedCount / session.exercises.length) * 100 : 0
          const allExercisesCompleted = completedCount === session.exercises.length && session.exercises.length > 0

          return (
            <div key={session.id} className="mb-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {session.training_plan?.name} - {new Date(session.scheduled_date).toLocaleDateString("en-GB")}
              </h2>

              {/* Workout Progress */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Workout Progress</span>
                    <Badge variant={allExercisesCompleted ? "default" : "secondary"}>
                      {completedCount}/{session.exercises.length} Complete
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
                {session.exercises.map((exercise, exerciseIndex) => (
                  <Card
                    key={exercise.id}
                    className={`${exercise.feedback?.completed ? "bg-green-50 border-green-200" : ""}`}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={exercise.feedback?.completed || false}
                            onCheckedChange={() =>
                              toggleExerciseComplete(
                                session.id,
                                exercise.exercise_id,
                                exercise.id,
                                sessionIndex,
                                exerciseIndex,
                              )
                            }
                          />
                          <div>
                            <CardTitle
                              className={`text-lg ${exercise.feedback?.completed ? "line-through text-gray-500" : ""}`}
                            >
                              {exerciseIndex + 1}. {exercise.exercise?.name}
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
                              <DialogDescription>
                                How did {selectedExercise?.exercise?.name} feel? Add your notes.
                              </DialogDescription>
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
                <Button
                  size="lg"
                  className="px-8"
                  disabled={!allExercisesCompleted || isFinishing}
                  onClick={() => finishWorkout(session.id)}
                >
                  <Trophy className="mr-2 h-5 w-5" />
                  {isFinishing
                    ? "Finishing..."
                    : allExercisesCompleted
                      ? "Finish Workout"
                      : `Complete ${session.exercises.length - completedCount} more exercises`}
                </Button>
                {allExercisesCompleted && (
                  <p className="text-sm text-green-600 mt-2">
                    🎉 All exercises completed! Ready to finish your workout.
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
