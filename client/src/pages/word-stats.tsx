import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, BookOpen, Database, Target, TrendingUp, Home, RefreshCw } from "lucide-react";
import { Link } from "wouter";

interface WordStats {
  total: number;
  common: number;
  moderate: number;
  expert: number;
  used: number;
  database_version: string;
  source: string;
}

export default function WordStats() {
  const [stats, setStats] = useState<WordStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/words/enhanced/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch word statistics');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching word stats:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetUsedWords = async () => {
    try {
      const response = await fetch('/api/words/enhanced/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        fetchStats(); // Refresh stats after reset
      }
    } catch (error) {
      console.error('Error resetting used words:', error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading word database statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
            <div className="flex gap-2">
              <Button onClick={fetchStats} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Link href="/">
                <Button variant="outline">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const difficultyData = [
    { name: 'Common', count: stats.common, color: 'bg-green-500', description: 'Most frequent words (1-2,000)' },
    { name: 'Moderate', count: stats.moderate, color: 'bg-yellow-500', description: 'Intermediate vocabulary (2,001-10,000)' },
    { name: 'Expert', count: stats.expert, color: 'bg-red-500', description: 'Advanced terms (10,001+)' },
  ];

  const maxCount = Math.max(...difficultyData.map(d => d.count));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-purple-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Word Database Statistics
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Comprehensive analytics for frequency-based vocabulary learning
          </p>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          <Link href="/">
            <Button variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <Button onClick={resetUsedWords} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset Progress
          </Button>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="difficulty">Difficulty Distribution</TabsTrigger>
            <TabsTrigger value="technical">Technical Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Words */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Total Words
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Database className="w-5 h-5 text-blue-500 mr-2" />
                      <span className="text-2xl font-bold">{stats.total.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Words Used */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Words Used
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <Target className="w-5 h-5 text-purple-500 mr-2" />
                      <span className="text-2xl font-bold">{stats.used}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {((stats.used / stats.total) * 100).toFixed(1)}% explored
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Progress */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Remaining
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <TrendingUp className="w-5 h-5 text-green-500 mr-2" />
                      <span className="text-2xl font-bold">{(stats.total - stats.used).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Fresh words to discover
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Database Version */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      Version
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center">
                      <BookOpen className="w-5 h-5 text-orange-500 mr-2" />
                      <Badge variant="secondary">{stats.database_version}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Enhanced frequency data
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="difficulty">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Difficulty Distribution
                </CardTitle>
                <CardDescription>
                  Words categorized by authentic frequency rankings from linguistic research
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {difficultyData.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{item.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                        </div>
                        <Badge variant="outline">{item.count.toLocaleString()}</Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(item.count / maxCount) * 100}%` }}
                          transition={{ delay: index * 0.1 + 0.3, duration: 0.8 }}
                          className={`h-3 rounded-full ${item.color}`}
                        />
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {((item.count / stats.total) * 100).toFixed(1)}% of total
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technical">
            <Card>
              <CardHeader>
                <CardTitle>Technical Information</CardTitle>
                <CardDescription>
                  Database source and classification methodology
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Data Source</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{stats.source}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Classification Method</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>• <strong>Common (Easy):</strong> Frequency rank 1-2,000 - Most frequently used words in English</p>
                    <p>• <strong>Moderate (Medium):</strong> Frequency rank 2,001-10,000 - Intermediate vocabulary</p>
                    <p>• <strong>Expert (Hard):</strong> Frequency rank 10,001+ - Advanced and specialized terms</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Educational Value</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    This system provides authentic vocabulary progression based on linguistic research, 
                    ensuring players learn words in order of practical importance and frequency in real English usage.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Database Statistics</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Version:</strong> {stats.database_version}
                    </div>
                    <div>
                      <strong>Total Words:</strong> {stats.total.toLocaleString()}
                    </div>
                    <div>
                      <strong>Progress:</strong> {stats.used}/{stats.total} ({((stats.used / stats.total) * 100).toFixed(1)}%)
                    </div>
                    <div>
                      <strong>Remaining:</strong> {(stats.total - stats.used).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}