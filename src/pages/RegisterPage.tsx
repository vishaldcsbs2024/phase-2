import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { registerUser } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldAlert, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";

const WORK_TYPES = ["Delivery", "Driver", "Construction", "Domestic Help", "Street Vendor", "Other"];
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"];

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [smartPrefillUsed, setSmartPrefillUsed] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", workType: "", weeklyIncome: "", city: "" });
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const canNext = step === 1 ? form.name && form.phone.length >= 10
    : step === 2 ? form.workType && form.weeklyIncome
    : form.city;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const user = await registerUser({ ...form, weeklyIncome: Number(form.weeklyIncome) });
      login(user);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const applySmartPrefill = () => {
    setForm({
      name: "Ravi Kumar",
      phone: "9876543210",
      workType: "Delivery",
      weeklyIncome: "5000",
      city: "Bangalore",
    });
    setSmartPrefillUsed(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-24 md:pb-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Protect Your Worker</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`h-2 flex-1 rounded-full transition-colors duration-300 ${s <= step ? "bg-primary" : "bg-muted"}`} />
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground text-center mb-3">Step {step} of 3</p>
        <p className="text-xs text-muted-foreground text-center mb-6">Mobile-first onboarding: finish in under 60 seconds</p>

        {step === 1 && !smartPrefillUsed ? (
          <Button variant="outline" className="w-full mb-4" onClick={applySmartPrefill}>
            Use Smart Prefill for Demo
          </Button>
        ) : null}

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-card-foreground">Let's get started</h2>
              <p className="text-sm text-muted-foreground">Tell us your name and phone number</p>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" className="h-11" placeholder="Enter your name" value={form.name} onChange={e => update("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" className="h-11" placeholder="10-digit phone number" value={form.phone} onChange={e => update("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-card-foreground">What do you do?</h2>
              <p className="text-sm text-muted-foreground">This helps us calculate your premium</p>
              <div className="space-y-2">
                <Label>Work Type</Label>
                <Select value={form.workType} onValueChange={v => update("workType", v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select work type" /></SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="income">Weekly Income (₹)</Label>
                <Input id="income" className="h-11" type="number" placeholder="e.g. 5000" value={form.weeklyIncome} onChange={e => update("weeklyIncome", e.target.value)} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-card-foreground">Where are you based?</h2>
              <p className="text-sm text-muted-foreground">Location helps us assess risk factors</p>
              <div className="space-y-2">
                <Label>City / Area</Label>
                <Select value={form.city} onValueChange={v => update("city", v)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6 md:static fixed left-0 right-0 bottom-0 p-4 bg-background/95 backdrop-blur border-t border-border md:p-0 md:bg-transparent md:border-0 md:backdrop-blur-0">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1 h-11">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex-1 h-11">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canNext || loading} className="flex-1 h-11">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {loading ? "Creating..." : "Get Protected"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
