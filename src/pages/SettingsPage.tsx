import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();

  const handleSave = () => {
    toast({ title: "Settings saved", description: "Your profile has been updated." });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-display">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
      </div>

      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="full-name">Full Name</Label>
              <Input id="full-name" placeholder="John Doe" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" disabled />
            </div>
          </div>
          <div>
            <Label htmlFor="company">Company</Label>
            <Input id="company" placeholder="Acme Inc." />
          </div>
          <Button onClick={handleSave} className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-surface">
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use API keys to integrate with external tools and automate page generation.
          </p>
          <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
            pgp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
          </div>
          <Button variant="outline" size="sm">Regenerate Key</Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-surface border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data.
          </p>
          <Button variant="destructive" className="transition-all duration-150 active:scale-[0.97]">
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
