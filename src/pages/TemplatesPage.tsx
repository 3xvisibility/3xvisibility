import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockTemplates = [
  {
    id: "1",
    name: "Course Landing",
    variables: ["{course}", "{city}"],
    content: "<h1>{course} in {city}</h1>\n<p>Learn {course} in {city} with expert instructors.</p>",
    usedIn: 3,
  },
  {
    id: "2",
    name: "SEO Page",
    variables: ["{keyword}", "{location}", "{title}"],
    content: "<h1>{title}</h1>\n<p>Best {keyword} services in {location}.</p>",
    usedIn: 1,
  },
  {
    id: "3",
    name: "Product Page",
    variables: ["{product}", "{category}", "{price}"],
    content: "<h1>{product}</h1>\n<p>Shop {product} in {category}. Starting at {price}.</p>",
    usedIn: 0,
  },
];

export default function TemplatesPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const detectedVars = content.match(/\{[^}]+\}/g) || [];

  const handleCreate = () => {
    toast({ title: "Template created", description: `"${name}" has been saved.` });
    setOpen(false);
    setName("");
    setContent("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display">Templates</h1>
          <p className="text-muted-foreground mt-1">Define reusable page layouts with dynamic variables.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="transition-all duration-150 hover:brightness-110 active:scale-[0.97]">
              <Plus className="mr-2 h-4 w-4" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="tpl-name">Template Name</Label>
                <Input id="tpl-name" placeholder="e.g., Course Landing" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tpl-content">Template Content</Label>
                <p className="text-xs text-muted-foreground mb-1">Use &#123;variable&#125; syntax for dynamic fields.</p>
                <Textarea
                  id="tpl-content"
                  placeholder={"<h1>{course} in {city}</h1>\n<p>Learn {course} in {city}...</p>"}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
              {detectedVars.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Detected variables:</span>
                  {[...new Set(detectedVars)].map((v) => (
                    <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!name || !content}>Create Template</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockTemplates.map((tpl) => (
          <Card key={tpl.id} className="shadow-surface hover:shadow-surface-hover transition-shadow duration-150">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{tpl.name}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tpl.variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                ))}
              </div>
              <pre className="mt-3 p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto leading-relaxed">
                {tpl.content}
              </pre>
              <p className="mt-3 text-xs text-muted-foreground">
                Used in {tpl.usedIn} campaign{tpl.usedIn !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
