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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"

const countries = [
  { code: "AF", name: "Afghanistan", phoneCode: "+93", format: "+93 XX XXX XXXX" },
  { code: "AL", name: "Albania", phoneCode: "+355", format: "+355 XXX XXX XXX" },
  { code: "DZ", name: "Algeria", phoneCode: "+213", format: "+213 XXX XXX XXX" },
  { code: "AD", name: "Andorra", phoneCode: "+376", format: "+376 XXX XXX" },
  { code: "AO", name: "Angola", phoneCode: "+244", format: "+244 XXX XXX XXX" },
  { code: "AR", name: "Argentina", phoneCode: "+54", format: "+54 XX XXXX XXXX" },
  { code: "AM", name: "Armenia", phoneCode: "+374", format: "+374 XX XXX XXX" },
  { code: "AU", name: "Australia", phoneCode: "+61", format: "+61 X XXXX XXXX" },
  { code: "AT", name: "Austria", phoneCode: "+43", format: "+43 XXX XXX XXXX" },
  { code: "AZ", name: "Azerbaijan", phoneCode: "+994", format: "+994 XX XXX XX XX" },
  { code: "BH", name: "Bahrain", phoneCode: "+973", format: "+973 XXXX XXXX" },
  { code: "BD", name: "Bangladesh", phoneCode: "+880", format: "+880 XXXX XXXXXX" },
  { code: "BY", name: "Belarus", phoneCode: "+375", format: "+375 XX XXX XX XX" },
  { code: "BE", name: "Belgium", phoneCode: "+32", format: "+32 XXX XX XX XX" },
  { code: "BJ", name: "Benin", phoneCode: "+229", format: "+229 XX XX XX XX" },
  { code: "BT", name: "Bhutan", phoneCode: "+975", format: "+975 X XXXX XXX" },
  { code: "BO", name: "Bolivia", phoneCode: "+591", format: "+591 X XXX XXXX" },
  { code: "BA", name: "Bosnia and Herzegovina", phoneCode: "+387", format: "+387 XX XXX XXX" },
  { code: "BW", name: "Botswana", phoneCode: "+267", format: "+267 XX XXX XXX" },
  { code: "BR", name: "Brazil", phoneCode: "+55", format: "+55 XX XXXXX XXXX" },
  { code: "BG", name: "Bulgaria", phoneCode: "+359", format: "+359 XXX XXX XXX" },
  { code: "BF", name: "Burkina Faso", phoneCode: "+226", format: "+226 XX XX XX XX" },
  { code: "BI", name: "Burundi", phoneCode: "+257", format: "+257 XX XX XX XX" },
  { code: "CV", name: "Cabo Verde", phoneCode: "+238", format: "+238 XXX XX XX" },
  { code: "KH", name: "Cambodia", phoneCode: "+855", format: "+855 XX XXX XXX" },
  { code: "CM", name: "Cameroon", phoneCode: "+237", format: "+237 XXXX XXXX" },
  { code: "CA", name: "Canada", phoneCode: "+1", format: "+1 (XXX) XXX-XXXX" },
  { code: "CF", name: "Central African Republic", phoneCode: "+236", format: "+236 XX XX XX XX" },
  { code: "TD", name: "Chad", phoneCode: "+235", format: "+235 XX XX XX XX" },
  { code: "CL", name: "Chile", phoneCode: "+56", format: "+56 X XXXX XXXX" },
  { code: "CN", name: "China", phoneCode: "+86", format: "+86 XXX XXXXXXXX" },
  { code: "CO", name: "Colombia", phoneCode: "+57", format: "+57 XXX XXX XXXX" },
  { code: "KM", name: "Comoros", phoneCode: "+269", format: "+269 XXX XXXX" },
  { code: "CD", name: "Congo (DRC)", phoneCode: "+243", format: "+243 XXX XXX XXX" },
  { code: "CG", name: "Congo (Republic)", phoneCode: "+242", format: "+242 XX XXX XXXX" },
  { code: "CR", name: "Costa Rica", phoneCode: "+506", format: "+506 XXXX XXXX" },
  { code: "CI", name: "Côte d'Ivoire", phoneCode: "+225", format: "+225 XX XX XX XX" },
  { code: "HR", name: "Croatia", phoneCode: "+385", format: "+385 XX XXX XXXX" },
  { code: "CU", name: "Cuba", phoneCode: "+53", format: "+53 X XXXXXXXX" },
  { code: "CY", name: "Cyprus", phoneCode: "+357", format: "+357 XX XXX XXX" },
  { code: "CZ", name: "Czech Republic", phoneCode: "+420", format: "+420 XXX XXX XXX" },
  { code: "DK", name: "Denmark", phoneCode: "+45", format: "+45 XX XX XX XX" },
  { code: "DJ", name: "Djibouti", phoneCode: "+253", format: "+253 XX XX XX XX" },
  { code: "DO", name: "Dominican Republic", phoneCode: "+1", format: "+1 (XXX) XXX-XXXX" },
  { code: "EC", name: "Ecuador", phoneCode: "+593", format: "+593 XX XXX XXXX" },
  { code: "EG", name: "Egypt", phoneCode: "+20", format: "+20 XXX XXX XXXX" },
  { code: "SV", name: "El Salvador", phoneCode: "+503", format: "+503 XXXX XXXX" },
  { code: "GQ", name: "Equatorial Guinea", phoneCode: "+240", format: "+240 XXX XXX XXX" },
  { code: "ER", name: "Eritrea", phoneCode: "+291", format: "+291 X XXX XXX" },
  { code: "EE", name: "Estonia", phoneCode: "+372", format: "+372 XXXX XXXX" },
  { code: "ET", name: "Ethiopia", phoneCode: "+251", format: "+251 XX XXX XXXX" },
  { code: "FJ", name: "Fiji", phoneCode: "+679", format: "+679 XXX XXXX" },
  { code: "FI", name: "Finland", phoneCode: "+358", format: "+358 XX XXX XXXX" },
  { code: "FR", name: "France", phoneCode: "+33", format: "+33 X XX XX XX XX" },
  { code: "GA", name: "Gabon", phoneCode: "+241", format: "+241 XX XX XX XX" },
  { code: "GM", name: "Gambia", phoneCode: "+220", format: "+220 XXX XXXX" },
  { code: "GE", name: "Georgia", phoneCode: "+995", format: "+995 XXX XXX XXX" },
  { code: "DE", name: "Germany", phoneCode: "+49", format: "+49 XXX XXXXXXX" },
  { code: "GH", name: "Ghana", phoneCode: "+233", format: "+233 XX XXX XXXX" },
  { code: "GR", name: "Greece", phoneCode: "+30", format: "+30 XXX XXXXXXX" },
  { code: "GT", name: "Guatemala", phoneCode: "+502", format: "+502 XXXX XXXX" },
  { code: "GN", name: "Guinea", phoneCode: "+224", format: "+224 XXX XXX XXX" },
  { code: "GW", name: "Guinea-Bissau", phoneCode: "+245", format: "+245 XXX XXXX" },
  { code: "GY", name: "Guyana", phoneCode: "+592", format: "+592 XXX XXXX" },
  { code: "HT", name: "Haiti", phoneCode: "+509", format: "+509 XXXX XXXX" },
  { code: "HN", name: "Honduras", phoneCode: "+504", format: "+504 XXXX XXXX" },
  { code: "HK", name: "Hong Kong", phoneCode: "+852", format: "+852 XXXX XXXX" },
  { code: "HU", name: "Hungary", phoneCode: "+36", format: "+36 XX XXX XXXX" },
  { code: "IS", name: "Iceland", phoneCode: "+354", format: "+354 XXX XXXX" },
  { code: "IN", name: "India", phoneCode: "+91", format: "+91 XXXXX XXXXX" },
  { code: "ID", name: "Indonesia", phoneCode: "+62", format: "+62 XXX XXXXXXXX" },
  { code: "IR", name: "Iran", phoneCode: "+98", format: "+98 XXX XXXXXXX" },
  { code: "IQ", name: "Iraq", phoneCode: "+964", format: "+964 XXX XXX XXXX" },
  { code: "IE", name: "Ireland", phoneCode: "+353", format: "+353 XX XXX XXXX" },
  { code: "IL", name: "Israel", phoneCode: "+972", format: "+972 X XXX XXXX" },
  { code: "IT", name: "Italy", phoneCode: "+39", format: "+39 XXX XXXXXXX" },
  { code: "JM", name: "Jamaica", phoneCode: "+1", format: "+1 (XXX) XXX-XXXX" },
  { code: "JP", name: "Japan", phoneCode: "+81", format: "+81 XX XXXX XXXX" },
  { code: "JO", name: "Jordan", phoneCode: "+962", format: "+962 X XXXX XXXX" },
  { code: "KZ", name: "Kazakhstan", phoneCode: "+7", format: "+7 XXX XXX XX XX" },
  { code: "KE", name: "Kenya", phoneCode: "+254", format: "+254 XXX XXX XXX" },
  { code: "KW", name: "Kuwait", phoneCode: "+965", format: "+965 XXXX XXXX" },
  { code: "KG", name: "Kyrgyzstan", phoneCode: "+996", format: "+996 XXX XXX XXX" },
  { code: "LA", name: "Laos", phoneCode: "+856", format: "+856 XX XXX XXX" },
  { code: "LV", name: "Latvia", phoneCode: "+371", format: "+371 XXXX XXXX" },
  { code: "LB", name: "Lebanon", phoneCode: "+961", format: "+961 XX XXX XXX" },
  { code: "LS", name: "Lesotho", phoneCode: "+266", format: "+266 XXXX XXXX" },
  { code: "LR", name: "Liberia", phoneCode: "+231", format: "+231 XXX XXX XXX" },
  { code: "LY", name: "Libya", phoneCode: "+218", format: "+218 XX XXX XXXX" },
  { code: "LI", name: "Liechtenstein", phoneCode: "+423", format: "+423 XXX XXXX" },
  { code: "LT", name: "Lithuania", phoneCode: "+370", format: "+370 XXX XXXX" },
  { code: "LU", name: "Luxembourg", phoneCode: "+352", format: "+352 XXX XXX XXX" },
  { code: "MO", name: "Macau", phoneCode: "+853", format: "+853 XXXX XXXX" },
  { code: "MG", name: "Madagascar", phoneCode: "+261", format: "+261 XX XX XXX XX" },
  { code: "MW", name: "Malawi", phoneCode: "+265", format: "+265 XXX XXX XXX" },
  { code: "MY", name: "Malaysia", phoneCode: "+60", format: "+60 XX XXX XXXX" },
  { code: "MV", name: "Maldives", phoneCode: "+960", format: "+960 XXX XXXX" },
  { code: "ML", name: "Mali", phoneCode: "+223", format: "+223 XX XX XX XX" },
  { code: "MT", name: "Malta", phoneCode: "+356", format: "+356 XXXX XXXX" },
  { code: "MR", name: "Mauritania", phoneCode: "+222", format: "+222 XX XX XX XX" },
  { code: "MU", name: "Mauritius", phoneCode: "+230", format: "+230 XXXX XXXX" },
  { code: "MX", name: "Mexico", phoneCode: "+52", format: "+52 XXX XXX XXXX" },
  { code: "MD", name: "Moldova", phoneCode: "+373", format: "+373 XXXX XXXX" },
  { code: "MC", name: "Monaco", phoneCode: "+377", format: "+377 XXX XXX XXX" },
  { code: "MN", name: "Mongolia", phoneCode: "+976", format: "+976 XXXX XXXX" },
  { code: "ME", name: "Montenegro", phoneCode: "+382", format: "+382 XX XXX XXX" },
  { code: "MA", name: "Morocco", phoneCode: "+212", format: "+212 XX XXX XXXX" },
  { code: "MZ", name: "Mozambique", phoneCode: "+258", format: "+258 XX XXX XXXX" },
  { code: "MM", name: "Myanmar", phoneCode: "+95", format: "+95 XX XXX XXXX" },
  { code: "NA", name: "Namibia", phoneCode: "+264", format: "+264 XX XXX XXXX" },
  { code: "NP", name: "Nepal", phoneCode: "+977", format: "+977 XXX XXX XXX" },
  { code: "NL", name: "Netherlands", phoneCode: "+31", format: "+31 X XXXXXXXX" },
  { code: "NZ", name: "New Zealand", phoneCode: "+64", format: "+64 XXX XXX XXXX" },
  { code: "NI", name: "Nicaragua", phoneCode: "+505", format: "+505 XXXX XXXX" },
  { code: "NE", name: "Niger", phoneCode: "+227", format: "+227 XX XX XX XX" },
  { code: "NG", name: "Nigeria", phoneCode: "+234", format: "+234 XXX XXX XXXX" },
  { code: "KP", name: "North Korea", phoneCode: "+850", format: "+850 XX XXX XXXX" },
  { code: "NO", name: "Norway", phoneCode: "+47", format: "+47 XXX XX XXX" },
  { code: "OM", name: "Oman", phoneCode: "+968", format: "+968 XXXX XXXX" },
  { code: "PK", name: "Pakistan", phoneCode: "+92", format: "+92 XXX XXXXXXX" },
  { code: "PA", name: "Panama", phoneCode: "+507", format: "+507 XXX XXXX" },
  { code: "PG", name: "Papua New Guinea", phoneCode: "+675", format: "+675 XXXX XXXX" },
  { code: "PY", name: "Paraguay", phoneCode: "+595", format: "+595 XX XXX XXX" },
  { code: "PE", name: "Peru", phoneCode: "+51", format: "+51 XXX XXX XXX" },
  { code: "PH", name: "Philippines", phoneCode: "+63", format: "+63 XXX XXX XXXX" },
  { code: "PL", name: "Poland", phoneCode: "+48", format: "+48 XXX XXX XXX" },
  { code: "PT", name: "Portugal", phoneCode: "+351", format: "+351 XXX XXX XXX" },
  { code: "QA", name: "Qatar", phoneCode: "+974", format: "+974 XXXX XXXX" },
  { code: "RO", name: "Romania", phoneCode: "+40", format: "+40 XXX XXX XXX" },
  { code: "RU", name: "Russia", phoneCode: "+7", format: "+7 XXX XXX XX XX" },
  { code: "RW", name: "Rwanda", phoneCode: "+250", format: "+250 XXX XXX XXX" },
  { code: "SA", name: "Saudi Arabia", phoneCode: "+966", format: "+966 XXX XXX XXXX" },
  { code: "SN", name: "Senegal", phoneCode: "+221", format: "+221 XX XXX XX XX" },
  { code: "RS", name: "Serbia", phoneCode: "+381", format: "+381 XX XXX XXXX" },
  { code: "SL", name: "Sierra Leone", phoneCode: "+232", format: "+232 XX XXX XXX" },
  { code: "SG", name: "Singapore", phoneCode: "+65", format: "+65 XXXX XXXX" },
  { code: "SK", name: "Slovakia", phoneCode: "+421", format: "+421 XXX XXX XXX" },
  { code: "SI", name: "Slovenia", phoneCode: "+386", format: "+386 XX XXX XXX" },
  { code: "SO", name: "Somalia", phoneCode: "+252", format: "+252 X XXX XXXX" },
  { code: "ZA", name: "South Africa", phoneCode: "+27", format: "+27 XX XXX XXXX" },
  { code: "KR", name: "South Korea", phoneCode: "+82", format: "+82 XX XXXX XXXX" },
  { code: "ES", name: "Spain", phoneCode: "+34", format: "+34 XXX XXX XXX" },
  { code: "LK", name: "Sri Lanka", phoneCode: "+94", format: "+94 XX XXX XXXX" },
  { code: "SD", name: "Sudan", phoneCode: "+249", format: "+249 XX XXX XXXX" },
  { code: "SE", name: "Sweden", phoneCode: "+46", format: "+46 XX XXX XX XX" },
  { code: "CH", name: "Switzerland", phoneCode: "+41", format: "+41 XX XXX XX XX" },
  { code: "SY", name: "Syria", phoneCode: "+963", format: "+963 XX XXX XXXX" },
  { code: "TW", name: "Taiwan", phoneCode: "+886", format: "+886 XXX XXX XXX" },
  { code: "TZ", name: "Tanzania", phoneCode: "+255", format: "+255 XX XXX XXXX" },
  { code: "TH", name: "Thailand", phoneCode: "+66", format: "+66 XX XXX XXXX" },
  { code: "TG", name: "Togo", phoneCode: "+228", format: "+228 XX XX XX XX" },
  { code: "TT", name: "Trinidad and Tobago", phoneCode: "+1", format: "+1 (XXX) XXX-XXXX" },
  { code: "TN", name: "Tunisia", phoneCode: "+216", format: "+216 XX XXX XXX" },
  { code: "TR", name: "Turkey", phoneCode: "+90", format: "+90 XXX XXX XXXX" },
  { code: "TM", name: "Turkmenistan", phoneCode: "+993", format: "+993 XX XXX XXX" },
  { code: "UG", name: "Uganda", phoneCode: "+256", format: "+256 XXX XXX XXX" },
  { code: "UA", name: "Ukraine", phoneCode: "+380", format: "+380 XX XXX XX XX" },
  { code: "AE", name: "United Arab Emirates", phoneCode: "+971", format: "+971 XX XXX XXXX" },
  { code: "UK", name: "United Kingdom", phoneCode: "+44", format: "+44 XXXX XXXXXX" },
  { code: "US", name: "United States", phoneCode: "+1", format: "+1 (XXX) XXX-XXXX" },
  { code: "UY", name: "Uruguay", phoneCode: "+598", format: "+598 X XXX XXXX" },
  { code: "UZ", name: "Uzbekistan", phoneCode: "+998", format: "+998 XX XXX XX XX" },
  { code: "VE", name: "Venezuela", phoneCode: "+58", format: "+58 XXX XXX XXXX" },
  { code: "VN", name: "Vietnam", phoneCode: "+84", format: "+84 XX XXX XXXX" },
  { code: "YE", name: "Yemen", phoneCode: "+967", format: "+967 XXX XXX XXX" },
  { code: "ZM", name: "Zambia", phoneCode: "+260", format: "+260 XXX XXX XXXX" },
  { code: "ZW", name: "Zimbabwe", phoneCode: "+263", format: "+263 XX XXX XXXX" },
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
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false)
  const [newProfileImageUrl, setNewProfileImageUrl] = useState("")

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
        profile_image_url: data.profile_image_url || "/placeholder.svg",
        emergency_contact_name: data.emergency_contact_name || "",
        emergency_contact_phone: data.emergency_contact_phone || "",
      })
      setNewProfileImageUrl(data.profile_image_url || "")
    } catch (error) {
      console.error("Error loading profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile.",
        variant: "destructive",
      })
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

      toast({
        title: "Success!",
        description: "Profile updated successfully!",
      })
    } catch (error: any) {
      console.error("Error saving profile:", error)
      toast({
        title: "Error",
        description: `Failed to save profile: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveProfileImage = async () => {
    if (!userId) return

    try {
      setIsSaving(true)
      const { error } = await supabase
        .from("users")
        .update({ profile_image_url: newProfileImageUrl || null })
        .eq("id", userId)

      if (error) throw error

      setProfile((prev) => ({ ...prev, profile_image_url: newProfileImageUrl || "/placeholder.svg" }))
      setIsImageUploadDialogOpen(false)
      toast({
        title: "Success!",
        description: "Profile image updated successfully!",
      })
    } catch (error: any) {
      console.error("Error updating profile image:", error)
      toast({
        title: "Error",
        description: `Failed to update profile image: ${error.message || "Unknown error"}`,
        variant: "destructive",
      })
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
                    <Dialog open={isImageUploadDialogOpen} onOpenChange={setIsImageUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="outline"
                          className="absolute -bottom-2 -right-2 rounded-full bg-transparent"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Update Profile Image</DialogTitle>
                          <DialogDescription>Enter the URL for your new profile image.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Label htmlFor="profileImageUrl">Image URL</Label>
                          <Input
                            id="profileImageUrl"
                            value={newProfileImageUrl}
                            onChange={(e) => setNewProfileImageUrl(e.target.value)}
                            placeholder="https://example.com/your-image.jpg"
                          />
                          <Button onClick={handleSaveProfileImage} disabled={isSaving} className="w-full">
                            {isSaving ? "Saving..." : "Save Image"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
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
