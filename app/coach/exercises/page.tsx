"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Edit, Trash2, PlayCircle, Dumbbell } from "lucide-react"
import { CoachNavigation } from "@/components/coach-navigation"
import { supabase, type Exercise } from "@/lib/supabase"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [userId, setUserId] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null)
  const [newExercise, setNewExercise] = useState({
    name: "",
    category: "",
    type: "Weighted",
    description: "",
    image_url: "",
    video_url: "",
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
      const { data, error } = await supabase.from("exercises").select("*").eq("coach_id", coachId).order("name")

      if (error) throw error
      setExercises(data || [])
    } catch (error) {
      console.error("Error loading exercises:", error)
      toast({
        title: "Error",
        description: "Failed to load exercises.",
        variant: "destructive",
      })
    }
  }

  const handleAddExercise = async () => {
    if (newExercise.name && newExercise.category && newExercise.type && userId) {
      try {
        const { data, error } = await supabase
          .from("exercises")
          .insert([
            {
              coach_id: userId,
              name: newExercise.name,
              category: newExercise.category,
              type: newExercise.type as "Weighted" | "Bodyweight" | "Cardio",
              description: newExercise.description || null,
              image_url: newExercise.image_url || null,
              video_url: newExercise.video_url || null,
            },
          ])
          .select()
          .single()

        if (error) throw error

        setExercises([...exercises, data])
        setNewExercise({ name: "", category: "", type: "Weighted", description: "", image_url: "", video_url: "" })
        setIsAddDialogOpen(false)
        toast({
          title: "Success!",
          description: "Exercise added successfully.",
        })
      } catch (error: any) {
        console.error("Error adding exercise:", error)
        toast({
          title: "Error",
          description: `Failed to add exercise: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Category, Type).",
        variant: "destructive",
      })
    }
  }

  const handleEditExercise = (exercise: Exercise) => {
    setCurrentExercise(exercise)
    setNewExercise({
      name: exercise.name,
      category: exercise.category,
      type: exercise.type,
      description: exercise.description || "",
      image_url: exercise.image_url || "",
      video_url: exercise.video_url || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateExercise = async () => {
    if (!currentExercise || !newExercise.name || !newExercise.category || !newExercise.type) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Name, Category, Type).",
        variant: "destructive",
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from("exercises")
        .update({
          name: newExercise.name,
          category: newExercise.category,
          type: newExercise.type as "Weighted" | "Bodyweight" | "Cardio",
          description: newExercise.description || null,
          image_url: newExercise.image_url || null,
          video_url: newExercise.video_url || null,
        })
        .eq("id", currentExercise.id)
        .select()
        .single()

      if (error) throw error

      setExercises(exercises.map((ex) => (ex.id === data.id ? data : ex)))
      setIsEditDialogOpen(false)
      setCurrentExercise(null)
      setNewExercise({ name: "", category: "", type: "Weighted", description: "", image_url: "", video_url: "" })
      toast({
        title: "Success!",
        description: "Exercise updated successfully.",
      })
    } catch (error: any) {
      console.error("Error updating exercise:", error)
      toast({
        title: "Error",
        description: `Failed to update exercise: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleDeleteExercise = async (exerciseId: string) => {
    if (confirm("Are you sure you want to delete this exercise? This action cannot be undone.")) {
      try {
        const { error } = await supabase.from("exercises").delete().eq("id", exerciseId)

        if (error) throw error

        setExercises(exercises.filter((ex) => ex.id !== exerciseId))
        toast({
          title: "Success!",
          description: "Exercise deleted successfully.",
        })
      } catch (error: any) {
        console.error("Error deleting exercise:", error)
        toast({
          title: "Error",
          description: `Failed to delete exercise: ${error.message || "Unknown error"}`,
          variant: "destructive",
        })
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
            <p className="text-gray-600 mt-2">Manage your custom exercises for training plans</p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={newExercise.category}
                    onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
                    placeholder="e.g., Legs, Chest, Back"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newExercise.type}
                    onValueChange={(value) => setNewExercise({ ...newExercise, type: value as any })}
                  >
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
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                    placeholder="Brief description of the exercise..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL (Optional)</Label>
                  <Input
                    id="image_url"
                    value={newExercise.image_url}
                    onChange={(e) => setNewExercise({ ...newExercise, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video_url">Video URL (Optional)</Label>
                  <Input
                    id="video_url"
                    value={newExercise.video_url}
                    onChange={(e) => setNewExercise({ ...newExercise, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=example"
                  />
                </div>
                <Button onClick={handleAddExercise} className="w-full">
                  Add Exercise
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Exercise</DialogTitle>
                <DialogDescription>Modify details for {currentExercise?.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editName">Exercise Name</Label>
                  <Input
                    id="editName"
                    value={newExercise.name}
                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Category</Label>
                  <Input
                    id="editCategory"
                    value={newExercise.category}
                    onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editType">Type</Label>
                  <Select
                    value={newExercise.type}
                    onValueChange={(value) => setNewExercise({ ...newExercise, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weighted">Weighted</SelectItem>
                      <SelectItem value="Bodyweight">Bodyweight</SelectItem>
                      <SelectItem value="Cardio">Cardio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDescription">Description (Optional)</Label>
                  <Textarea
                    id="editDescription"
                    value={newExercise.description}
                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editImageUrl">Image URL (Optional)</Label>
                  <Input
                    id="editImageUrl"
                    value={newExercise.image_url}
                    onChange={(e) => setNewExercise({ ...newExercise, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editVideoUrl">Video URL (Optional)</Label>
                  <Input
                    id="editVideoUrl"
                    value={newExercise.video_url}
                    onChange={(e) => setNewExercise({ ...newExercise, video_url: e.target.value })}
                    placeholder="https://youtube.com/watch?v=example"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateExercise} className="flex-1">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
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

        {/* Exercise List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No exercises found</h3>
              <p className="text-gray-500">
                {searchTerm ? "No exercises match your search criteria." : "Add your first exercise to get started!"}
              </p>
            </div>
          )}
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="flex flex-col">
              <CardHeader className="relative pb-0">
                <div className="relative w-full h-40 bg-gray-100 rounded-md overflow-hidden">
                  <Image
                    src={exercise.image_url || "/placeholder.svg"}
                    alt={exercise.name}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                  />
                  {exercise.video_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute inset-0 m-auto h-12 w-12 text-white/90 hover:text-white"
                      onClick={() => window.open(exercise.video_url, "_blank")}
                    >
                      <PlayCircle className="h-full w-full" />
                      <span className="sr-only">Play Video</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-4">
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg">{exercise.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEditExercise(exercise)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteExercise(exercise.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-600 mb-2">
                  {exercise.category} • {exercise.type}
                </CardDescription>
                {exercise.description && <p className="text-sm text-gray-700 line-clamp-2">{exercise.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
