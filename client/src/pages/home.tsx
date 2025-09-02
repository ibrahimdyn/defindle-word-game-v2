import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Clock, Trophy, Play, BarChart3, LogOut, Search, Calendar } from "lucide-react";
import { Link } from "wouter";


interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export default function Home() {
  const { user } = useAuth() as { user: User | null };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.[0] || "";
    const last = lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const getDisplayName = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName) {
      return firstName;
    }
    if (email) {
      return email.split('@')[0];
    }
    return "Anonymous User";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-orange-50 dark:from-slate-900 dark:via-slate-800 dark:to-purple-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-teal-600 dark:text-teal-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Defindle</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-teal-600 text-white text-sm rounded-full flex items-center justify-center">
                {getInitials(user?.firstName || null, user?.lastName || null)}
              </div>
              <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                {getDisplayName(user?.firstName || null, user?.lastName || null, user?.email || null)}
              </span>
            </div>
            
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              size="sm"
              className="hidden sm:flex"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            
            <Button 
              onClick={handleLogout} 
              variant="outline" 
              size="sm"
              className="sm:hidden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Welcome Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome back, {getDisplayName(user?.firstName || null, user?.lastName || null, user?.email || null)}!
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Ready to expand your vocabulary? Choose a game mode to get started.
          </p>
        </div>

        {/* Game Modes */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/word-game">
              <CardHeader className="text-center">
                <Play className="h-12 w-12 text-teal-600 dark:text-teal-400 mx-auto mb-4" />
                <CardTitle className="text-xl">Quest Mode</CardTitle>
                <CardDescription>
                  Practice with 5 words at your own pace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Badge variant="secondary">5 Words</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/daily-challenge">
              <CardHeader className="text-center">
                <Calendar className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
                <CardTitle className="text-xl">Daily Challenge</CardTitle>
                <CardDescription>
                  One challenging word per day. Build your streak!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Badge variant="secondary">2 Attempts</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/timed-challenge">
              <CardHeader className="text-center">
                <Clock className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto mb-4" />
                <CardTitle className="text-xl">Speed Challenge</CardTitle>
                <CardDescription>
                  Race against the clock in 1-minute speed rounds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <Badge variant="secondary">1 Min</Badge>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Words Learned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">--</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Best Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">--</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Accuracy Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">--%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">--</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest vocabulary learning sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No recent activity. Start playing to see your progress here!
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}