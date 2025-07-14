"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import Link from "next/link"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast" // Import toast for error messages

interface PlanExerciseState {
  id: string | number // Can be DB ID (string) or temporary ID (number)
  exerciseId: string // The actual UUID of the exercise from the 'exercises' table
  name: string
  type: "Weighted" | "Bodyweight" | "Cardio"
  sets: number
  reps: number
  weight: number
  time: number // Corresponds to time_minutes in DB
  rest: number // Corresponds to rest_seconds in DB
  tempo: string
}

export default function PlanBuilderPage() {
  const params = useParams()
  const planId = params.id as string

  const [planExercises, setPlanExercises] = useState<PlanExerciseState[]>([])
  const [availableExercises, setAvailableExercises] = useState<{ id: string; name: string; type: string }[]>([])
  const [selectedExercise, setSelectedExercise] = useState("")
  const [exerciseConfig, setExerciseConfig] = useState({
    sets: 3,
    reps: 12,
    weight: 0,
    time: 0,
    rest: 60,
    tempo: "2-1-2-1",
  })
  const [isAddExerciseOpen, setIsAddExerciseOpen] = useState(false)
  const [planDetails, setPlanDetails] = useState({
    name: "",
    clientName: "",
    duration: "",
    startDate: "",
    status: "Draft",
    difficulty: "Beginner",
    estimatedDuration: "45-60",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingPlan, setIsLoadingPlan] = useState(true) // New loading state for plan data

  useEffect(() => {
    const loadPlanData = async () => {
      setIsLoadingPlan(true)
      try {
        const { data, error } = await supabase
          .from("training_plans")
          .select(
            `
            *,
            client:users!training_plans_client_id_fkey(name),
            plan_exercises(
              id,
              exercise_id,
              sets,
              reps,
              weight,
              time_minutes,
              rest_seconds,
              tempo,
              order_index,
              exercise:exercises(name, type)
            )
          `,
          )
          .eq("id", planId)
          .single()

        if (error || !data) {
          console.error("Error loading plan data or plan not found:", error)
          toast({
            title: "Error",
            description: "Training plan not found or failed to load.",
            variant: "destructive",
          })
          // Optionally redirect to a different page, e.g., /coach/training-plans
          // router.push("/coach/training-plans");
          return
        }

        setPlanDetails({
          name: data.name,
          clientName: data.client?.name || "Unknown Client",
          duration: data.duration || "",
          startDate: data.start_date || "",
          status: data.status || "Draft",
          difficulty: data.difficulty || "Beginner",
          estimatedDuration: data.estimated_duration || "45-60",
        })

        const loadedExercises = data.plan_exercises
          .map((pe: any) => ({
            id: pe.id,
            exerciseId: pe.exercise_id,
            name: pe.exercise.name,
            type: pe.exercise.type,
            sets: pe.sets,
            reps: pe.reps || 0,
            weight: pe.weight || 0,
            time: pe.time_minutes || 0,
            rest: pe.rest_seconds,
            tempo: pe.tempo,
          }))
          .sort((a: any, b: any) => a.order_index - b.order_index)

        setPlanExercises(loadedExercises)

        const { data: exList } = await supabase
          .from("exercises")
          .select("id,name,type")
          .eq("coach_id", data.coach_id)
          .order("name")

        setAvailableExercises(exList || [])
      } catch (error) {
        console.error("Unexpected error loading plan data:", error)
        toast({
          title: "Error",
          description: "An unexpected error occurred while loading the plan.",
          variant: "destructive",
        })
      } finally {
        setIsLoadingPlan(false)
      }
    }

    if (planId) {
      loadPlanData()
    }
  }, [planId])

  const handleExerciseChange = useCallback((id: string | number, field: keyof PlanExerciseState, value: any) => {
    setPlanExercises((prev) => prev.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)))
  }, [])

  const handleAddExercise = () => {
    const ex = availableExercises.find((e) => e.id === selectedExercise)
    if (!ex) {
      toast({
        title: "Error",
        description: "Please select an exercise to add.",
        variant: "destructive",
      })
      return
    }

    const tempId = `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` // More robust temporary ID

    setPlanExercises((prev) => [
      ...prev,
      {
        id: tempId,
        exerciseId: ex.id,
        name: ex.name,
        type: ex.type,
        ...exerciseConfig,
      },
    ])

    setSelectedExercise("")
    setExerciseConfig({ sets: 3, reps: 12, weight: 0, time: 0, rest: 60, tempo: "2-1-2-1" })
  }

  const removeExercise = (id: string | number) => {
    setPlanExercises(planExercises.filter((ex) => ex.id !== id))
  }

  const handleSavePlan = async () => {
    if (!planDetails.name || !planDetails.duration || !planDetails.startDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (name, duration, start date).",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      const startDate = new Date(planDetails.startDate)
      const durationMatch = planDetails.duration.match(/(\d+)\s*weeks?/i)
      if (!durationMatch) {
        toast({
          title: "Validation Error",
          description: "Invalid duration format. Please use format like '4 weeks'.",
          variant: "destructive",
        })
        return
      }

      const durationWeeks = Number.parseInt(durationMatch[1])
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + durationWeeks * 7)

      const { error: planError } = await supabase
        .from("training_plans")
        .update({
          name: planDetails.name,
          duration: planDetails.duration,
          start_date: planDetails.startDate,
          end_date: endDate.toISOString().split("T")[0],
          status: planDetails.status,
          difficulty: planDetails.difficulty,
          estimated_duration: planDetails.estimatedDuration,
        })
        .eq("id", planId)

      if (planError) throw planError

      const { error: deleteError } = await supabase.from("plan_exercises").delete().eq("plan_id", planId)

      if (deleteError) throw deleteError

      if (planExercises.length > 0) {
        const exerciseData = planExercises.map((ex, idx) => ({
          plan_id: planId,
          exercise_id: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps || null,
          weight: ex.weight || null,
          time_minutes: ex.time || null,
          rest_seconds: ex.rest,
          tempo: ex.tempo,
          order_index: idx,
        }))

        const { error: exerciseError } = await supabase.from("plan_exercises").insert(exerciseData)

        if (exerciseError) throw exerciseError
      }

      toast({
        title: "Success",
        description: "Training plan saved successfully!",
      })
    } catch (error) {
      console.error("Error saving plan:", error)
      toast({
        title: "Error",
        description: "Failed to save training plan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800"
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800"
      case "Advanced":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoadingPlan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CoachNavigation />
        <div className="container mx-auto px-4 py-8 text-center">Loading plan data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/coach/training-plans">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Plan Builder</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="planName">Plan Name</Label>
                <Input
                  id="planName"
                  value={planDetails.name}
                  onChange={(e) => setPlanDetails({ ...planDetails, name: e.target.value })}
                  placeholder="Enter plan name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select
                  value={planDetails.duration}
                  onValueChange={(value) => setPlanDetails({ ...planDetails, duration: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2 weeks">2 weeks</SelectItem>
                    <SelectItem value="4 weeks">4 weeks</SelectItem>
                    <SelectItem value="6 weeks">6 weeks</SelectItem>
                    <SelectItem value="8 weeks">8 weeks</SelectItem>
                    <SelectItem value="12 weeks">12 weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={planDetails.startDate}
                  onChange={(e) => setPlanDetails({ ...planDetails, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={planDetails.status}
                  onValueChange={(value) => setPlanDetails({ ...planDetails, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select
                  value={planDetails.difficulty}
                  onValueChange={(value) => setPlanDetails({ ...planDetails, difficulty: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimatedDuration">Est. Duration (min)</Label>
                <Select
                  value={planDetails.estimatedDuration}
                  onValueChange={(value) => setPlanDetails({ ...planDetails, estimatedDuration: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20-30">20-30 min</SelectItem>
                    <SelectItem value="30-45">30-45 min</SelectItem>
                    <SelectItem value="45-60">45-60 min</SelectItem>
                    <SelectItem value="60-75">60-75 min</SelectItem>
                    <SelectItem value="75-90">75-90 min</SelectItem>
                    <SelectItem value="90+">90+ min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-gray-600 mt-2">Client: {planDetails.clientName}</p>
          </div>
          <Button onClick={handleSavePlan} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Plan"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Exercise List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Exercises</CardTitle>
                  <Dialog open={isAddExerciseOpen} onOpenChange={setIsAddExerciseOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Exercise
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Exercise to Plan</DialogTitle>
                        <DialogDescription>Configure the exercise parameters</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Exercise</Label>
                          <Select onValueChange={setSelectedExercise} value={selectedExercise}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select exercise" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableExercises.map((ex) => (
                                <SelectItem key={ex.id} value={ex.id}>
                                  {ex.name} ({ex.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Sets</Label>
                            <Input
                              type="number"
                              value={exerciseConfig.sets}
                              onChange={(e) =>
                                setExerciseConfig({ ...exerciseConfig, sets: Number.parseInt(e.target.value) })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Reps</Label>
                            <Input
                              type="number"
                              value={exerciseConfig.reps}
                              onChange={(e) =>
                                setExerciseConfig({ ...exerciseConfig, reps: Number.parseInt(e.target.value) })
                              }
                            />
                          </div>
                        </div>

                        {selectedExercise &&
                          availableExercises.find((ex) => ex.id === selectedExercise)?.type === "Weighted" && (
                            <div className="space-y-2">
                              <Label>Weight (kg)</Label>
                              <Input
                                type="number"
                                step="0.5"
                                value={exerciseConfig.weight}
                                onChange={(e) =>
                                  setExerciseConfig({ ...exerciseConfig, weight: Number.parseFloat(e.target.value) })
                                }
                                placeholder="20"
                              />
                            </div>
                          )}

                        {selectedExercise &&
                          availableExercises.find((ex) => ex.id === selectedExercise)?.type === "Cardio" && (
                            <div className="space-y-2">
                              <Label>Time (minutes)</Label>
                              <Input
                                type="number"
                                value={exerciseConfig.time}
                                onChange={(e) =>
                                  setExerciseConfig({ ...exerciseConfig, time: Number.parseInt(e.target.value) })
                                }
                              />
                            </div>
                          )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Rest (seconds)</Label>
                            <Input
                              type="number"
                              value={exerciseConfig.rest}
                              onChange={(e) =>
                                setExerciseConfig({ ...exerciseConfig, rest: Number.parseInt(e.target.value) })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tempo</Label>
                            <Input
                              value={exerciseConfig.tempo}
                              onChange={(e) => setExerciseConfig({ ...exerciseConfig, tempo: e.target.value })}
                              placeholder="2-1-2-1"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={() => {
                            handleAddExercise()
                            setIsAddExerciseOpen(false)
                          }}
                          className="w-full"
                        >
                          Add to Plan
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {planExercises.map((exercise, index) => (
                    <Card key={exercise.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold">
                              {index + 1}. {exercise.name}
                            </h3>
                            <Badge variant="outline" className="mt-1">
                              {exercise.type}
                            </Badge>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => removeExercise(exercise.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="space-y-2">
                            <Label htmlFor={`sets-${exercise.id}`}>Sets</Label>
                            <Input
                              id={`sets-${exercise.id}`}
                              type="number"
                              value={exercise.sets}
                              onChange={(e) =>
                                handleExerciseChange(exercise.id, "sets", Number.parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`reps-${exercise.id}`}>Reps</Label>
                            <Input
                              id={`reps-${exercise.id}`}
                              type="number"
                              value={exercise.reps}
                              onChange={(e) =>
                                handleExerciseChange(exercise.id, "reps", Number.parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                          {exercise.type === "Weighted" && (
                            <div className="space-y-2">
                              <Label htmlFor={`weight-${exercise.id}`}>Weight (kg)</Label>
                              <Input
                                id={`weight-${exercise.id}`}
                                type="number"
                                step="0.5"
                                value={exercise.weight || ""}
                                onChange={(e) =>
                                  handleExerciseChange(exercise.id, "weight", Number.parseFloat(e.target.value) || 0)
                                }
                                placeholder="0"
                              />
                            </div>
                          )}
                          {exercise.type === "Cardio" && (
                            <div className="space-y-2">
                              <Label htmlFor={`time-${exercise.id}`}>Time (minutes)</Label>
                              <Input
                                id={`time-${exercise.id}`}
                                type="number"
                                value={exercise.time || ""}
                                onChange={(e) =>
                                  handleExerciseChange(exercise.id, "time", Number.parseInt(e.target.value) || 0)
                                }
                                placeholder="0"
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor={`rest-${exercise.id}`}>Rest (seconds)</Label>
                            <Input
                              id={`rest-${exercise.id}`}
                              type="number"
                              value={exercise.rest}
                              onChange={(e) =>
                                handleExerciseChange(exercise.id, "rest", Number.parseInt(e.target.value) || 0)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`tempo-${exercise.id}`}>Tempo</Label>
                            <Input
                              id={`tempo-${exercise.id}`}
                              value={exercise.tempo}
                              onChange={(e) => handleExerciseChange(exercise.id, "tempo", e.target.value)}
                              placeholder="2-1-2-1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Exercises:</span>
                  <span className="font-medium">{planExercises.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Duration:</span>
                  <span className="font-medium">{planDetails.estimatedDuration} min</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Difficulty:</span>
                  <Badge className={getDifficultyColor(planDetails.difficulty)}>{planDetails.difficulty}</Badge>
                </div>
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Exercise Types:</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Weighted:</span>
                      <span>{planExercises.filter((ex) => ex.type === "Weighted").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Bodyweight:</span>
                      <span>{planExercises.filter((ex) => ex.type === "Bodyweight").length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cardio:</span>
                      <span>{planExercises.filter((ex) => ex.type === "Cardio").length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
