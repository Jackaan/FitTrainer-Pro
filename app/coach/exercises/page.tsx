"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Plus, Search, Edit, Trash2, Play } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase, type Exercise } from "@/lib/supabase"
import { Checkbox } from "@/components/ui/checkbox"

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [userId, setUserId] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newExercise, setNewExercise] = useState({
    name: "",
    category: [] as string[],
    type: "",
    description: "",
    image_url: "",
  })

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadExercises(id)
    }
  }, [])

  const loadExercises = async (coachId: string) => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error("Error loading exercises:", error)
    }
  }

  const handleAddExercise = async () => {
    if (newExercise.name && newExercise.category.length > 0 && newExercise.type && userId) {
      try {
        const { data, error } = await supabase
          .from("exercises")
          .insert([
            {
              coach_id: userId,
              name: newExercise.name,
              category: newExercise.category.join(", "), // Join multiple categories
              type: newExercise.type,
              description: newExercise.description,
              image_url: "/placeholder.svg?height=200&width=300",
            },
          ])
          .select()
          .single()

        if (error) throw error

        setExercises([data, ...exercises])
        setNewExercise({ name: "", category: [], type: "", description: "", image_url: "" })
        setIsDialogOpen(false)
      } catch (error) {
        console.error("Error adding exercise:", error)
        alert("Failed to add exercise")
      }
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (confirm("Are you sure you want to delete this exercise?")) {
      try {
        const { error } = await supabase.from("exercises").delete().eq("id", exerciseId)

        if (error) throw error

        setExercises(exercises.filter((ex) => ex.id !== exerciseId))
      } catch (error) {
        console.error("Error deleting exercise:", error)
        alert("Failed to delete exercise")
      }
    }
  }

  const filteredExercises = exercises.filter(
    (exercise) =>
      exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exercise.category.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <CoachNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exercise Library</h1>
            <p className="text-gray-600 mt-2">Manage your collection of exercises</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Exercise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Exercise</DialogTitle>
                <DialogDescription>Create a new exercise for your library</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exercise Name</Label>
                  <Input
                    id="name"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                    placeholder="e.g., Barbell Squat"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Muscle Groups</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Full Body"].map((muscle) => (
                      <div key={muscle} className="flex items-center space-x-2">
                        <Checkbox
                          id={muscle}
                          checked={newExercise.category.includes(muscle)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewExercise({
                                ...newExercise,
                                category: [...newExercise.category, muscle],
                              })
                            } else {
                              setNewExercise({
                                ...newExercise,
                                category: newExercise.category.filter((c) => c !== muscle),
                              })
                            }
                          }}
                        />
                        <Label htmlFor={muscle} className="text-sm">
                          {muscle}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Exercise Type</Label>
                  <Select onValueChange={(value) => setNewExercise({ ...newExercise, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weighted">Weighted</SelectItem>
                      <SelectItem value="Bodyweight">Bodyweight</SelectItem>
                      <SelectItem value="Cardio">Cardio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                    placeholder="Describe the exercise..."
                  />
                </div>
                <Button onClick={handleAddExercise} className="w-full">
                  Add Exercise
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Exercise Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="overflow-hidden">
              <div className="relative">
                <img
                  src={exercise.image_url || "/placeholder.svg?height=200&width=300"}
                  alt={exercise.name}
                  className="w-full h-48 object-cover"
                />
                <Button size="icon" variant="secondary" className="absolute top-2 right-2">
                  <Play className="h-4 w-4" />
                </Button>
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{exercise.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteExercise(exercise.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">{exercise.category}</Badge>
                  <Badge variant="outline">{exercise.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{exercise.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredExercises.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No exercises found. Add your first exercise to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}
