import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Clock, Trophy, User, Star, Search, Play, Calendar } from "lucide-react";
import { Link } from "wouter";


export default function Landing() {
  const handleDownloadApp = () => {
    // TODO: Add actual app store links
    alert('Download our mobile app from the App Store or Google Play Store to unlock all features!');
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
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            One hidden word, one clue. <span className="text-teal-600 dark:text-teal-400">Can you find it?</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Can you guess the word from just its definition? Put your vocabulary to the test in this addictive word game that flips the traditional dictionary experience!
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            <Badge variant="secondary" className="text-sm">
              <Star className="h-3 w-3 mr-1" />
              20K+ Words with 10K+ Academic Words
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Brain className="h-3 w-3 mr-1" />
              AI-Powered Difficulty
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <Trophy className="h-3 w-3 mr-1" />
              Progress Tracking
            </Badge>
          </div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
            Start Playing
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-12">
            Choose your challenge level and test your vocabulary skills. Each mode offers a unique way to learn and improve!
          </p>
          
          {/* Game Modes */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <Link href="/word-game">
                <CardHeader className="text-center">
                  <Play className="h-12 w-12 text-teal-600 dark:text-teal-400 mx-auto mb-4" />
                  <CardTitle className="text-xl">Quest Mode</CardTitle>
                  <CardDescription>
                    Practice with 5 words at your own pace - perfect introduction
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">5 Words</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <Link href="/daily-challenge">
                <CardHeader className="text-center">
                  <Calendar className="h-12 w-12 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
                  <CardTitle className="text-xl">Daily Challenge</CardTitle>
                  <CardDescription>
                    One challenging word per day. Try to build your streak!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">2 Attempts</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <Link href="/timed-challenge">
                <CardHeader className="text-center">
                  <Clock className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto mb-4" />
                  <CardTitle className="text-xl">Speed Challenge</CardTitle>
                  <CardDescription>
                    Race against time in 1-minute speed rounds - pure adrenaline
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">1 Min</Badge>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Want progress tracking, all difficulty levels, and exclusive features?
            </p>
            <Button 
              onClick={handleDownloadApp}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              📱 Download Mobile App
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Why Choose Defindle?
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <BookOpen className="h-10 w-10 text-teal-600 dark:text-teal-400 mb-2" />
              <CardTitle>Comprehensive Word Database</CardTitle>
              <CardDescription>
                Over 20,000 words including 10,000+ academic words for comprehensive vocabulary learning
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Brain className="h-10 w-10 text-purple-600 dark:text-purple-400 mb-2" />
              <CardTitle>Intelligent Difficulty</CardTitle>
              <CardDescription>
                AI-powered difficulty scaling based on authentic frequency rankings and your performance
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Clock className="h-10 w-10 text-orange-600 dark:text-orange-400 mb-2" />
              <CardTitle>Timed Challenges</CardTitle>
              <CardDescription>
                1-minute speed rounds with unlimited hints and dynamic scoring
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="h-10 w-10 text-amber-600 dark:text-amber-400 mb-2" />
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>
                Comprehensive analytics showing your vocabulary growth and performance metrics
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <User className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mb-2" />
              <CardTitle>Personal Account</CardTitle>
              <CardDescription>
                Save your progress, preferences, and compete with others in vocabulary mastery
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Star className="h-10 w-10 text-rose-600 dark:text-rose-400 mb-2" />
              <CardTitle>Educational Value</CardTitle>
              <CardDescription>
                Professional-grade vocabulary learning tool used by language learners worldwide
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-700 dark:to-emerald-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Start Learning?</h3>
          <p className="text-xl mb-8 text-teal-100">
            Join thousands of learners improving their vocabulary with Defindle
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handleDownloadApp}
              size="lg" 
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-gray-100 text-lg px-8 py-3"
            >
              <BookOpen className="h-5 w-5 mr-2" />
              📱 Get Full App
            </Button>
            <Button 
              onClick={() => window.location.href = '/word-game'} 
              size="lg" 
              variant="outline"
              className="bg-transparent border-white text-white hover:bg-white hover:text-teal-600 text-lg px-8 py-3"
            >
              <Play className="h-5 w-5 mr-2" />
              Try Web Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-6 w-6 text-teal-400" />
            <span className="text-lg font-semibold">Defindle</span>
          </div>
          <p className="text-gray-400">
            Words made unforgettable
          </p>
        </div>
      </footer>
    </div>
  );
}