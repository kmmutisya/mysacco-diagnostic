import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight, Shield } from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/assessments/create"),
    onSuccess: async (res) => {
      const data = await res.json();
      setLocation(`/assess/${data.accessCode}`);
    },
    onError: () => toast({ title: "Error", description: "Could not create assessment. Please try again.", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-white dark:bg-card px-6 py-4 flex items-center justify-between no-print">
        <span className="font-bold text-lg text-foreground tracking-tight">MySACCO</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              MySACCO NEEDS ASSESSMENT QUESTIONNAIRE
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto leading-relaxed">
              A tool to evaluate your pain points, needs, current structure — and ultimately identify the right SACCO solution for your organisation.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            data-testid="button-new-assessment"
            className="bg-green-600 hover:bg-green-700 text-white px-10 h-12 text-base"
          >
            {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />}
            Start Assessment
          </Button>
        </div>
      </main>

      {/* Footer strip */}
      <div className="border-t bg-muted/30 px-6 py-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-green-600" />
            <span>Secure — all data is stored and processed on Safaricom infrastructure</span>
          </div>
          <span>MySACCO © 2026 Safaricom PLC</span>
        </div>
      </div>
    </div>
  );
}
