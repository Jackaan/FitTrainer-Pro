import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dumbbell, Users, Calendar } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Dumbbell className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">FitTrainer Pro</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The complete solution for personal trainers and their clients. Manage workouts, track progress, and grow
            your fitness business.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                For Coaches
              </CardTitle>
              <CardDescription>Manage your clients, create training plans, and grow your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                Create and manage exercise library
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                Build custom training plans
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                Generate invoices and track payments
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
                Monitor client progress
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-green-600" />
                For Clients
              </CardTitle>
              <CardDescription>Access your training plans and track your fitness journey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                View personalized training plans
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                Track workout completion
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                Add feedback and notes
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                View training history
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button size="lg" className="px-8">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="outline" size="lg" className="px-8 bg-transparent">
                Get Started
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500">Join thousands of trainers and clients already using FitTrainer Pro</p>
        </div>
      </div>
    </div>
  )
}
