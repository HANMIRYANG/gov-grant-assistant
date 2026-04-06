"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CompanyProfile, ProductLine } from "@/lib/utils/types";
import { PRODUCT_LINE_LABELS } from "@/lib/utils/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface ProfileForm {
  product_name: string;
  product_line: ProductLine;
  description: string;
  keywords: string[];
  specs: Record<string, string>;
  target_agencies: string[];
  is_active: boolean;
}

const emptyForm: ProfileForm = {
  product_name: "",
  product_line: "fire_safety",
  description: "",
  keywords: [],
  specs: {},
  target_agencies: [],
  is_active: true,
};

export default function KeywordsPage() {
  const [profiles, setProfiles] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [keywordInput, setKeywordInput] = useState("");
  const [agencyInput, setAgencyInput] = useState("");
  const [specKey, setSpecKey] = useState("");
  const [specValue, setSpecValue] = useState("");

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("company_profiles")
      .select("*")
      .order("product_line")
      .order("product_name");
    setProfiles((data as CompanyProfile[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(profile: CompanyProfile) {
    setEditingId(profile.id);
    setForm({
      product_name: profile.product_name,
      product_line: profile.product_line,
      description: profile.description || "",
      keywords: [...profile.keywords],
      specs: { ...profile.specs },
      target_agencies: [...profile.target_agencies],
      is_active: profile.is_active,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    const payload = {
      ...form,
      description: form.description || null,
    };

    const url = editingId
      ? `/api/company-profiles/${editingId}`
      : "/api/company-profiles";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      toast.success(editingId ? "\uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4." : "\uCD94\uAC00\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      setDialogOpen(false);
      loadProfiles();
    } else {
      const err = await res.json();
      toast.error(err.error || "\uC800\uC7A5 \uC2E4\uD328");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("\uC815\uB9D0 \uC0AD\uC81C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?")) return;

    const res = await fetch(`/api/company-profiles/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("\uC0AD\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
      loadProfiles();
    }
  }

  function addKeyword() {
    const kw = keywordInput.trim();
    if (kw && !form.keywords.includes(kw)) {
      setForm({ ...form, keywords: [...form.keywords, kw] });
    }
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setForm({ ...form, keywords: form.keywords.filter((k) => k !== kw) });
  }

  function addAgency() {
    const ag = agencyInput.trim();
    if (ag && !form.target_agencies.includes(ag)) {
      setForm({ ...form, target_agencies: [...form.target_agencies, ag] });
    }
    setAgencyInput("");
  }

  function removeAgency(ag: string) {
    setForm({
      ...form,
      target_agencies: form.target_agencies.filter((a) => a !== ag),
    });
  }

  function addSpec() {
    if (specKey.trim() && specValue.trim()) {
      setForm({
        ...form,
        specs: { ...form.specs, [specKey.trim()]: specValue.trim() },
      });
      setSpecKey("");
      setSpecValue("");
    }
  }

  function removeSpec(key: string) {
    const newSpecs = { ...form.specs };
    delete newSpecs[key];
    setForm({ ...form, specs: newSpecs });
  }

  // \uC81C\uD488 \uB77C\uC778\uBCC4 \uADF8\uB8F9\uD551
  const grouped = profiles.reduce(
    (acc, p) => {
      if (!acc[p.product_line]) acc[p.product_line] = [];
      acc[p.product_line].push(p);
      return acc;
    },
    {} as Record<ProductLine, CompanyProfile[]>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{"\uB9E4\uCE6D \uD0A4\uC6CC\uB4DC \uAD00\uB9AC"}</h1>
          <p className="text-muted-foreground">
            {"\uD55C\uBBF8\uB974 \uC81C\uD488\uBCC4 \uAE30\uC220 \uD504\uB85C\uD544 \uBC0F \uB9E4\uCE6D \uD0A4\uC6CC\uB4DC \uC124\uC815"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {"\uC81C\uD488 \uCD94\uAC00"}
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{"\uBD88\uB7EC\uC624\uB294 \uC911..."}</div>
      ) : (
        Object.entries(grouped).map(([line, items]) => (
          <div key={line} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {PRODUCT_LINE_LABELS[line as ProductLine]}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((profile) => (
                <Card key={profile.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {profile.product_name}
                        </CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">
                          {profile.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(profile)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(profile.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1">
                      {profile.keywords.slice(0, 8).map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                      {profile.keywords.length > 8 && (
                        <Badge variant="outline" className="text-xs">
                          +{profile.keywords.length - 8}
                        </Badge>
                      )}
                    </div>
                    {!profile.is_active && (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        {"\uBE44\uD65C\uC131"}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* \uCD94\uAC00/\uC218\uC815 \uB2E4\uC774\uC5BC\uB85C\uADF8 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "\uC81C\uD488 \uD504\uB85C\uD544 \uC218\uC815" : "\uC2E0\uADDC \uC81C\uD488 \uD504\uB85C\uD544"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* \uC81C\uD488\uBA85 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{"\uC81C\uD488\uBA85"}</Label>
                <Input
                  value={form.product_name}
                  onChange={(e) =>
                    setForm({ ...form, product_name: e.target.value })
                  }
                  placeholder={"HC Series \uBD88\uC5F0 \uCF54\uD305\uC81C"}
                />
              </div>
              <div className="space-y-2">
                <Label>{"\uC81C\uD488 \uB77C\uC778"}</Label>
                <Select
                  value={form.product_line}
                  onValueChange={(v) =>
                    setForm({ ...form, product_line: v as ProductLine })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRODUCT_LINE_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* \uC124\uBA85 */}
            <div className="space-y-2">
              <Label>{"\uC124\uBA85"}</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* \uD0A4\uC6CC\uB4DC */}
            <div className="space-y-2">
              <Label>{"\uB9E4\uCE6D \uD0A4\uC6CC\uB4DC"}</Label>
              <div className="flex gap-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder={"\uD0A4\uC6CC\uB4DC \uC785\uB825 \uD6C4 Enter"}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                />
                <Button type="button" variant="outline" onClick={addKeyword}>
                  {"\uCD94\uAC00"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.keywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="cursor-pointer gap-1 pr-1"
                    onClick={() => removeKeyword(kw)}
                  >
                    {kw}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* \uAD00\uC2EC \uAE30\uAD00 */}
            <div className="space-y-2">
              <Label>{"\uAD00\uC2EC \uC8FC\uAD00\uAE30\uAD00"}</Label>
              <div className="flex gap-2">
                <Input
                  value={agencyInput}
                  onChange={(e) => setAgencyInput(e.target.value)}
                  placeholder={"\uAE30\uAD00\uBA85 \uC785\uB825"}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addAgency())
                  }
                />
                <Button type="button" variant="outline" onClick={addAgency}>
                  {"\uCD94\uAC00"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.target_agencies.map((ag) => (
                  <Badge
                    key={ag}
                    variant="outline"
                    className="cursor-pointer gap-1 pr-1"
                    onClick={() => removeAgency(ag)}
                  >
                    {ag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            </div>

            {/* \uC2A4\uD399 */}
            <div className="space-y-2">
              <Label>{"\uD575\uC2EC \uC2A4\uD399"}</Label>
              <div className="flex gap-2">
                <Input
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  placeholder={"\uD56D\uBAA9 (\uC608: \uB0B4\uC5F4\uC628\uB3C4)"}
                  className="flex-1"
                />
                <Input
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  placeholder={"\uAC12 (\uC608: 1300\u2103)"}
                  className="flex-1"
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addSpec())
                  }
                />
                <Button type="button" variant="outline" onClick={addSpec}>
                  {"\uCD94\uAC00"}
                </Button>
              </div>
              <div className="space-y-1">
                {Object.entries(form.specs).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="font-medium">{k}:</span>
                    <span>{v}</span>
                    <button
                      className="ml-auto text-destructive hover:underline"
                      onClick={() => removeSpec(k)}
                    >
                      {"\uC0AD\uC81C"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {"\uCDE8\uC18C"}
              </Button>
              <Button onClick={handleSave}>{"\uC800\uC7A5"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
