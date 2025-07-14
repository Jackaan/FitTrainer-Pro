"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Ruler, Target, AlertCircle, Save, Camera } from "lucide-react"
import { ClientNavigation } from "@/components/client-navigation"
import { supabase } from "@/lib/supabase"

const countries = [
  { code: "SE", name: "Sweden", phoneCode: "+46", format: "+46 XX XXX XX XX" },
  { code: "CH", name: "Switzerland", phoneCode: "+41", format: "+41 XX XXX XX XX" },
  { code: "DE", name: "Germany", phoneCode: "+49", format: "+49 XXX XXXXXXX" },
  { code: "NO", name: "Norway", phoneCode: "+47", format: "+47 XXX XX XXX" },
  { code: "DK", name: "Denmark", phoneCode: "+45", format: "+45 XX XX XX XX" },
  { code: "FI", name: "Finland", phoneCode: "+358", format: "+358 XX XXX XXXX" },
  { code: "FR", name: "France", phoneCode: "+33", format: "+33 X XX XX XX XX" },
  { code: "UK", name: "United Kingdom", phoneCode: "+44", format: "+44 XXXX XXXXXX" },
]

export default function ClientProfilePage() {
  const [userId, setUserId] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    country: "SE",
    country_name: "Sweden",
    date_of_birth: "",
    height_cm: "",
    weight_kg: "",
    fitness_goal: "",
    workouts_per_week: 3,
    profile_image_url: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  })

  useEffect(() => {
    const id = localStorage.getItem("userId")
    if (id) {
      setUserId(id)
      loadProfile(id)
    }
  }, [])

  const loadProfile = async (userId: string) => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) throw error

      setProfile({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        country: data.country || "SE",
        country_name: data.country_name || "Sweden",
        date_of_birth: data.date_of_birth || "",
        height_cm: data.height_cm?.toString() || "",
        weight_kg: data.weight_kg?.toString() || "",
        fitness_goal: data.fitness_goal || "",
        workouts_per_week: data.workouts_per_week || 3,
        profile_image_url: data.profile_image_url || "",
        emergency_contact_name: data.emergency_contact_name || "",
        emergency_contact_phone: data.emergency_contact_phone || "",
      })
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from("users")
        .update({
          name: profile.name,
          phone: profile.phone || null,
          country: profile.country,
          country_name: profile.country_name,
          date_of_birth: profile.date_of_birth || null,
          height_cm: profile.height_cm ? Number.parseInt(profile.height_cm) : null,
          weight_kg: profile.weight_kg ? Number.parseFloat(profile.weight_kg) : null,
          fitness_goal: profile.fitness_goal || null,
          workouts_per_week: profile.workouts_per_week,
          emergency_contact_name: profile.emergency_contact_name || null,
          emergency_contact_phone: profile.emergency_contact_phone || null,
        })
        .eq("id", userId)

      if (error) throw error

      // Update localStorage with new name
      localStorage.setItem("userName", profile.name)

      alert("Profile updated successfully!")
    } catch (error) {
      console.error("Error saving profile:", error)
      alert("Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB") // Format as DD/MM/YYYY
  }

  const calculateBMI = () => {
    if (!profile.height_cm || !profile.weight_kg) return null
    const heightM = Number.parseInt(profile.height_cm) / 100
    const weight = Number.parseFloat(profile.weight_kg)
    return (weight / (heightM * heightM)).toFixed(1)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading profile...</div>
        </div>
      </div>
    )
  }

  const age = calculateAge(profile.date_of_birth)
  const bmi = calculateBMI()
  const formattedDateOfBirth = formatDate(profile.date_of_birth)

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavigation />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and fitness preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Profile Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile.profile_image_url || "/placeholder.svg"} alt={profile.name} />
                      <AvatarFallback className="text-2xl">
                        {profile.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 rounded-full bg-transparent"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle>{profile.name}</CardTitle>
                <CardDescription>{profile.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {age && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Age:</span>
                    <span className="font-medium">{age} years</span>
                  </div>
                )}
                {bmi && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">BMI:</span>
                    <Badge variant="outline">{bmi}</Badge>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Weekly Goal:</span>
                  <Badge variant="default">{profile.workouts_per_week} workouts</Badge>
                </div>
                {profile.fitness_goal && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Fitness Goal:</p>
                    <p className="text-sm italic">"{profile.fitness_goal}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={profile.country}
                        onValueChange={(value) => {
                          const selectedCountry = countries.find((c) => c.code === value)
                          setProfile({
                            ...profile,
                            country: value,
                            country_name: selectedCountry?.name || "",
                            phone: "", // Reset phone when country changes
                            emergency_contact_phone: "",
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder={countries.find((c) => c.code === profile.country)?.format || "+XX XXX XXX XXX"}
                    />
                    <p className="text-xs text-gray-500">
                      Format: {countries.find((c) => c.code === profile.country)?.format}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" value={profile.email} disabled className="bg-gray-50" />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={profile.date_of_birth}
                      onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                    />
                    {formattedDateOfBirth && (
                      <p className="text-xs text-gray-500">Formatted Date: {formattedDateOfBirth}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Physical Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler className="h-5 w-5" />
                    Physical Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={profile.height_cm}
                        onChange={(e) => setProfile({ ...profile, height_cm: e.target.value })}
                        placeholder="175"
                      />
                      <p className="text-xs text-gray-500">Enter height in centimeters</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={profile.weight_kg}
                        onChange={(e) => setProfile({ ...profile, weight_kg: e.target.value })}
                        placeholder="70.5"
                      />
                      <p className="text-xs text-gray-500">Enter weight in kilograms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fitness Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Fitness Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="workouts">Workouts Per Week</Label>
                    <Select
                      value={profile.workouts_per_week.toString()}
                      onValueChange={(value) => setProfile({ ...profile, workouts_per_week: Number.parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 workout per week</SelectItem>
                        <SelectItem value="2">2 workouts per week</SelectItem>
                        <SelectItem value="3">3 workouts per week</SelectItem>
                        <SelectItem value="4">4 workouts per week</SelectItem>
                        <SelectItem value="5">5 workouts per week</SelectItem>
                        <SelectItem value="6">6 workouts per week</SelectItem>
                        <SelectItem value="7">7 workouts per week</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">This affects your weekly workout goal on the dashboard</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal">Fitness Goal</Label>
                    <Textarea
                      id="goal"
                      value={profile.fitness_goal}
                      onChange={(e) => setProfile({ ...profile, fitness_goal: e.target.value })}
                      placeholder="Describe your fitness goals and what you want to achieve..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Emergency Contact
                  </CardTitle>
                  <CardDescription>Person to contact in case of emergency during training</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="emergency-name">Contact Name</Label>
                      <Input
                        id="emergency-name"
                        value={profile.emergency_contact_name}
                        onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
                        placeholder="Emergency contact name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency-phone">Contact Phone</Label>
                      <Input
                        id="emergency-phone"
                        value={profile.emergency_contact_phone}
                        onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
                        placeholder={countries.find((c) => c.code === profile.country)?.format || "+XX XXX XXX XXX"}
                      />
                      <p className="text-xs text-gray-500">
                        Format: {countries.find((c) => c.code === profile.country)?.format}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
