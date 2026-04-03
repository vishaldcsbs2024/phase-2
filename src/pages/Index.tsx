import { ShieldAlert } from "lucide-react";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <ShieldAlert className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Protect Your Worker</h1>
        <p className="text-muted-foreground mb-8 max-w-md">Income protection insurance designed for gig workers and casual laborers</p>
        <a
          href="/register"
          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Get Started
        </a>
      </div>
    </div>
  );
};

export default Index;
